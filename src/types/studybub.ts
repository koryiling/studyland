export type FileType = 'pdf' | 'pptx' | 'docx' | 'txt';

export type FileCategory = 'notes' | 'past_year';

export interface StudyFile {
  id: string;
  name: string;
  sizeBytes: number;
  type: FileType;
  subject: string;
  category: FileCategory;
  createdAt: string; // ISO timestamp
  // Extracted text. Page/slide boundaries are kept as "[Page N]" / "[Slide N]" markers
  // so AI output can cite where a fact came from.
  textContent: string;
  pageCount?: number;
  // Set when extraction produced too little text to be useful (e.g. scanned PDF)
  extractionWarning?: string;
  pastYearAnalysis?: PastYearAnalysis;
}

export interface PastYearAnalysis {
  examYear?: string;
  totalQuestionsDetected: number;
  highFrequencyTopics: Array<{
    topic: string;
    weight: string; // e.g. "30% 核心分值"
    description: string;
  }>;
  commonExamTraps: string[]; // 易踩坑陷阱
  scoringStrategyTips: string[]; // 评分标准与应试建议
  analyzedAt: string; // ISO timestamp
}

export type NoteLanguage = 'zh' | 'en' | 'ms' | 'zh-en';
export type NoteDetail = 'simple' | 'detailed';

export interface StudyNote {
  id: string; // one per file + language + detail; regenerating replaces it
  fileId: string;
  fileName: string;
  subject: string;
  language: NoteLanguage;
  detail: NoteDetail;
  content: string; // Markdown
  sectionsRead: number; // less than sectionsTotal only if the document was too long to read fully
  sectionsTotal: number;
  createdAt: string; // ISO timestamp
}

export type QuestionType = 'mcq' | 'tf' | 'short';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for mcq & tf
  correctAnswer: string;
  explanation: string;
  topic?: string; // knowledge point, used to find weak topics
  sourceReference?: string; // e.g. "Page 3" or "Slide 5"
  userAnswer?: string;
  isCorrect?: boolean;

  // Past year exam drill properties ("你这个对，这里错，应该要记得怎样怎样的东西")
  isPastYearSimilar?: boolean; // 是否为历年同款高仿题
  similarOriginalQuestion?: string; // 对应历年原题考点
  mustRememberRule?: string; // 📌 必须记住的考点/公式/概念口诀
  examTrapAlert?: string; // ⚠️ 历年出题陷阱与易混淆点
  scoringRubric?: string; // 🎯 评分采分点与答题规范

  aiEvaluation?: {
    scorePct: number;
    feedback: string;
    howToImprove: string;
  };
  // True when the student marked a short answer themselves because AI grading was unavailable
  selfAssessed?: boolean;
}

export type QuizQuestionType = 'mixed' | 'mcq' | 'tf' | 'short';
export type QuizDifficulty = 'Easy' | 'Normal' | 'Hard';

export interface QuizConfig {
  fileId: string;
  fileName: string;
  subject: string;
  category: FileCategory;
  questionType: QuizQuestionType;
  difficulty: QuizDifficulty;
  questionCount: number;
}

export interface QuizResult {
  id: string;
  fileId: string;
  fileName: string;
  subject: string;
  category: FileCategory;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  durationSeconds: number;
  startedAt: string; // ISO timestamp
  completedAt: string; // ISO timestamp
  questions: QuizQuestion[];
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  date: string; // local calendar day, "YYYY-MM-DD"
  fileId?: string;
  questionCount: number;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  isPastYear?: boolean;
}

export interface MistakeItem {
  id: string; // stable per file + question text, so repeated mistakes update one record
  fileId: string;
  fileName: string;
  subject: string;
  question: QuizQuestion;
  wrongCount: number;
  firstWrongAt: string; // ISO timestamp
  lastWrongAt: string; // ISO timestamp
  resolved: boolean;
}

export type AIProvider = 'server' | 'gemini' | 'openai' | 'deepseek';

// Which AI to use. 'server' = the app's built-in key (configured by the site owner).
// Personal keys are stored only in this browser.
export interface AISettings {
  provider: AIProvider;
  apiKeys: Partial<Record<Exclude<AIProvider, 'server'>, string>>;
  models: Partial<Record<Exclude<AIProvider, 'server'>, string>>;
}
