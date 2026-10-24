// Helpers for working with extracted document text.

const PIECE_SIZE = 2500;

// Minimum readable text for AI features to be meaningful
export const MIN_USEFUL_CHARS = 200;

// Split text into pieces of at most PIECE_SIZE chars, preferring page/slide and
// paragraph boundaries so each piece keeps its "[Page N]" marker context.
export function splitIntoPieces(text: string): string[] {
  const sections = text.split(/(?=^\[(?:Page|Slide) \d+\])/m);
  const pieces: string[] = [];
  for (const section of sections) {
    if (section.length <= PIECE_SIZE) {
      if (section.trim()) pieces.push(section);
      continue;
    }
    const marker = section.match(/^\[(?:Page|Slide) \d+\]/)?.[0];
    let current = '';
    for (const para of section.split(/\n{2,}|\n(?=\S)/)) {
      if (current && current.length + para.length + 1 > PIECE_SIZE) {
        pieces.push(current);
        current = marker && !para.startsWith(marker) ? `${marker} (cont.)\n` : '';
      }
      current += (current ? '\n' : '') + para.slice(0, PIECE_SIZE);
    }
    if (current.trim()) pieces.push(current);
  }
  return pieces;
}

// Group the document into consecutive sections of at most maxChars, in order,
// so long documents can be read section by section without skipping anything.
export function groupIntoSections(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sections: string[] = [];
  let current = '';
  for (const piece of splitIntoPieces(text)) {
    if (current && current.length + piece.length + 2 > maxChars) {
      sections.push(current);
      current = '';
    }
    current += (current ? '\n\n' : '') + piece;
  }
  if (current.trim()) sections.push(current);
  return sections;
}

// Return the whole text if it fits; otherwise evenly spaced excerpts covering the
// beginning, middle and end of the document (not just the first N characters).
export function selectExcerpt(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const pieces = splitIntoPieces(text);
  const SEPARATOR = '\n\n[...]\n\n';
  const avgLen = pieces.reduce((sum, p) => sum + p.length, 0) / pieces.length + SEPARATOR.length;
  let count = Math.max(1, Math.floor(maxChars / avgLen));
  if (pieces.length <= count) return { text: text.slice(0, maxChars), truncated: true };

  // Evenly spaced pieces; shrink the count if uneven piece sizes overshoot the budget
  for (; count >= 1; count--) {
    const picked: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = count === 1 ? 0 : Math.round((i * (pieces.length - 1)) / (count - 1));
      if (picked[picked.length - 1] !== pieces[idx]) picked.push(pieces[idx]);
    }
    const joined = picked.join(SEPARATOR);
    if (joined.length <= maxChars || count === 1) return { text: joined.slice(0, maxChars), truncated: true };
  }
  return { text: text.slice(0, maxChars), truncated: true };
}
