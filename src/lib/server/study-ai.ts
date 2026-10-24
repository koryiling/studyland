// Server-only: prompts and output validation for Studyland's AI features.

import { randomUUID } from 'crypto';
import type { NoteDetail, NoteLanguage, PastYearAnalysis, QuizConfig, QuizQuestion, QuestionType } from '@/types/studybub';
import { selectExcerpt } from '@/lib/doc-text';
import { AIError, callLLMJson, callLLMText, type ClientAIConfig } from './llm';

const QUIZ_CONTEXT_CHARS = 40_000;
const ANALYSIS_CONTEXT_CHARS = 40_000;

const GROUNDING_RULES = `Grounding rules:
- Use ONLY facts stated in the provided material. Never add facts from outside it.
- The material may contain markers like "[Page 3]" or "[Slide 5]". Use them to cite where each fact comes from.
- Write in the same language as the material. If the material mixes languages, keep technical terms in their original language.`;

const TYPE_DESCRIPTIONS: Record<QuizConfig['questionType'], string> = {
  mixed: 'a balanced mix of multiple choice (mcq), true/false (tf) and short answer (short)',
  mcq: 'multiple choice (mcq) only',
  tf: 'true/false (tf) only',
  short: 'short answer (short) only',
};

interface RawQuestion {
  type?: string;
  question?: string;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string;
  topic?: string;
  sourceReference?: string;
  similarOriginalQuestion?: string;
  mustRememberRule?: string;
  examTrapAlert?: string;
  scoringRubric?: string;
}

const TRUE_WORDS = ['true', 't', '正确', '对', 'betul', 'benar'];
const FALSE_WORDS = ['false', 'f', '错误', '错', 'salah'];

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}

// Validate AI output: drop malformed questions and make answers match the options exactly,
// so answer checking in the quiz player is reliable.
function normalizeQuestion(raw: RawQuestion, isPastYear: boolean): QuizQuestion | null {
  const question = str(raw.question);
  const explanation = str(raw.explanation);
  let answer = str(raw.correctAnswer);
  const type = str(raw.type).toLowerCase() as QuestionType;
  if (!question || !answer || !['mcq', 'tf', 'short'].includes(type)) return null;

  let options: string[] | undefined;
  if (type === 'tf') {
    const lower = answer.toLowerCase();
    if (TRUE_WORDS.includes(lower)) answer = 'True';
    else if (FALSE_WORDS.includes(lower)) answer = 'False';
    else return null;
    options = ['True', 'False'];
  } else if (type === 'mcq') {
    options = Array.isArray(raw.options) ? raw.options.map(str).filter(Boolean) : [];
    options = Array.from(new Set(options)).slice(0, 6);
    if (options.length < 2) return null;
    // Accept answers given as a letter ("B") or with a letter prefix ("B. text")
    const letterIdx = /^[A-F]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
    const stripped = answer.replace(/^[A-F][.)、:]\s*/i, '');
    const match =
      options.find((o) => o.toLowerCase() === answer.toLowerCase()) ||
      options.find((o) => o.toLowerCase() === stripped.toLowerCase()) ||
      (letterIdx >= 0 ? options[letterIdx] : undefined);
    if (!match) return null;
    answer = match;
  }

  return {
    id: randomUUID(),
    type,
    question,
    options,
    correctAnswer: answer,
    explanation: explanation || '（AI 没有提供解释）',
    topic: str(raw.topic) || undefined,
    sourceReference: str(raw.sourceReference) || undefined,
    ...(isPastYear && {
      isPastYearSimilar: true,
      similarOriginalQuestion: str(raw.similarOriginalQuestion) || undefined,
      mustRememberRule: str(raw.mustRememberRule) || undefined,
      examTrapAlert: str(raw.examTrapAlert) || undefined,
      scoringRubric: str(raw.scoringRubric) || undefined,
    }),
  };
}

export async function generateQuiz(
  config: QuizConfig,
  documentText: string,
  client?: ClientAIConfig,
  // Bigger quizzes are written in parallel parts; each part focuses on a different stretch of the material
  part?: { index: number; total: number }
): Promise<{ questions: QuizQuestion[]; truncated: boolean }> {
  const count = Math.min(Math.max(Math.round(config.questionCount) || 10, 1), 30);
  const avoid = (Array.isArray(config.avoidQuestions) ? config.avoidQuestions : [])
    .filter((q) => typeof q === 'string')
    .slice(0, 30)
    .map((q) => q.slice(0, 200));
  const avoidNote = avoid.length
    ? `\nThese questions are already in the quiz. Do not repeat them or ask about the same fact in the same way; test other points or other angles:\n${avoid.map((q) => `- ${q}`).join('\n')}`
    : '';
  const partNote =
    part && part.total > 1
      ? `\nThis is part ${part.index + 1} of ${part.total} of one quiz; the other parts are written at the same time. Divide the material into ${part.total} equal parts in order and ask mainly about part ${part.index + 1}, so the parts do not repeat each other.`
      : '';
  const isPastYear = config.category === 'past_year';
  const excerpt = selectExcerpt(documentText, QUIZ_CONTEXT_CHARS);

  const system = `You are Studyland, a supportive study partner who writes exam practice questions from a student's own study material.
${GROUNDING_RULES}

Write exactly ${count} questions.${partNote}${avoidNote}
- Question types: ${TYPE_DESCRIPTIONS[config.questionType]}.
- Difficulty: ${config.difficulty}.
- Cover different important concepts across the whole material; do not ask about the same fact twice.
- mcq: exactly 4 options, one clearly correct; "correctAnswer" must be copied exactly from "options".
- tf: "correctAnswer" is "True" or "False"; omit "options".
- short: "correctAnswer" is a model answer containing the key points; omit "options".
- "explanation": why the answer is correct, based on the material.
- "topic": the short name of the concept being tested.
- "sourceReference": where in the material this comes from (e.g. "Page 3", "Slide 5", or a section title).
${
  isPastYear
    ? `This material is a PAST YEAR EXAM PAPER. Write new questions that imitate its style, topics and traps. For every question also include:
- "similarOriginalQuestion": which original exam question it imitates
- "mustRememberRule": the key rule/formula/fact the student must remember
- "examTrapAlert": the common trap or mistake for this kind of question
- "scoringRubric": how marks are typically awarded`
    : ''
}

Respond with JSON only: {"questions": [{"type": "...", "question": "...", "options": [...], "correctAnswer": "...", "explanation": "...", "topic": "...", "sourceReference": "..."${
    isPastYear ? ', "similarOriginalQuestion": "...", "mustRememberRule": "...", "examTrapAlert": "...", "scoringRubric": "..."' : ''
  }}]}`;

  const user = `Material: "${config.fileName}" (subject: ${config.subject})${
    excerpt.truncated ? '\nNote: the material is long; these are evenly spaced excerpts covering the whole document.' : ''
  }

${excerpt.text}`;

  const result = await callLLMJson<{ questions?: RawQuestion[] }>({ client, system, user, temperature: 0.5 });
  const questions = (Array.isArray(result.questions) ? result.questions : [])
    .map((q) => normalizeQuestion(q, isPastYear))
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, count);

  if (questions.length === 0) {
    throw new AIError('BAD_OUTPUT', 'AI 这次出的题目不太完整，请再按一次试试。');
  }
  return { questions, truncated: excerpt.truncated };
}

export async function gradeShortAnswer(
  question: QuizQuestion,
  userAnswer: string,
  client?: ClientAIConfig
): Promise<{ scorePct: number; isCorrect: boolean; feedback: string; howToImprove: string }> {
  const system = `You are Studyland, a fair and encouraging teacher grading a student's short answer.
Grade only against the model answer and rubric. Award credit for correct meaning even if the wording differs.
Reply in the same language as the question.
Respond with JSON only: {"scorePct": 0-100, "feedback": "what was right and what was missing", "howToImprove": "one concrete tip"}`;

  const user = `Question: ${question.question}
Model answer: ${question.correctAnswer}
${question.scoringRubric ? `Scoring rubric: ${question.scoringRubric}\n` : ''}Explanation from material: ${question.explanation}

Student answer: ${userAnswer}`;

  const result = await callLLMJson<{ scorePct?: unknown; feedback?: string; howToImprove?: string }>({
    client,
    system,
    user,
    temperature: 0.2,
  });
  const scorePct = Math.min(100, Math.max(0, Math.round(Number(result.scorePct))));
  if (!Number.isFinite(scorePct)) throw new AIError('BAD_OUTPUT', 'AI 这次没能顺利批改，请再按一次试试。');
  return {
    scorePct,
    isCorrect: scorePct >= 60,
    feedback: str(result.feedback),
    howToImprove: str(result.howToImprove),
  };
}

export async function analyzePastYearPaper(
  fileName: string,
  subject: string,
  documentText: string,
  client?: ClientAIConfig
): Promise<PastYearAnalysis> {
  const excerpt = selectExcerpt(documentText, ANALYSIS_CONTEXT_CHARS);
  const system = `You are Studyland, an experienced exam coach analysing a past year exam paper for a student.
${GROUNDING_RULES}
- Only describe topics and question styles that actually appear in this paper. If something cannot be determined, say so instead of guessing.
- Topic weights are estimates based on how many questions/marks each topic takes in this paper.

Respond with JSON only:
{"examYear": "exam name/year if stated, else empty string",
 "totalQuestionsDetected": number,
 "highFrequencyTopics": [{"topic": "...", "weight": "e.g. 30% of marks", "description": "how it is tested"}],
 "commonExamTraps": ["..."],
 "scoringStrategyTips": ["..."]}`;

  const user = `Paper: "${fileName}" (subject: ${subject})

${excerpt.text}`;

  const r = await callLLMJson<Partial<PastYearAnalysis>>({ client, system, user, temperature: 0.3 });
  const topics = Array.isArray(r.highFrequencyTopics) ? r.highFrequencyTopics : [];
  const analysis: PastYearAnalysis = {
    examYear: str(r.examYear) || undefined,
    totalQuestionsDetected: Math.max(0, Math.round(Number(r.totalQuestionsDetected)) || 0),
    highFrequencyTopics: topics
      .map((t) => ({ topic: str(t?.topic), weight: str(t?.weight), description: str(t?.description) }))
      .filter((t) => t.topic),
    commonExamTraps: (Array.isArray(r.commonExamTraps) ? r.commonExamTraps : []).map(str).filter(Boolean),
    scoringStrategyTips: (Array.isArray(r.scoringStrategyTips) ? r.scoringStrategyTips : []).map(str).filter(Boolean),
    analyzedAt: new Date().toISOString(),
  };
  if (analysis.highFrequencyTopics.length === 0) {
    throw new AIError('BAD_OUTPUT', 'AI 这次没能从试卷里找到考点。请确认文件内容完整，再试一次看看。');
  }
  return analysis;
}

// ---------- AI Notes ----------

export const NOTE_SECTION_MAX_CHARS = 30_000;
const NOTE_MERGE_MAX_CHARS = 120_000;

const LANGUAGE_INSTRUCTIONS: Record<NoteLanguage, string> = {
  zh: 'Write the notes in Simplified Chinese (简体中文). Keep important technical terms in their original language in parentheses, e.g. 线粒体 (mitochondria).',
  en: 'Write the notes in English.',
  ms: 'Write the notes in Bahasa Melayu. Keep important technical terms in their original language in parentheses where helpful.',
  'zh-en': 'Write bilingual notes: each heading and point in English first, followed by its Simplified Chinese translation on the same line or the next line.',
};

const DETAIL_INSTRUCTIONS: Record<NoteDetail, string> = {
  simple: `SIMPLE NOTES for quick revision and memorisation:
- Short bullet points only; no long paragraphs.
- Key definitions and keywords (bold the keyword).
- Core concepts and the most important facts.`,
  detailed: `DETAILED NOTES for deep understanding:
- Complete explanations of each concept, including principles, steps and mechanisms.
- Formulas and how to apply them (if the material has any), in plain text or simple notation.
- How the concepts connect to each other.
- A short "Likely exam points" list at the end of each major topic, based only on what the material emphasises.`,
};

// Students understand a concept much better once they see it used, so every
// set of notes (simple or detailed) gets worked examples for its key concepts.
const EXAMPLE_INSTRUCTIONS = `EXAMPLES (required for both simple and detailed notes):
For each main concept, formula or method, add an examples block right after its explanation:
1. "Example from the material": an example, case, calculation or illustration that appears in the material, with its page/slide citation. If the material has none for this concept, skip this item; never invent one and present it as being from the material.
2. "Practice example": ONE new, similar example you write yourself, using only the concepts, rules and formulas taught in the material, followed by its answer with short step-by-step working.
Format each block like this (translate the labels into the notes language):
> **📘 Example from the material (p. N):** ...
>
> **✏️ Practice example:** ...
>
> **✅ Answer:** ...
In simple notes keep the examples short; in detailed notes explain the working fully. Purely descriptive topics (e.g. history facts) can use a short scenario or question as the practice example.`;

function notesSystemPrompt(language: NoteLanguage, detail: NoteDetail): string {
  return `You are Studyland, a warm and supportive study partner who writes study notes from a student's own material.
${GROUNDING_RULES.split('\n').filter((l) => !l.includes('same language')).join('\n')}
- If the material does not contain enough information about something, say so briefly instead of filling the gap.
- Keep important technical terms, names and formulas exactly as in the material.
- After each point that comes from a specific page or slide, cite it in parentheses, e.g. (p. 3) or (Slide 5).

${LANGUAGE_INSTRUCTIONS[language]}

${DETAIL_INSTRUCTIONS[detail]}

${EXAMPLE_INSTRUCTIONS}
The practice examples are the only content you may write beyond the material; everything else must come from it.

Format: Markdown. Use "##" for main topics/chapters and "###" for subtopics, "-" bullets, **bold** for keywords, and Markdown tables where a comparison helps. Do not wrap the answer in a code block. Do not add a preface like "Here are your notes".`;
}

export async function generateNoteSection(opts: {
  fileName: string;
  subject: string;
  text: string;
  sectionIndex: number;
  sectionTotal: number;
  language: NoteLanguage;
  detail: NoteDetail;
  client?: ClientAIConfig;
}): Promise<string> {
  const partInfo =
    opts.sectionTotal > 1
      ? `\nThis is part ${opts.sectionIndex + 1} of ${opts.sectionTotal} of the material. Write notes for this part only; they will be combined with the other parts later.`
      : '';
  const markdown = await callLLMText({
    client: opts.client,
    system: notesSystemPrompt(opts.language, opts.detail),
    user: `Material: "${opts.fileName}" (subject: ${opts.subject})${partInfo}\n\n${opts.text.slice(0, NOTE_SECTION_MAX_CHARS)}`,
    temperature: 0.3,
  });
  if (markdown.length < 20) throw new AIError('BAD_OUTPUT', 'AI 这次没有写出笔记，请再按一次试试。');
  return markdown;
}

export async function mergeNoteSections(opts: {
  fileName: string;
  subject: string;
  sections: string[];
  language: NoteLanguage;
  detail: NoteDetail;
  client?: ClientAIConfig;
}): Promise<string> {
  const joined = opts.sections.map((s, i) => `=== Part ${i + 1} ===\n${s}`).join('\n\n');
  // Too large to merge in one call: keep the parts in order rather than drop content
  if (joined.length > NOTE_MERGE_MAX_CHARS) return opts.sections.join('\n\n---\n\n');

  const markdown = await callLLMText({
    client: opts.client,
    system: `${notesSystemPrompt(opts.language, opts.detail)}

You are given notes that were written part by part from one document. Combine them into ONE well-organised set of notes:
- Organise by chapter/topic in the order of the original material.
- Merge duplicated points; keep every distinct fact, example, formula and page citation.
- Keep the examples blocks (example from the material, practice example and answer) with their concept.
- Do not add any information that is not in the parts.`,
    user: `Material: "${opts.fileName}" (subject: ${opts.subject})\n\n${joined}`,
    temperature: 0.2,
  });
  if (markdown.length < 20) throw new AIError('BAD_OUTPUT', 'AI 这次没有写出笔记，请再按一次试试。');
  return markdown;
}

export async function testConnection(client?: ClientAIConfig): Promise<void> {
  await callLLMJson({ client, system: 'Respond with JSON only.', user: 'Reply with {"ok": true}', temperature: 0 });
}

// ---------- AI Study Planner ----------

export interface PlanCourseInput {
  name: string;
  creditHours: number;
  passFail: boolean;
  targetGrade?: string;
}

export interface PlanEventInput {
  date: string;
  kind: string;
  title: string;
  subject?: string;
}

export interface PlannedTask {
  date: string;
  kind: 'study' | 'practice';
  subject: string;
  minutes: number;
  title: string;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PLAN_DAYS = 70;

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export async function generateStudyPlan(opts: {
  semesterName: string;
  courses: PlanCourseInput[];
  events: PlanEventInput[];
  startDate: string;
  endDate: string;
  finalStart: string;
  dailyMinutes: number;
  client?: ClientAIConfig;
}): Promise<PlannedTask[]> {
  const courses = opts.courses.filter((c) => c.name.trim()).slice(0, 15);
  if (courses.length === 0) throw new AIError('BAD_REQUEST', '先在学期设定里加入这学期的科目，AI 才能帮你排计划哦。', 400);
  if (!DAY_KEY.test(opts.startDate) || !DAY_KEY.test(opts.endDate) || opts.endDate < opts.startDate) {
    throw new AIError('BAD_REQUEST', '计划的日期不太对，请检查开始冲刺和考试日期。', 400);
  }
  const endDate = daysBetween(opts.startDate, opts.endDate) > MAX_PLAN_DAYS ? addDays(opts.startDate, MAX_PLAN_DAYS) : opts.endDate;
  const dailyMinutes = Math.min(Math.max(Math.round(opts.dailyMinutes) || 120, 30), 600);
  const events = opts.events
    .filter((e) => DAY_KEY.test(e.date) && e.date >= opts.startDate && e.date <= endDate)
    .slice(0, 60);

  const system = `You are Studyland, a caring and practical study coach making a revision plan for a university student (UTAR, Malaysia).

Make a day-by-day plan from ${opts.startDate} to ${endDate} (inclusive). The final exam period starts on ${opts.finalStart}.
Each task is one of two kinds:
- "study": focused study of one subject for "minutes" (25–90 minutes; it will be done with a focus timer).
- "practice": doing practice questions / a quiz on one subject ("minutes" is the expected time, 15–40).

Rules:
- Total minutes per day must not exceed ${dailyMinutes}. Leave one lighter day each week so the student can rest.
- Spread every subject across the plan; give more time to subjects with more credit hours, a higher target grade, or an exam coming soon.
- In the 2–3 days before each exam, focus mainly on that exam's subject and include practice.
- On an exam day, only a short light review of that exam's subject (or nothing), plus at most one short task for the next exam.
- Pass/Fail subjects need less time than graded subjects.
- Mix study and practice: roughly one practice after every two study tasks of the same subject.
- Use ONLY the subject names exactly as given. Do not schedule anything after the subject's own final exam.
- "title" is a short, concrete task title in Simplified Chinese (e.g. "复习第 3–4 章重点" or "做一套练习题检查弱点"), keeping subject names as given.

Respond with JSON only: {"tasks": [{"date": "YYYY-MM-DD", "kind": "study" | "practice", "subject": "...", "minutes": number, "title": "..."}]}`;

  const user = `Semester: ${opts.semesterName}
Subjects:
${courses.map((c) => `- ${c.name} | ${c.creditHours} credit hours | ${c.passFail ? 'Pass/Fail' : `target grade ${c.targetGrade || 'not set'}`}`).join('\n')}

Exams and deadlines in this period:
${events.length ? events.map((e) => `- ${e.date} | ${e.kind} | ${e.title}${e.subject ? ` | ${e.subject}` : ''}`).join('\n') : '- (none added yet; assume finals are spread over the two weeks from ' + opts.finalStart + ')'}`;

  const result = await callLLMJson<{ tasks?: Array<Record<string, unknown>> }>({ client: opts.client, system, user, temperature: 0.4 });
  const byName = new Map(courses.map((c) => [c.name.trim().toLowerCase(), c.name]));
  const perDay = new Map<string, number>();
  const tasks: PlannedTask[] = [];
  for (const raw of Array.isArray(result.tasks) ? result.tasks : []) {
    const date = str(raw.date);
    const subject = byName.get(str(raw.subject).toLowerCase());
    const kind = str(raw.kind) === 'practice' ? 'practice' : str(raw.kind) === 'study' ? 'study' : null;
    if (!DAY_KEY.test(date) || date < opts.startDate || date > endDate || !subject || !kind) continue;
    const minutes = Math.min(Math.max(Math.round((Number(raw.minutes) || 30) / 5) * 5, 10), 180);
    const used = perDay.get(date) || 0;
    if (used + minutes > dailyMinutes * 1.2) continue; // keep days realistic even if the AI overfills
    perDay.set(date, used + minutes);
    tasks.push({ date, kind, subject, minutes, title: str(raw.title).slice(0, 80) || (kind === 'study' ? `复习 ${subject}` : `${subject} 练习题`) });
    if (tasks.length >= 400) break;
  }
  if (tasks.length === 0) throw new AIError('BAD_OUTPUT', 'AI 这次没有排出计划，请再按一次试试。');
  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}
