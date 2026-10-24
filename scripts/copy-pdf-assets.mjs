// Copies pdf.js character maps (needed to read Chinese/Japanese/Korean text in PDFs)
// from node_modules into public/, so the browser can load them from our own site.
// Runs automatically before `npm run dev` and `npm run build` (see package.json).
import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'pdfjs-dist', 'cmaps');
const to = join(root, 'public', 'pdfjs', 'cmaps');

if (!existsSync(from)) {
  console.warn('[copy-pdf-assets] pdfjs-dist/cmaps not found, skipping');
} else {
  cpSync(from, to, { recursive: true });
  console.log('[copy-pdf-assets] copied pdf.js cmaps to public/pdfjs/cmaps');
}
