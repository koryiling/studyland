import { StudyMode } from './study';

export type AIAction = 
  | 'generate-plan'
  | 'socratic-turn'
  | 'evaluate-feynman'
  | 'generate-quiz'
  | 'grade-quiz-answer'
  | 'generate-summary';

export interface AIRequestPayload {
  action: AIAction;
  topic?: string;
  context?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  mode?: StudyMode;
  userMessage?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  providerConfig?: {
    provider: 'gemini' | 'openai' | 'ollama' | 'demo';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };
}

export interface GeneratedPlanResponse {
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetDays: number;
  milestones: Array<{
    title: string;
    description: string;
    estimatedMinutes: number;
    concepts: Array<{
      name: string;
      summary: string;
      keyPoints: string[];
    }>;
  }>;
}

export interface SocraticTurnResponse {
  reply: string;
  feedback?: {
    score?: number;
    strengths?: string[];
    gaps?: string[];
    coachNote?: string;
  };
  isSessionFinished?: boolean;
}

export interface FeynmanEvaluationResponse {
  score: number; // 0-100
  clarityRating: 'Crystal Clear' | 'Good with minor gaps' | 'Needs Simplification' | 'High Jargon';
  strengths: string[];
  jargonOrVaguePhrases: string[];
  missedConnections: string[];
  suggestedAnalogy: string;
  challengeQuestion: string;
}

export interface QuizQuestionItem {
  id: string;
  type: 'concept' | 'scenario' | 'edge-case';
  question: string;
  hint?: string;
  sampleAnswerCriteria: string;
}

export interface GenerateQuizResponse {
  topic: string;
  questions: QuizQuestionItem[];
}

export interface GradeQuizResponse {
  score: number; // 0-100
  evaluation: string;
  strengths: string[];
  missingElements: string[];
  idealExplanation: string;
  nextQuestionPrompt?: string;
}
