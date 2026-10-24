// Client-side wrapper for /api/studybub-ai. Attaches the student's AI settings
// and turns failures into AIRequestError with a message that can be shown directly.

import type { AIProvider, AISettings, NoteDetail, NoteLanguage, PastYearAnalysis, QuizConfig, QuizQuestion } from '@/types/studybub';
import { loadAISettings, DEFAULT_MODELS } from '@/lib/ai-settings';
import { groupIntoSections, selectExcerpt } from '@/lib/doc-text';
import { currentLang } from '@/lib/i18n-store';
import { translate } from '@/i18n';

// Keep every request well under Vercel's 4.5 MB body limit
const CONTEXT_CHARS = 40_000;
const NOTE_SECTION_CHARS = 30_000;
const NOTE_MAX_SECTIONS = 20; // ~600k characters, roughly 300 pages
const NOTE_PARALLEL = 3; // sections read at the same time
const QUIZ_PART_SIZE = 5; // bigger quizzes are written in parallel parts of this size

export class AIRequestError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// When the server says its backup model answered (the main one is overloaded),
// ask for the backup directly for a while instead of waiting on the main model again.
const BACKUP_MEMORY_MS = 5 * 60_000;
let preferBackupUntil = 0;

function clientConfig(settings: AISettings) {
  if (settings.provider === 'server') {
    return Date.now() < preferBackupUntil ? { provider: 'server' as const, preferBackup: true } : { provider: 'server' as const };
  }
  return {
    provider: settings.provider,
    apiKey: settings.apiKeys[settings.provider],
    model: settings.models[settings.provider] || DEFAULT_MODELS[settings.provider],
  };
}

async function callAI<T>(action: string, payload: Record<string, unknown> = {}, settings?: AISettings): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/studybub-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-studyland-lang': currentLang() },
      body: JSON.stringify({ action, ai: clientConfig(settings || loadAISettings()), ...payload }),
    });
  } catch {
    throw new AIRequestError(translate(currentLang(), 'srv.network'), 'NETWORK');
  }
  if (res.headers.get('x-studyland-ai-backup') === '1') preferBackupUntil = Date.now() + BACKUP_MEMORY_MS;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AIRequestError(data.error || translate(currentLang(), 'srv.unknown'), data.code || 'PROVIDER_ERROR');
  }
  return data as T;
}

// Groq's free tier allows ~8K tokens per minute: send shorter excerpts, one request at a time
interface Budget {
  contextChars: number;
  noteSectionChars: number;
  noteParallel: number;
  quizPartSize: number;
}
function budgetFor(settings: AISettings): Budget {
  if (settings.provider === 'groq') return { contextChars: 10_000, noteSectionChars: 10_000, noteParallel: 1, quizPartSize: 30 };
  return { contextChars: CONTEXT_CHARS, noteSectionChars: NOTE_SECTION_CHARS, noteParallel: NOTE_PARALLEL, quizPartSize: QUIZ_PART_SIZE };
}

// Use the provider picked for this one generation, keeping the student's keys and models
function settingsFor(provider?: AIProvider): AISettings {
  const settings = loadAISettings();
  return provider ? { ...settings, provider } : settings;
}

export async function getServerAIStatus(): Promise<{ serverKeyConfigured: boolean }> {
  return callAI('status');
}

export async function testAIConnection(settings: AISettings): Promise<void> {
  await callAI('test-connection', {}, settings);
}

// Questions are written in parts of up to 5 at the same time, so 20 questions take
// about as long as 5. If some parts fail, the questions from the others are still used.
export async function generateQuizFromMaterial(
  config: QuizConfig,
  documentText: string,
  provider?: AIProvider
): Promise<{ questions: QuizQuestion[]; truncated: boolean }> {
  const settings = settingsFor(provider);
  const budget = budgetFor(settings);
  const excerpt = selectExcerpt(documentText, budget.contextChars);
  const total = Math.max(1, Math.ceil(config.questionCount / budget.quizPartSize));
  const results = await Promise.allSettled(
    Array.from({ length: total }, (_, index) => {
      const count = Math.min(budget.quizPartSize, config.questionCount - index * budget.quizPartSize);
      return callAI<{ questions: QuizQuestion[] }>(
        'generate-quiz',
        { config: { ...config, questionCount: count }, documentText: excerpt.text, part: { index, total } },
        settings
      );
    })
  );
  const seen = new Set<string>();
  const questions = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value.questions : []))
    .filter((q) => {
      const key = q.question.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (questions.length === 0) {
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw failed?.reason instanceof AIRequestError ? failed.reason : new AIRequestError(translate(currentLang(), 'quiz.failed'), 'PROVIDER_ERROR');
  }

  // Parts written at the same time can overlap on short material: ask once more for the missing ones
  const missing = config.questionCount - questions.length;
  if (missing > 0) {
    try {
      const extra = await callAI<{ questions: QuizQuestion[] }>(
        'generate-quiz',
        {
          config: { ...config, questionCount: missing, avoidQuestions: questions.map((q) => q.question) },
          documentText: excerpt.text,
          part: { index: 0, total: 1 },
        },
        settings
      );
      for (const q of extra.questions) {
        const key = q.question.trim().toLowerCase();
        if (!seen.has(key) && questions.length < config.questionCount) {
          seen.add(key);
          questions.push(q);
        }
      }
    } catch {
      // Keep the questions we already have rather than failing the whole quiz
    }
  }
  return { questions, truncated: excerpt.truncated };
}

export async function evaluateShortAnswer(
  question: QuizQuestion,
  userAnswer: string
): Promise<{ scorePct: number; isCorrect: boolean; feedback: string; howToImprove: string }> {
  const data = await callAI<{
    evaluation: { scorePct: number; isCorrect: boolean; feedback: string; howToImprove: string };
  }>('grade-answer', { question, userAnswer });
  return data.evaluation;
}

export async function analyzePastYearPaper(
  documentText: string,
  fileName: string,
  subject: string,
  provider?: AIProvider
): Promise<PastYearAnalysis> {
  const settings = settingsFor(provider);
  const data = await callAI<{ analysis: PastYearAnalysis }>('analyze-past-year', {
    documentText: selectExcerpt(documentText, budgetFor(settings).contextChars).text,
    fileName,
    subject,
  }, settings);
  return data.analysis;
}

// Several past year papers of one subject in one text: each gets an equal share of the
// space, marked "=== Paper N: name ===" so the AI can compare them.
export function combinePapers(papers: Array<{ name: string; text: string }>, totalChars: number): string {
  const share = Math.floor(totalChars / Math.max(1, papers.length)) - 80;
  return papers.map((p, i) => `=== Paper ${i + 1}: ${p.name} ===\n${selectExcerpt(p.text, share).text}`).join('\n\n');
}

export async function analyzeSubjectPapers(
  papers: Array<{ name: string; text: string }>,
  subject: string,
  provider?: AIProvider
): Promise<PastYearAnalysis> {
  const settings = settingsFor(provider);
  const data = await callAI<{ analysis: PastYearAnalysis }>('analyze-past-year', {
    documentText: combinePapers(papers, budgetFor(settings).contextChars),
    fileName: `${subject} · ${papers.length} past year papers`,
    subject,
    paperCount: papers.length,
  }, settings);
  return data.analysis;
}

export interface NotesProgress {
  stage: 'reading' | 'merging';
  done: number; // sections finished
  total: number;
  parallel: number; // sections read at the same time
}

// Long documents are read section by section (each a separate, short request),
// then the per-section notes are merged into one set of notes.
export async function generateNotes(opts: {
  documentText: string;
  fileName: string;
  subject: string;
  language: NoteLanguage;
  detail: NoteDetail;
  provider?: AIProvider;
  onProgress?: (p: NotesProgress) => void;
}): Promise<{ content: string; sectionsRead: number; sectionsTotal: number }> {
  const settings = settingsFor(opts.provider);
  const budget = budgetFor(settings);
  const allSections = groupIntoSections(opts.documentText, budget.noteSectionChars);
  const sections = allSections.slice(0, NOTE_MAX_SECTIONS);
  const common = { fileName: opts.fileName, subject: opts.subject, language: opts.language, detail: opts.detail };
  const parallel = Math.min(budget.noteParallel, sections.length);

  // Read up to NOTE_PARALLEL sections at the same time, keeping the results in order
  const partials: string[] = new Array(sections.length);
  let next = 0;
  let done = 0;
  opts.onProgress?.({ stage: 'reading', done, total: sections.length, parallel });
  const worker = async () => {
    while (next < sections.length) {
      const i = next++;
      const data = await callAI<{ markdown: string }>('notes-section', {
        ...common,
        documentText: sections[i],
        sectionIndex: i,
        sectionTotal: sections.length,
      }, settings);
      partials[i] = data.markdown;
      done++;
      opts.onProgress?.({ stage: 'reading', done, total: sections.length, parallel });
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));

  let content = partials[0];
  // Merging sends every part at once, too much for Groq's free tier: keep the parts in order instead
  if (partials.length > 1 && settings.provider === 'groq' && partials.join('').length > budget.noteSectionChars) {
    content = partials.join('\n\n---\n\n');
  } else if (partials.length > 1) {
    opts.onProgress?.({ stage: 'merging', done, total: sections.length, parallel });
    content = (await callAI<{ markdown: string }>('notes-merge', { ...common, sections: partials }, settings)).markdown;
  }
  return { content, sectionsRead: sections.length, sectionsTotal: allSections.length };
}

export interface PlanRequest {
  semesterName: string;
  courses: Array<{ name: string; creditHours: number; passFail: boolean; targetGrade?: string }>;
  events: Array<{ date: string; kind: string; title: string; subject?: string }>;
  startDate: string;
  endDate: string;
  finalStart: string;
  dailyMinutes: number;
}

export async function generateStudyPlan(
  plan: PlanRequest,
  provider?: AIProvider
): Promise<Array<{ date: string; kind: 'study' | 'practice'; subject: string; minutes: number; title: string }>> {
  const data = await callAI<{ tasks: Array<{ date: string; kind: 'study' | 'practice'; subject: string; minutes: number; title: string }> }>(
    'study-plan',
    { plan },
    settingsFor(provider)
  );
  return data.tasks;
}

// Scanned PDF: the AI reads the page images. 2 pages per request (well under the
// 4.5 MB request limit), 3 requests at a time, results kept in page order.
const OCR_PAGES_PER_REQUEST = 2;
const OCR_PARALLEL = 3;

export async function readScannedPages(
  images: Array<{ page: number; data: string }>,
  onProgress?: (pagesDone: number, total: number) => void,
  provider?: AIProvider
): Promise<string> {
  const settings = settingsFor(provider);
  const batches: Array<typeof images> = [];
  for (let i = 0; i < images.length; i += OCR_PAGES_PER_REQUEST) batches.push(images.slice(i, i + OCR_PAGES_PER_REQUEST));
  const texts: string[] = new Array(batches.length);
  let next = 0;
  let pagesDone = 0;
  onProgress?.(0, images.length);
  const worker = async () => {
    while (next < batches.length) {
      const i = next++;
      const data = await callAI<{ text: string }>('ocr-pages', { pages: batches[i] }, settings);
      texts[i] = data.text;
      pagesDone += batches[i].length;
      onProgress?.(pagesDone, images.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(OCR_PARALLEL, batches.length) }, worker));
  return texts.join('\n\n').trim();
}
