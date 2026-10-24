import { NextRequest, NextResponse } from 'next/server';
import { AIError, aiRequestInfo, isServerKeyConfigured, type ClientAIConfig } from '@/lib/server/llm';
import { getCurrentClaims } from '@/lib/supabase/server';
import {
  analyzePastYearPaper,
  generateQuiz,
  gradeShortAnswer,
  testConnection,
  generateNoteSection,
  mergeNoteSections,
  generateStudyPlan,
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
  part?: { index?: number; total?: number };
  plan?: {
    semesterName?: string;
    courses?: Array<{ name?: string; creditHours?: number; passFail?: boolean; targetGrade?: string }>;
    events?: Array<{ date?: string; kind?: string; title?: string; subject?: string }>;
    startDate?: string;
    endDate?: string;
    finalStart?: string;
    dailyMinutes?: number;
  };
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
  // Tell the browser when the backup model answered, so its next requests can skip the slow main model
  const info = { usedBackup: false };
  const res = await aiRequestInfo.run(info, () => handle(req));
  if (info.usedBackup) res.headers.set('x-studyland-ai-backup', '1');
  return res;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  // Only signed-in users may use AI (protects the shared built-in key's free quota)
  if (!(await getCurrentClaims())) {
    return NextResponse.json({ error: '登录已过期，请重新登录后再试。', code: 'UNAUTHORIZED' }, { status: 401 });
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
        const total = Math.min(Math.max(Math.floor(Number(body.part?.total) || 1), 1), 6);
        const part = { total, index: Math.min(Math.max(Math.floor(Number(body.part?.index) || 0), 0), total - 1) };
        const result = await generateQuiz(body.config, documentText, body.ai, part);
        return NextResponse.json(result);
      }

      case 'study-plan': {
        const p = body.plan;
        if (!p || !Array.isArray(p.courses)) throw new AIError('BAD_REQUEST', 'Missing plan', 400);
        const tasks = await generateStudyPlan({
          semesterName: String(p.semesterName || 'This semester').slice(0, 80),
          courses: p.courses.slice(0, 15).map((c) => ({
            name: String(c?.name || '').slice(0, 80),
            creditHours: Number(c?.creditHours) || 0,
            passFail: Boolean(c?.passFail),
            targetGrade: c?.targetGrade ? String(c.targetGrade).slice(0, 3) : undefined,
          })),
          events: (Array.isArray(p.events) ? p.events : []).slice(0, 60).map((e) => ({
            date: String(e?.date || ''),
            kind: String(e?.kind || 'other').slice(0, 20),
            title: String(e?.title || '').slice(0, 80),
            subject: e?.subject ? String(e.subject).slice(0, 80) : undefined,
          })),
          startDate: String(p.startDate || ''),
          endDate: String(p.endDate || ''),
          finalStart: String(p.finalStart || ''),
          dailyMinutes: Number(p.dailyMinutes) || 120,
          client: body.ai,
        });
        return NextResponse.json({ tasks });
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
    return NextResponse.json({ error: '出了点小状况，请稍后再试一次。', code: 'PROVIDER_ERROR' }, { status: 500 });
  }
}
