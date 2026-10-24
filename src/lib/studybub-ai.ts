// Client-side wrapper for /api/studybub-ai. Attaches the student's AI settings
// and turns failures into AIRequestError with a message that can be shown directly.

import type { AIProvider, AISettings, NoteDetail, NoteLanguage, PastYearAnalysis, QuizConfig, QuizQuestion } from '@/types/studybub';
import { loadAISettings, DEFAULT_MODELS } from '@/lib/ai-settings';
import { groupIntoSections, selectExcerpt } from '@/lib/doc-text';

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

function clientConfig(settings: AISettings) {
  if (settings.provider === 'server') return { provider: 'server' as const };
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ai: clientConfig(settings || loadAISettings()), ...payload }),
    });
  } catch {
    throw new AIRequestError('好像连不上网络，请检查一下网络再试试。', 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AIRequestError(data.error || "出了点小状况，请稍后再试一次。", data.code || 'PROVIDER_ERROR');
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
    throw failed?.reason instanceof AIRequestError ? failed.reason : new AIRequestError('这次没能出题，请再试一次。', 'PROVIDER_ERROR');
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
