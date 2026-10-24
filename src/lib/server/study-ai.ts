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
  client?: ClientAIConfig
): Promise<{ questions: QuizQuestion[]; truncated: boolean }> {
  const count = Math.min(Math.max(Math.round(config.questionCount) || 10, 1), 30);
  const isPastYear = config.category === 'past_year';
  const excerpt = selectExcerpt(documentText, QUIZ_CONTEXT_CHARS);

  const system = `You are Studyland, a supportive study partner who writes exam practice questions from a student's own study material.
${GROUNDING_RULES}

Write exactly ${count} questions.
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
    throw new AIError('BAD_OUTPUT', 'AI 没有生成有效的题目，请重试一次。');
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
  if (!Number.isFinite(scorePct)) throw new AIError('BAD_OUTPUT', 'AI 评分格式不正确，请重试。');
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
    throw new AIError('BAD_OUTPUT', 'AI 没能从这份试卷中识别出考点，请确认文件内容是否完整，或重试。');
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
- Examples from the material.
- Formulas and how to apply them (if the material has any), in plain text or simple notation.
- How the concepts connect to each other.
- A short "Likely exam points" list at the end of each major topic, based only on what the material emphasises.`,
};

function notesSystemPrompt(language: NoteLanguage, detail: NoteDetail): string {
  return `You are Studyland, a warm and supportive study partner who writes study notes from a student's own material.
${GROUNDING_RULES.split('\n').filter((l) => !l.includes('same language')).join('\n')}
- If the material does not contain enough information about something, say so briefly instead of filling the gap.
- Keep important technical terms, names and formulas exactly as in the material.
- After each point that comes from a specific page or slide, cite it in parentheses, e.g. (p. 3) or (Slide 5).

${LANGUAGE_INSTRUCTIONS[language]}

${DETAIL_INSTRUCTIONS[detail]}

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
  if (markdown.length < 20) throw new AIError('BAD_OUTPUT', 'AI 没有生成笔记内容，请重试。');
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
- Do not add any information that is not in the parts.`,
    user: `Material: "${opts.fileName}" (subject: ${opts.subject})\n\n${joined}`,
    temperature: 0.2,
  });
  if (markdown.length < 20) throw new AIError('BAD_OUTPUT', 'AI 没有生成笔记内容，请重试。');
  return markdown;
}

export async function testConnection(client?: ClientAIConfig): Promise<void> {
  await callLLMJson({ client, system: 'Respond with JSON only.', user: 'Reply with {"ok": true}', temperature: 0 });
}
