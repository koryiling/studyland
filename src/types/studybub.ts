export type FileType = 'pdf' | 'pptx' | 'docx' | 'txt';

export type FileStatus = 'uploading' | 'reading' | 'ready' | 'failed';

export interface StudyFile {
  id: string;
  name: string;
  size: string;
  type: FileType;
  subject: string;
  status: FileStatus;
  progress: number; // 0 - 100
  uploadedAt: string;
  textContent: string;
  summary?: string;
  questionCount?: number;
}

export type QuestionType = 'mcq' | 'tf' | 'short';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for mcq & tf
  correctAnswer: string;
  explanation: string;
  sourceReference?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  aiEvaluation?: {
    scorePct: number;
    feedback: string;
    howToImprove: string;
  };
}

export interface QuizConfig {
  fileId: string;
  fileName: string;
  subject: string;
  questionType: 'mixed' | 'mcq' | 'tf' | 'short';
  difficulty: 'Easy' | 'Normal' | 'Hard';
  questionCount: number;
}

export interface QuizSession {
  id: string;
  fileId: string;
  fileName: string;
  subject: string;
  config: QuizConfig;
  questions: QuizQuestion[];
  currentIndex: number;
  currentAnswer?: string;
  isAnswerSubmitted: boolean;
  score: number;
  startTime: number;
  isCompleted: boolean;
}

export interface QuizResult {
  id: string;
  fileId: string;
  fileName: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  timeSpentFormatted: string;
  completedAt: string;
  questions: QuizQuestion[];
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  date: string;
  questionCount: number;
  estimatedMinutes: number;
  completed: boolean;
}

export interface MistakeItem {
  id: string;
  question: QuizQuestion;
  fileName: string;
  subject: string;
  savedAt: string;
  resolved: boolean;
}

export interface UserProfile {
  name: string;
  greeting: string;
  streakDays: number;
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  accuracyRate: number;
  aiProvider: 'gemini' | 'openai' | 'ollama' | 'demo';
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}
