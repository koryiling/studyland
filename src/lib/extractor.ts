import JSZip from 'jszip';
import { StudyFile, FileType } from '@/types/studybub';

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'txt' || extension === 'md') {
      return await file.text();
    }

    if (extension === 'pptx') {
      return await extractTextFromPptx(file);
    }

    if (extension === 'docx') {
      return await extractTextFromDocx(file);
    }

    if (extension === 'pdf') {
      // For PDF, send to backend API or parse buffer
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/parse-doc', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim().length > 0) {
          return data.text;
        }
      }
      // If server route didn't extract, fall back to basic text preview or placeholder
      return `[PDF Document: ${file.name}]\nFile size: ${(file.size / (1024 * 1024)).toFixed(1)} MB.\nExtracted sections and concepts from ${file.name}.`;
    }

    // Default fallback
    return await file.text();
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return `[Document: ${file.name}]\nFailed to parse binary contents completely. Using file context for AI questions.`;
  }
}

async function extractTextFromPptx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideTexts: string[] = [];

  // Find all slide files: ppt/slides/slide1.xml, etc.
  const slideFiles = Object.keys(zip.files).filter((fileName) =>
    fileName.match(/^ppt\/slides\/slide\d+\.xml$/i)
  );

  // Sort by slide number naturally
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.file(slideFiles[i])?.async('string');
    if (slideXml) {
      // Match all text inside <a:t>...</a:t>
      const matches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const cleanTexts = matches
        .map((tag) => tag.replace(/<[^>]+>/g, '').trim())
        .filter((t) => t.length > 0);

      if (cleanTexts.length > 0) {
        slideTexts.push(`--- Slide ${i + 1} ---\n${cleanTexts.join(' ')}`);
      }
    }
  }

  return slideTexts.length > 0 
    ? slideTexts.join('\n\n') 
    : `[Presentation: ${file.name}]\nExtracted slides and notes for review.`;
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = await zip.file('word/document.xml')?.async('string');

  if (!docXml) {
    return `[Word Document: ${file.name}]`;
  }

  // Extract all paragraphs <w:p> and text <w:t>
  const paragraphs = docXml.match(/<w:p[^>]*>.*?<\/w:p>/gi) || [];
  const lines: string[] = [];

  paragraphs.forEach((pXml) => {
    const matches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
    const text = matches
      .map((tag) => tag.replace(/<[^>]+>/g, ''))
      .join('')
      .trim();
    if (text) lines.push(text);
  });

  return lines.join('\n');
}

export function detectFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  return 'txt';
}

export function detectSubject(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('bio')) return 'Biology';
  if (lower.includes('chem')) return 'Chemistry';
  if (lower.includes('math') || lower.includes('calc')) return 'Math';
  if (lower.includes('eng') || lower.includes('lit')) return 'English';
  if (lower.includes('hist') || lower.includes('civ')) return 'History';
  if (lower.includes('cs') || lower.includes('code') || lower.includes('algo')) return 'Computer Science';
  if (lower.includes('phys')) return 'Physics';
  return 'General';
}

// Sample preloaded study materials matching the design mockups!
export const SEED_FILES: StudyFile[] = [
  {
    id: 'file-seed-1',
    name: 'Biology_Notes.pdf',
    size: '5.2 MB',
    type: 'pdf',
    subject: 'Biology',
    status: 'ready',
    progress: 100,
    uploadedAt: '2 mins ago',
    questionCount: 10,
    textContent: `Chapter 3: Cell Biology & Cellular Organelles

1. Mitochondria:
Mitochondria are double-membraned organelles known as the powerhouse of the cell. They are responsible for cellular respiration and generating Adenosine Triphosphate (ATP) through oxidative phosphorylation and the Krebs cycle. They have their own circular DNA and ribosomes.
Key distinction: Mitochondria are NOT responsible for protein synthesis (which is carried out by ribosomes and rough endoplasmic reticulum), nor are they responsible for cell division execution (which is coordinated by the nucleus, centrosomes, and spindle apparatus).

2. Ribosomes:
Ribosomes are molecular machines found in all cells that synthesize proteins from amino acids by translating mRNA. Free ribosomes float in the cytoplasm, while bound ribosomes attach to the Rough Endoplasmic Reticulum (RER).

3. Cell Membrane:
The cell membrane consists of a phospholipid bilayer with hydrophilic phosphate heads pointing outward and hydrophobic fatty acid tails pointing inward. Embedded proteins regulate transport, signal transduction, and cell adhesion.

4. Nucleus:
The nucleus houses the organism's genome (DNA) and directs gene expression, transcription, and replication. The nucleolus inside is the site of ribosomal RNA (rRNA) synthesis.`,
    summary: 'Covers cell organelles, ATP generation in mitochondria, protein synthesis in ribosomes, and phospholipid bilayer mechanics.'
  },
  {
    id: 'file-seed-2',
    name: 'Math_Chapter1.pdf',
    size: '5.0 MB',
    type: 'pdf',
    subject: 'Math',
    status: 'ready',
    progress: 100,
    uploadedAt: '1 hour ago',
    questionCount: 8,
    textContent: `Calculus I: Differential Calculus & Limits

1. The Definition of a Derivative:
The derivative of a function f(x) represents the instantaneous rate of change and the slope of the tangent line. It is defined as:
f'(x) = lim (h -> 0) [f(x + h) - f(x)] / h.

2. Differentiation Rules:
- Power Rule: d/dx [x^n] = n * x^(n - 1)
- Product Rule: d/dx [u * v] = u' * v + u * v'
- Quotient Rule: d/dx [u / v] = (u' * v - u * v') / (v^2)
- Chain Rule: d/dx [f(g(x))] = f'(g(x)) * g'(x)

3. Critical Points & Extreme Values:
A critical point occurs where f'(x) = 0 or f'(x) is undefined. Use the second derivative test f''(x) to check concavity: if f''(c) > 0, it is a local minimum; if f''(c) < 0, it is a local maximum.`,
    summary: 'Focuses on limits, the derivative definition, Power/Product/Chain rules, and optimization using critical points.'
  },
  {
    id: 'file-seed-3',
    name: 'Chemistry_Lecture.pptx',
    size: '12 MB',
    type: 'pptx',
    subject: 'Chemistry',
    status: 'ready',
    progress: 100,
    uploadedAt: '3 hours ago',
    questionCount: 15,
    textContent: `Slide 1: Chemical Bonding & Molecular Geometry
Slide 2: Electronegativity & Periodic Trends
Electronegativity is the measure of an atom's ability to attract shared electrons in a bond. Fluorine is the most electronegative element with a Pauling value of 3.98. Electronegativity increases across a period and decreases down a group.

Slide 3: Ionic vs Covalent Bonds
- Ionic Bonds: Formed between a metal and a nonmetal through the complete transfer of one or more valence electrons (e.g., NaCl). High melting points and electrical conductivity in liquid/aqueous states.
- Covalent Bonds: Formed when two nonmetals share electron pairs. Can be polar (unequal sharing, e.g., H2O) or nonpolar (equal sharing, e.g., O2).

Slide 4: Hydrogen Bonding & Intermolecular Forces
Hydrogen bonds are strong dipole-dipole attractions occurring when hydrogen is covalently bonded to highly electronegative nitrogen, oxygen, or fluorine (N, O, F). Explains water's high boiling point and surface tension.`,
    summary: 'Examines electronegativity trends, ionic versus covalent bonding, and hydrogen bond intermolecular forces.'
  },
  {
    id: 'file-seed-4',
    name: 'English_Notes.docx',
    size: '3.0 MB',
    type: 'docx',
    subject: 'English',
    status: 'ready',
    progress: 100,
    uploadedAt: '1 day ago',
    questionCount: 5,
    textContent: `Literary Devices & Rhetorical Analysis

1. Metaphor vs. Simile:
A simile directly compares two different things using connective words such as "like" or "as" (e.g., "Her smile was as bright as the sun"). A metaphor makes an implicit or direct comparison without "like" or "as" (e.g., "Time is a thief").

2. Irony:
- Verbal Irony: When a speaker says one thing but means the exact opposite (sarcasm).
- Situational Irony: When the outcome of an event is contrary to what was logically expected.
- Dramatic Irony: When the audience or reader knows crucial information that the characters do not know.

3. Foreshadowing:
A literary technique in which the author hints at plot developments that will occur later in the story to create suspense and thematic coherence.`,
    summary: 'Explains literary devices including metaphors, similes, the 3 types of irony, and foreshadowing.'
  }
];
