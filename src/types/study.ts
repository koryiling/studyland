export type MasteryStatus = 'todo' | 'in-progress' | 'review' | 'mastered';

export type StudyMode = 'socratic' | 'feynman' | 'quiz' | 'freeform';

export interface Concept {
  id: string;
  name: string;
  summary: string;
  keyPoints?: string[];
  masteryScore: number; // 0 - 100
  lastReviewedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
  status: MasteryStatus;
  concepts: Concept[];
  estimatedMinutes?: number;
}

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'active' | 'completed' | 'archived';
  targetDays?: number;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
}

export interface DialogueTurn {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  feedback?: {
    score?: number; // 0-100
    strengths?: string[];
    gaps?: string[];
    coachNote?: string;
  };
}

export interface SessionAssessment {
  overallScore: number; // 0-100
  strengths: string[];
  gaps: string[];
  keyTakeaway: string;
  recommendedReviewConcepts: string[];
  recommendedNextSteps?: string[];
}

export interface QuestioningSession {
  id: string;
  planId?: string;
  planTitle?: string;
  milestoneId?: string;
  conceptName: string;
  mode: StudyMode;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  createdAt: string;
  completedAt?: string;
  turns: DialogueTurn[];
  assessment?: SessionAssessment;
}

export interface KnowledgeGap {
  id: string;
  topic: string;
  concept: string;
  notes: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  resolved: boolean;
}

export interface UserSettings {
  provider: 'gemini' | 'openai' | 'ollama' | 'demo';
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  dailyGoalMinutes: number;
  streakDays: number;
  lastActiveDate: string;
}

export interface StudyStats {
  totalPlans: number;
  completedMilestones: number;
  totalQuestionsAnswered: number;
  averageMasteryScore: number;
  totalStudyMinutes: number;
  activeStreak: number;
}
