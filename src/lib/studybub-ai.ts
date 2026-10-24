// Client-side wrapper for /api/studybub-ai. Attaches the student's AI settings
// and turns failures into AIRequestError with a message that can be shown directly.

import type { AISettings, NoteDetail, NoteLanguage, PastYearAnalysis, QuizConfig, QuizQuestion } from '@/types/studybub';
import { loadAISettings, DEFAULT_MODELS } from '@/lib/ai-settings';
import { groupIntoSections, selectExcerpt } from '@/lib/doc-text';

// Keep every request well under Vercel's 4.5 MB body limit
const CONTEXT_CHARS = 40_000;
const NOTE_SECTION_CHARS = 30_000;
const NOTE_MAX_SECTIONS = 20; // ~600k characters, roughly 300 pages

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
    throw new AIRequestError('网络连接失败，请检查网络后重试。', 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AIRequestError(data.error || `请求失败（${res.status}）`, data.code || 'PROVIDER_ERROR');
  }
  return data as T;
}

export async function getServerAIStatus(): Promise<{ serverKeyConfigured: boolean }> {
  return callAI('status');
}

export async function testAIConnection(settings: AISettings): Promise<void> {
  await callAI('test-connection', {}, settings);
}

export async function generateQuizFromMaterial(
  config: QuizConfig,
  documentText: string
): Promise<{ questions: QuizQuestion[]; truncated: boolean }> {
  const excerpt = selectExcerpt(documentText, CONTEXT_CHARS);
  const data = await callAI<{ questions: QuizQuestion[] }>('generate-quiz', { config, documentText: excerpt.text });
  return { questions: data.questions, truncated: excerpt.truncated };
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
  subject: string
): Promise<PastYearAnalysis> {
  const data = await callAI<{ analysis: PastYearAnalysis }>('analyze-past-year', {
    documentText: selectExcerpt(documentText, CONTEXT_CHARS).text,
    fileName,
    subject,
  });
  return data.analysis;
}

export interface NotesProgress {
  stage: 'reading' | 'merging';
  current: number; // 1-based section being read
  total: number;
}

// Long documents are read section by section (each a separate, short request),
// then the per-section notes are merged into one set of notes.
export async function generateNotes(opts: {
  documentText: string;
  fileName: string;
  subject: string;
  language: NoteLanguage;
  detail: NoteDetail;
  onProgress?: (p: NotesProgress) => void;
}): Promise<{ content: string; sectionsRead: number; sectionsTotal: number }> {
  const allSections = groupIntoSections(opts.documentText, NOTE_SECTION_CHARS);
  const sections = allSections.slice(0, NOTE_MAX_SECTIONS);
  const common = { fileName: opts.fileName, subject: opts.subject, language: opts.language, detail: opts.detail };

  const partials: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    opts.onProgress?.({ stage: 'reading', current: i + 1, total: sections.length });
    const data = await callAI<{ markdown: string }>('notes-section', {
      ...common,
      documentText: sections[i],
      sectionIndex: i,
      sectionTotal: sections.length,
    });
    partials.push(data.markdown);
  }

  let content = partials[0];
  if (partials.length > 1) {
    opts.onProgress?.({ stage: 'merging', current: sections.length, total: sections.length });
    content = (await callAI<{ markdown: string }>('notes-merge', { ...common, sections: partials })).markdown;
  }
  return { content, sectionsRead: sections.length, sectionsTotal: allSections.length };
}
