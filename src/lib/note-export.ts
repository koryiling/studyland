// Export a saved AI note as Word (.docx) or PDF (via the browser's print dialog).
// Both read the same Markdown the notes screen shows, so what you see is what you get.
import { Marked, type Token, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import type { StudyNote } from '@/types/studybub';

const markdown = new Marked({ gfm: true, breaks: false });

const LANGUAGE_NAMES: Record<StudyNote['language'], string> = {
  zh: '简体中文',
  en: 'English',
  ms: 'Bahasa Melayu',
  'zh-en': '中英双语',
};

export function noteTitle(note: StudyNote): string {
  const base = note.fileName.replace(/\.[^.]+$/, '');
  return `${base} · AI Notes (${LANGUAGE_NAMES[note.language]} · ${note.detail === 'detailed' ? 'Detailed' : 'Simple'})`;
}

function fileBaseName(note: StudyNote): string {
  const base = note.fileName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'notes';
  return `${base}-notes-${note.language}-${note.detail}`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// ---------- Word (.docx) ----------

export async function exportNoteAsWord(note: StudyNote): Promise<void> {
  const docx = await import('docx'); // loaded only when someone exports
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType,
  } = docx;

  type Run = InstanceType<typeof TextRun>;
  type Block = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  interface RunStyle { bold?: boolean; italics?: boolean; code?: boolean; strike?: boolean }

  const inlineRuns = (tokens: Token[] | undefined, style: RunStyle = {}): Run[] =>
    (tokens || []).flatMap((t): Run[] => {
      switch (t.type) {
        case 'strong':
          return inlineRuns((t as Tokens.Strong).tokens, { ...style, bold: true });
        case 'em':
          return inlineRuns((t as Tokens.Em).tokens, { ...style, italics: true });
        case 'del':
          return inlineRuns((t as Tokens.Del).tokens, { ...style, strike: true });
        case 'link':
          return inlineRuns((t as Tokens.Link).tokens, style);
        case 'codespan':
          return [new TextRun({ text: decodeEntities((t as Tokens.Codespan).text), font: 'Consolas', bold: style.bold })];
        case 'br':
          return [new TextRun({ text: '', break: 1 })];
        case 'html':
          return [];
        case 'text': {
          const tt = t as Tokens.Text;
          if (tt.tokens?.length) return inlineRuns(tt.tokens, style);
          return [new TextRun({ text: decodeEntities(tt.text), bold: style.bold, italics: style.italics, strike: style.strike })];
        }
        default: {
          const text = 'text' in t && typeof t.text === 'string' ? t.text : '';
          return text ? [new TextRun({ text: decodeEntities(text), bold: style.bold, italics: style.italics })] : [];
        }
      }
    });

  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
  const quoteStyle = {
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: '8FCBA8', space: 8 } },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F8F4' },
  };

  const blocks = (tokens: Token[], ctx: { level: number; quote: boolean }): Block[] =>
    tokens.flatMap((t): Block[] => {
      const extra = ctx.quote ? quoteStyle : {};
      switch (t.type) {
        case 'heading': {
          const h = t as Tokens.Heading;
          return [new Paragraph({ heading: HEADINGS[Math.min(h.depth, 4) - 1], children: inlineRuns(h.tokens) })];
        }
        case 'paragraph':
          return [new Paragraph({ ...extra, spacing: { after: 120 }, children: inlineRuns((t as Tokens.Paragraph).tokens) })];
        case 'text':
          return [new Paragraph({ ...extra, children: inlineRuns((t as Tokens.Text).tokens || [t]) })];
        case 'list': {
          const list = t as Tokens.List;
          const start = typeof list.start === 'number' ? list.start : 1;
          return list.items.flatMap((item, i) => {
            const [first, ...rest] = item.tokens;
            const firstRuns = first && (first.type === 'text' || first.type === 'paragraph')
              ? inlineRuns((first as Tokens.Text).tokens || [first])
              : [];
            const prefix = list.ordered ? [new TextRun({ text: `${start + i}. ` })] : [];
            const head = new Paragraph({
              ...extra,
              ...(list.ordered ? { indent: { left: 360 * (ctx.level + 1) } } : { bullet: { level: Math.min(ctx.level, 8) } }),
              children: [...prefix, ...firstRuns],
            });
            const restTokens = firstRuns.length ? rest : item.tokens;
            return [head, ...blocks(restTokens, { ...ctx, level: ctx.level + 1 })];
          });
        }
        case 'blockquote':
          return blocks((t as Tokens.Blockquote).tokens, { ...ctx, quote: true });
        case 'table': {
          const table = t as Tokens.Table;
          const cell = (c: Tokens.TableCell, header: boolean) =>
            new TableCell({
              shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EBF5F0' } : undefined,
              children: [new Paragraph({ children: inlineRuns(c.tokens, { bold: header }) })],
            });
          return [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ tableHeader: true, children: table.header.map((c) => cell(c, true)) }),
                ...table.rows.map((row) => new TableRow({ children: row.map((c) => cell(c, false)) })),
              ],
            }),
            new Paragraph({ children: [] }),
          ];
        }
        case 'code':
          return (t as Tokens.Code).text.split('\n').map(
            (line) => new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas' })] })
          );
        case 'hr':
          return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2EFE7', space: 1 } }, children: [] })];
        default:
          return [];
      }
    });

  const doc = new Document({
    creator: 'Studyland',
    title: noteTitle(note),
    styles: {
      default: {
        document: {
          run: { size: 22, font: { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: 'Microsoft YaHei', cs: 'Calibri' } },
        },
        heading1: { run: { size: 32, bold: true, color: '1C2B22' } },
        heading2: { run: { size: 28, bold: true, color: '2F8F5B' }, paragraph: { spacing: { before: 280, after: 120 } } },
        heading3: { run: { size: 24, bold: true, color: '1C2B22' }, paragraph: { spacing: { before: 200, after: 80 } } },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: noteTitle(note), bold: true, size: 36, color: '2F8F5B' })] }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: `${note.subject} · Studyland`, color: '8A9E92', size: 18 })],
          }),
          ...blocks(markdown.lexer(note.content), { level: 0, quote: false }),
        ],
      },
    ],
  });

  downloadBlob(await Packer.toBlob(doc), `${fileBaseName(note)}.docx`);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---------- PDF (print dialog → "Save as PDF") ----------

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif; color: #1C2B22; font-size: 11pt; line-height: 1.6; margin: 0 auto; max-width: 760px; padding: 16px; }
  .title { font-size: 18pt; font-weight: 800; color: #2F8F5B; margin: 0; }
  .meta { color: #8A9E92; font-size: 9pt; margin: 2px 0 18px; }
  h1 { font-size: 16pt; } h2 { font-size: 14pt; color: #2F8F5B; border-bottom: 1px solid #E2EFE7; padding-bottom: 3px; margin-top: 22px; }
  h3 { font-size: 12pt; margin-top: 16px; }
  h1, h2, h3 { break-after: avoid; }
  blockquote { margin: 10px 0; padding: 8px 12px; background: #F1F8F4; border-left: 4px solid #8FCBA8; border-radius: 6px; break-inside: avoid; }
  blockquote p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; break-inside: avoid; }
  th, td { border: 1px solid #DCE9E1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #EBF5F0; }
  code { background: #F4F9F5; padding: 1px 4px; border-radius: 3px; }
  pre { background: #F4F9F5; padding: 8px; border-radius: 6px; white-space: pre-wrap; }
  .hint { background: #FFF8EC; border: 1px solid #F6E3BF; color: #7A5A1E; padding: 8px 12px; border-radius: 8px; font-size: 10pt; margin-bottom: 14px; }
  @media print { .hint { display: none; } body { padding: 0; } }
`;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Returns false when the browser blocked the new window.
export function exportNoteAsPdf(note: StudyNote): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const body = DOMPurify.sanitize(markdown.parse(note.content || '', { async: false }), { FORBID_TAGS: ['img', 'style'] });
  const title = escapeHtml(noteTitle(note));
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fileBaseName(note))}</title><style>${PRINT_CSS}</style></head><body>
<div class="hint">在打印窗口里把「目标打印机」选成 <b>另存为 PDF / Save as PDF</b>，就可以保存成 PDF 文件。</div>
<p class="title">${title}</p><p class="meta">${escapeHtml(note.subject)} · Studyland</p>
${body}
</body></html>`);
  win.document.close();
  win.focus();
  // Give the new page a moment to lay out fonts before opening the print dialog
  setTimeout(() => win.print(), 400);
  return true;
}
