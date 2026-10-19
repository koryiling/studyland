import { StudyFile, StudyTask, MistakeItem, UserProfile, QuizResult } from '@/types/studybub';
import { SEED_FILES } from './extractor';

const STORAGE_KEYS = {
  FILES: 'studybub_files_v1',
  TASKS: 'studybub_tasks_v1',
  MISTAKES: 'studybub_mistakes_v1',
  PROFILE: 'studybub_profile_v1',
  RESULTS: 'studybub_results_v1'
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Student',
  greeting: "Let's make progress today!",
  streakDays: 3,
  quizzesCompleted: 2,
  totalQuestionsAnswered: 20,
  accuracyRate: 85,
  aiProvider: 'demo',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2'
};

export const SEED_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    title: 'Biology Quiz',
    subject: 'Biology',
    date: 'Tue 13',
    questionCount: 10,
    estimatedMinutes: 15,
    completed: true
  },
  {
    id: 'task-2',
    title: 'Chemistry Quiz',
    subject: 'Chemistry',
    date: 'Tue 13',
    questionCount: 15,
    estimatedMinutes: 18,
    completed: false
  },
  {
    id: 'task-3',
    title: 'Math Review',
    subject: 'Math',
    date: 'Tue 13',
    questionCount: 5,
    estimatedMinutes: 10,
    completed: false
  }
];

export const SEED_MISTAKES: MistakeItem[] = [
  {
    id: 'mistake-1',
    fileName: 'Biology_Notes.pdf',
    subject: 'Biology',
    savedAt: 'Today',
    resolved: false,
    question: {
      id: 'bio-1-mistake',
      type: 'mcq',
      question: 'Which of the following is NOT a function of the mitochondria?',
      options: [
        'ATP production',
        'Protein synthesis',
        'Lipid metabolism',
        'Cell division'
      ],
      correctAnswer: 'Protein synthesis',
      userAnswer: 'Lipid metabolism',
      isCorrect: false,
      explanation: 'Mitochondria are the powerhouse of the cell, mainly responsible for ATP production through cellular respiration. Protein synthesis is mainly done by ribosomes in the ER.'
    }
  }
];

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function loadStudyFiles(): StudyFile[] {
  if (!isClient()) return SEED_FILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) {
      saveStudyFiles(SEED_FILES);
      return SEED_FILES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_FILES;
  }
}

export function saveStudyFiles(files: StudyFile[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  } catch (err) {
    console.error('Error saving files:', err);
  }
}

export function loadStudyTasks(): StudyTask[] {
  if (!isClient()) return SEED_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      saveStudyTasks(SEED_TASKS);
      return SEED_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TASKS;
  }
}

export function saveStudyTasks(tasks: StudyTask[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error saving tasks:', err);
  }
}

export function loadMistakes(): MistakeItem[] {
  if (!isClient()) return SEED_MISTAKES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (!raw) {
      saveMistakes(SEED_MISTAKES);
      return SEED_MISTAKES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_MISTAKES;
  }
}

export function saveMistakes(mistakes: MistakeItem[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
  } catch (err) {
    console.error('Error saving mistakes:', err);
  }
}

export function loadUserProfile(): UserProfile {
  if (!isClient()) return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      saveUserProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

export function loadQuizResults(): QuizResult[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuizResults(results: QuizResult[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  } catch (err) {
    console.error('Error saving results:', err);
  }
}
