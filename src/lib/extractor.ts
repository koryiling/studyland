import JSZip from 'jszip';
import type { FileCategory, FileType } from '@/types/studybub';
import { MIN_USEFUL_CHARS } from '@/lib/doc-text';
import type { MessageKey } from '@/i18n';

export const ACCEPTED_EXTENSIONS = ['pdf', 'pptx', 'docx', 'txt', 'md'];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Errors and warnings carry a message key; the upload screen shows them in the app language
export class ExtractionError extends Error {
  constructor(public key: MessageKey) {
    super(key);
  }
}

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  warning?: MessageKey;
}

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new ExtractionError(extension === 'ppt' || extension === 'doc' ? 'extract.oldFormat' : 'extract.badType');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ExtractionError('extract.tooBig');
  }

  let doc: ExtractedDocument;
  try {
    if (extension === 'pdf') doc = await extractPdf(file);
    else if (extension === 'pptx') doc = await extractPptx(file);
    else if (extension === 'docx') doc = await extractDocx(file);
    else doc = { text: (await file.text()).trim() };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    console.error(`Error extracting text from ${file.name}:`, err);
    throw new ExtractionError('extract.broken');
  }

  if (doc.text.replace(/\[(Page|Slide) \d+\]/g, '').trim().length < MIN_USEFUL_CHARS) {
    doc.warning = extension === 'pdf' ? 'extract.noTextPdf' : 'extract.noText';
  }
  return doc;
}

// PDFs are read in the browser with pdf.js, so large files never have to be uploaded
// (Vercel limits request bodies to 4.5 MB).
let pdfWorker: Worker | null = null;

async function openPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfWorker) {
    pdfWorker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' });
    pdfjs.GlobalWorkerOptions.workerPort = pdfWorker;
  }

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      // Character maps are needed to read Chinese/Japanese/Korean text correctly
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
    }).promise;
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new ExtractionError('extract.password');
    }
    throw new ExtractionError('extract.pdfBroken');
  }
  return doc;
}

async function extractPdf(file: File): Promise<ExtractedDocument> {
  const doc = await openPdf(file);
  try {
    const pages: string[] = [];
    for (let num = 1; num <= doc.numPages; num++) {
      const page = await doc.getPage(num);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str + (item.hasEOL ? '\n' : '');
      }
      text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (text) pages.push(`[Page ${num}]\n${text}`);
      page.cleanup();
    }
    return { text: pages.join('\n\n'), pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

// Text of each <a:p> paragraph in a DrawingML part (slides and speaker notes)
function drawingParagraphs(xml: string): string[] {
  const paragraphs = xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\s[^>]*>[\s\S]*?<\/a:p>/g) || [];
  return paragraphs
    .map((p) =>
      (p.match(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g) || [])
        .map((t) => decodeXml(t.replace(/<[^>]+>/g, '')))
        .join('')
        .trim()
    )
    .filter(Boolean);
}

function slideNumber(path: string): number {
  return parseInt(path.match(/(\d+)\.xml$/)?.[1] || '0', 10);
}

async function extractPptx(file: File): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const sections: string[] = [];
  for (const path of slidePaths) {
    const num = slideNumber(path);
    const slideXml = (await zip.file(path)?.async('string')) || '';
    const lines = drawingParagraphs(slideXml);

    // Speaker notes often hold the explanation behind a slide's bullet points
    const notesXml = await zip.file(`ppt/notesSlides/notesSlide${num}.xml`)?.async('string');
    const notes = notesXml ? drawingParagraphs(notesXml).filter((l) => !/^\d+$/.test(l)) : [];

    if (lines.length || notes.length) {
      sections.push(`[Slide ${num}]\n${lines.join('\n')}${notes.length ? `\nSpeaker notes: ${notes.join(' ')}` : ''}`);
    }
  }
  return { text: sections.join('\n\n'), pageCount: slidePaths.length };
}

async function extractDocx(file: File): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new ExtractionError('extract.noDocxBody');

  const paragraphs = docXml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [];
  const lines = paragraphs
    .map((p) =>
      (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || [])
        .map((t) => (t === '<w:tab/>' ? '\t' : t === '<w:br/>' ? '\n' : decodeXml(t.replace(/<[^>]+>/g, ''))))
        .join('')
        .trim()
    )
    .filter(Boolean);
  return { text: lines.join('\n') };
}

export function detectCategory(fileName: string): FileCategory {
  const lower = fileName.toLowerCase();
  const keywords = ['pastyear', 'past_year', 'past-year', 'past year', 'exam', 'midterm', 'final', '真题', '历年', '试卷', '考题'];
  return keywords.some((k) => lower.includes(k)) ? 'past_year' : 'notes';
}

export function detectFileType(fileName: string): FileType {
  const ext = extensionOf(fileName);
  if (ext === 'pdf' || ext === 'pptx' || ext === 'docx') return ext;
  return 'txt';
}

export function detectSubject(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('bio')) return 'Biology';
  if (lower.includes('chem')) return 'Chemistry';
  if (lower.includes('math') || lower.includes('calc')) return 'Math';
  if (lower.includes('phys')) return 'Physics';
  if (lower.includes('hist')) return 'History';
  if (lower.includes('econ')) return 'Economics';
  if (lower.includes('account')) return 'Accounting';
  if (/\b(cs|programming)\b|code|algo/.test(lower)) return 'Computer Science';
  if (lower.includes('english') || lower.includes('literature')) return 'English';
  return 'General';
}

// A course whose code (e.g. "UCCD3213") or name appears in the file name
export function matchCourse(fileName: string, courses: Array<{ name: string; code?: string }>): string | undefined {
  const upper = fileName.toUpperCase().replace(/[_\-\s]+/g, '');
  const hit = courses.find(
    (c) =>
      (c.code && upper.includes(c.code.toUpperCase().replace(/\s+/g, ''))) ||
      (c.name.length >= 4 && upper.includes(c.name.toUpperCase().replace(/[_\-\s]+/g, '')))
  );
  return hit?.name;
}

export function isScannedPdf(fileName: string, doc: ExtractedDocument): boolean {
  return extensionOf(fileName) === 'pdf' && Boolean(doc.warning);
}

export interface PageImage {
  page: number;
  data: string; // base64 JPEG, without the data: prefix
}

// Scanned PDFs (photos of each page) have no text layer: render each page to a JPEG
// so the AI can read it. Sized to stay sharp for small print but small enough to upload.
export const MAX_SCANNED_PAGES = 30;
const TARGET_WIDTH_PX = 1500;

export async function renderPdfPages(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<{ images: PageImage[]; totalPages: number }> {
  const doc = await openPdf(file);
  const canvas = document.createElement('canvas');
  try {
    const count = Math.min(doc.numPages, MAX_SCANNED_PAGES);
    const images: PageImage[] = [];
    for (let num = 1; num <= count; num++) {
      const page = await doc.getPage(num);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, TARGET_WIDTH_PX / base.width) });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport, background: '#ffffff' }).promise;
      images.push({ page: num, data: canvas.toDataURL('image/jpeg', 0.75).split(',')[1] });
      page.cleanup();
      onProgress?.(num, count);
    }
    return { images, totalPages: doc.numPages };
  } finally {
    canvas.width = canvas.height = 0;
    await doc.destroy();
  }
}

// ---------- Pictures for picture questions ----------
// Diagrams, charts and code screenshots are found in the browser and saved as small JPEGs.
// PDF pages with a real picture (or lots of vector drawing) are rendered whole, so labels
// next to the picture come along; PPTX/DOCX give their embedded pictures.

export const MAX_PICTURES = 8;
const PICTURE_WIDTH_PX = 1100;
const MIN_PICTURE_SIDE = 120; // smaller images are icons and bullets
const MIN_DRAWING_PATHS = 40; // flowcharts and charts are drawn with many paths
const MAX_PDF_PAGES_SCANNED = 80;

export interface FoundPicture {
  source: string; // "page:3" | "slide:5" | "image:2"
  data: string; // base64 JPEG
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
}

// Something on most pages/slides is part of the template (logo, header), not content
function isTemplate(count: number, total: number): boolean {
  return total >= 3 && count >= 3 && count / total > 0.4;
}

async function findPdfPictures(file: File, max: number): Promise<FoundPicture[]> {
  const pdfjs = await import('pdfjs-dist');
  const { OPS } = pdfjs;
  const doc = await openPdf(file);
  try {
    const count = Math.min(doc.numPages, MAX_PDF_PAGES_SCANNED);
    const pages: Array<{ num: number; sizes: Set<string>; paths: number }> = [];
    const sizeUse = new Map<string, number>();
    for (let num = 1; num <= count; num++) {
      const page = await doc.getPage(num);
      const ops = await page.getOperatorList();
      const sizes = new Set<string>();
      let paths = 0;
      ops.fnArray.forEach((fn, i) => {
        const args = ops.argsArray[i];
        if (fn === OPS.paintImageXObject) {
          // [objId, width, height]
          const w = Number(args?.[1]);
          const h = Number(args?.[2]);
          if (Math.min(w, h) >= MIN_PICTURE_SIDE) sizes.add(`${w}x${h}`);
        } else if (fn === OPS.paintInlineImageXObject) {
          const img = args?.[0] as { width?: number; height?: number } | undefined;
          if (img?.width && img.height && Math.min(img.width, img.height) >= MIN_PICTURE_SIDE) sizes.add(`${img.width}x${img.height}`);
        } else if (fn === OPS.constructPath) {
          paths++;
        }
      });
      sizes.forEach((s) => sizeUse.set(s, (sizeUse.get(s) || 0) + 1));
      pages.push({ num, sizes, paths });
      page.cleanup();
    }

    const candidates = pages.filter(
      (p) => [...p.sizes].some((s) => !isTemplate(sizeUse.get(s) || 0, count)) || p.paths >= MIN_DRAWING_PATHS
    );
    // Spread the chosen pages across the whole document
    const chosen =
      candidates.length <= max
        ? candidates
        : Array.from({ length: max }, (_, i) => candidates[Math.round((i * (candidates.length - 1)) / (max - 1))]);

    const canvas = document.createElement('canvas');
    const found: FoundPicture[] = [];
    try {
      for (const { num } of chosen) {
        const page = await doc.getPage(num);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, PICTURE_WIDTH_PX / base.width) });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport, background: '#ffffff' }).promise;
        found.push({ source: `page:${num}`, data: canvasToBase64(canvas) });
        page.cleanup();
      }
    } finally {
      canvas.width = canvas.height = 0;
    }
    return found;
  } finally {
    await doc.destroy();
  }
}

// Decode an embedded picture with the browser and re-encode it as a small JPEG.
// Formats the browser can't draw (EMF/WMF/TIFF) are skipped.
async function pictureToJpeg(blob: Blob): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return null;
  }
  try {
    if (Math.min(bitmap.width, bitmap.height) < MIN_PICTURE_SIDE) return null;
    const scale = Math.min(1, PICTURE_WIDTH_PX / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvasToBase64(canvas);
    canvas.width = canvas.height = 0;
    return data;
  } finally {
    bitmap.close();
  }
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

// Picture relationships of one XML part: rId -> zip path of the picture
function pictureRels(relsXml: string, baseDir: string): Map<string, string> {
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (!/Type="[^"]*\/image"/.test(tag) || /TargetMode="External"/.test(tag)) continue;
    const id = tag.match(/Id="([^"]+)"/)?.[1];
    const target = tag.match(/Target="([^"]+)"/)?.[1];
    if (!id || !target) continue;
    const parts = (target.startsWith('/') ? target.slice(1) : `${baseDir}/${target}`).split('/');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') resolved.pop();
      else if (part && part !== '.') resolved.push(part);
    }
    rels.set(id, resolved.join('/'));
  }
  return rels;
}

function usedPictures(xml: string, rels: Map<string, string>): string[] {
  return [...xml.matchAll(/r:embed="([^"]+)"/g)].map((m) => rels.get(m[1])).filter((p): p is string => Boolean(p));
}

async function zipPictures(
  zip: JSZip,
  entries: Array<{ source: string; paths: string[] }>, // pictures shown by each slide / in the document
  max: number
): Promise<FoundPicture[]> {
  const use = new Map<string, number>();
  entries.forEach((e) => new Set(e.paths).forEach((p) => use.set(p, (use.get(p) || 0) + 1)));
  const found: FoundPicture[] = [];
  const done = new Set<string>();
  for (const entry of entries) {
    for (const path of entry.paths) {
      if (found.length >= max) return found;
      if (done.has(path) || isTemplate(use.get(path) || 0, entries.length)) continue;
      done.add(path);
      const mime = MIME_BY_EXT[path.split('.').pop()?.toLowerCase() || ''];
      const zipped = zip.file(path);
      if (!mime || !zipped) continue;
      const data = await pictureToJpeg(new Blob([await zipped.async('arraybuffer')], { type: mime }));
      if (data) found.push({ source: entry.source, data });
    }
  }
  return found;
}

async function findPptxPictures(file: File, max: number): Promise<FoundPicture[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  const entries = [];
  for (const path of slidePaths) {
    const num = slideNumber(path);
    const relsXml = (await zip.file(`ppt/slides/_rels/slide${num}.xml.rels`)?.async('string')) || '';
    const slideXml = (await zip.file(path)?.async('string')) || '';
    entries.push({ source: `slide:${num}`, paths: usedPictures(slideXml, pictureRels(relsXml, 'ppt/slides')) });
  }
  return zipPictures(zip, entries, max);
}

async function findDocxPictures(file: File, max: number): Promise<FoundPicture[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const relsXml = (await zip.file('word/_rels/document.xml.rels')?.async('string')) || '';
  const docXml = (await zip.file('word/document.xml')?.async('string')) || '';
  const unique = Array.from(new Set(usedPictures(docXml, pictureRels(relsXml, 'word'))));
  // Each picture is its own entry, numbered in document order
  return zipPictures(zip, unique.map((p, i) => ({ source: `image:${i + 1}`, paths: [p] })), max);
}

// Pictures worth asking about; a failure just means "no pictures" (the text still works)
export async function findPictures(file: File, max = MAX_PICTURES): Promise<FoundPicture[]> {
  const ext = extensionOf(file.name);
  try {
    if (ext === 'pdf') return await findPdfPictures(file, max);
    if (ext === 'pptx') return await findPptxPictures(file, max);
    if (ext === 'docx') return await findDocxPictures(file, max);
  } catch (err) {
    console.warn(`Could not look for pictures in ${file.name}:`, err);
  }
  return [];
}
