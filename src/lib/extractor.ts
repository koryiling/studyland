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
