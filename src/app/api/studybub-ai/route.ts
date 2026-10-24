import { NextRequest, NextResponse } from 'next/server';
import { AIError, isServerKeyConfigured, type ClientAIConfig } from '@/lib/server/llm';
import { getCurrentClaims } from '@/lib/supabase/server';
import {
  analyzePastYearPaper,
  generateQuiz,
  gradeShortAnswer,
  testConnection,
  generateNoteSection,
  mergeNoteSections,
} from '@/lib/server/study-ai';
import type { NoteDetail, NoteLanguage, QuizConfig, QuizQuestion } from '@/types/studybub';

// The client sends excerpts/sections (≤ 40k chars); this is just a safety cap
const MAX_DOCUMENT_CHARS = 200_000;
const NOTE_LANGUAGES: NoteLanguage[] = ['zh', 'en', 'ms', 'zh-en'];
const NOTE_DETAILS: NoteDetail[] = ['simple', 'detailed'];

interface RequestBody {
  action?: string;
  ai?: ClientAIConfig;
  config?: QuizConfig;
  documentText?: string;
  question?: QuizQuestion;
  userAnswer?: string;
  fileName?: string;
  subject?: string;
  language?: NoteLanguage;
  detail?: NoteDetail;
  sectionIndex?: number;
  sectionTotal?: number;
  sections?: string[];
}

function noteOptions(body: RequestBody) {
  if (!body.language || !NOTE_LANGUAGES.includes(body.language)) throw new AIError('BAD_REQUEST', 'Invalid language', 400);
  if (!body.detail || !NOTE_DETAILS.includes(body.detail)) throw new AIError('BAD_REQUEST', 'Invalid detail', 400);
  return {
    fileName: body.fileName || 'Study material',
    subject: body.subject || 'General',
    language: body.language,
    detail: body.detail,
    client: body.ai,
  };
}

function requireText(value: unknown, name: string, max = MAX_DOCUMENT_CHARS): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AIError('BAD_REQUEST', `Missing ${name}`, 400);
  }
  return value.slice(0, max);
}

export async function POST(req: NextRequest) {
  // Only signed-in users may use AI (protects the shared built-in key's free quota)
  if (!(await getCurrentClaims())) {
    return NextResponse.json({ error: '请先登录。', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 });
  }

  try {
    switch (body.action) {
      case 'status':
        return NextResponse.json({ serverKeyConfigured: isServerKeyConfigured() });

      case 'test-connection':
        await testConnection(body.ai);
        return NextResponse.json({ ok: true });

      case 'generate-quiz': {
        if (!body.config) throw new AIError('BAD_REQUEST', 'Missing config', 400);
        const documentText = requireText(body.documentText, 'documentText');
        const result = await generateQuiz(body.config, documentText, body.ai);
        return NextResponse.json(result);
      }

      case 'grade-answer': {
        if (!body.question) throw new AIError('BAD_REQUEST', 'Missing question', 400);
        const userAnswer = requireText(body.userAnswer, 'userAnswer', 5000);
        const evaluation = await gradeShortAnswer(body.question, userAnswer, body.ai);
        return NextResponse.json({ evaluation });
      }

      case 'analyze-past-year': {
        const documentText = requireText(body.documentText, 'documentText');
        const analysis = await analyzePastYearPaper(
          body.fileName || 'Past year paper',
          body.subject || 'General',
          documentText,
          body.ai
        );
        return NextResponse.json({ analysis });
      }

      case 'notes-section': {
        const text = requireText(body.documentText, 'documentText');
        const sectionTotal = Math.max(1, Math.floor(Number(body.sectionTotal) || 1));
        const sectionIndex = Math.min(Math.max(0, Math.floor(Number(body.sectionIndex) || 0)), sectionTotal - 1);
        const markdown = await generateNoteSection({ ...noteOptions(body), text, sectionIndex, sectionTotal });
        return NextResponse.json({ markdown });
      }

      case 'notes-merge': {
        const sections = Array.isArray(body.sections) ? body.sections.filter((s) => typeof s === 'string' && s.trim()) : [];
        if (sections.length === 0) throw new AIError('BAD_REQUEST', 'Missing sections', 400);
        const markdown = await mergeNoteSections({ ...noteOptions(body), sections });
        return NextResponse.json({ markdown });
      }

      default:
        return NextResponse.json({ error: 'Unknown action', code: 'BAD_REQUEST' }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('Studyland AI route error:', err);
    return NextResponse.json({ error: '服务器出错了，请稍后重试。', code: 'PROVIDER_ERROR' }, { status: 500 });
  }
}
