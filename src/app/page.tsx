'use client';

import React, { useState, useEffect } from 'react';
import { Navigation, TabType } from '@/components/studybub/Navigation';
import { HomeScreen } from '@/components/studybub/HomeScreen';
import { UploadScreen } from '@/components/studybub/UploadScreen';
import { GenerateQuizModal } from '@/components/studybub/GenerateQuizModal';
import { QuizPlayer } from '@/components/studybub/QuizPlayer';
import { QuizResultView } from '@/components/studybub/QuizResultView';
import { FilesScreen } from '@/components/studybub/FilesScreen';
import { StudyPlanScreen } from '@/components/studybub/StudyPlanScreen';
import { ProfileScreen } from '@/components/studybub/ProfileScreen';
import { 
  StudyFile, 
  StudyTask, 
  MistakeItem, 
  UserProfile, 
  QuizResult, 
  QuizConfig, 
  QuizQuestion 
} from '@/types/studybub';
import { 
  loadStudyFiles, 
  saveStudyFiles, 
  loadStudyTasks, 
  saveStudyTasks, 
  loadMistakes, 
  saveMistakes, 
  loadUserProfile, 
  saveUserProfile, 
  loadQuizResults, 
  saveQuizResults, 
  DEFAULT_PROFILE 
} from '@/lib/studybub-storage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);

  // Workflow states
  const [isUploading, setIsUploading] = useState(false);
  const [fileForQuiz, setFileForQuiz] = useState<StudyFile | null>(null);
  const [activeQuizSession, setActiveQuizSession] = useState<{
    questions: QuizQuestion[];
    config: QuizConfig;
    documentText: string;
  } | null>(null);
  const [activeQuizResult, setActiveQuizResult] = useState<QuizResult | null>(null);

  // Load from local storage
  useEffect(() => {
    setFiles(loadStudyFiles());
    setTasks(loadStudyTasks());
    setMistakes(loadMistakes());
    setProfile(loadUserProfile());
    setQuizHistory(loadQuizResults());
  }, []);

  // Handlers for Files
  const handleAddFile = (newFile: StudyFile) => {
    const updated = [newFile, ...files];
    setFiles(updated);
    saveStudyFiles(updated);
  };

  const handleDeleteFile = (fileId: string) => {
    const updated = files.filter(f => f.id !== fileId);
    setFiles(updated);
    saveStudyFiles(updated);
  };

  // Handlers for Tasks
  const handleUpdateTasks = (updatedTasks: StudyTask[]) => {
    setTasks(updatedTasks);
    saveStudyTasks(updatedTasks);
  };

  const handleAddTaskToPlan = (title: string, subject: string) => {
    const newTask: StudyTask = {
      id: `task-${Date.now()}`,
      title,
      subject,
      date: 'Tue 13',
      questionCount: 10,
      estimatedMinutes: 15,
      completed: false
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveStudyTasks(updated);
  };

  // Handlers for Mistakes
  const handleSaveMistake = (mistake: MistakeItem) => {
    const exists = mistakes.some(m => m.question.question === mistake.question.question);
    if (!exists) {
      const updated = [mistake, ...mistakes];
      setMistakes(updated);
      saveMistakes(updated);
    }
  };

  // Handler for Profile Update
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  // Handlers for Quiz Workflow
  const handleStartQuizFromGenerated = (questions: QuizQuestion[], config: QuizConfig) => {
    const sourceFile = files.find(f => f.id === config.fileId) || fileForQuiz;
    setFileForQuiz(null);
    setIsUploading(false);
    setActiveQuizSession({
      questions,
      config,
      documentText: sourceFile?.textContent || ''
    });
  };

  const handleQuizCompleted = (result: QuizResult) => {
    setActiveQuizSession(null);
    setActiveQuizResult(result);

    // Save history
    const updatedHistory = [result, ...quizHistory];
    setQuizHistory(updatedHistory);
    saveQuizResults(updatedHistory);

    // Update profile metrics
    const updatedProfile: UserProfile = {
      ...profile,
      quizzesCompleted: profile.quizzesCompleted + 1,
      totalQuestionsAnswered: profile.totalQuestionsAnswered + result.totalQuestions,
      accuracyRate: Math.round(((profile.accuracyRate * profile.quizzesCompleted) + result.percentage) / (profile.quizzesCompleted + 1))
    };
    handleUpdateProfile(updatedProfile);
  };

  return (
    <div className="min-h-screen bg-[#F4F9F5] text-[#1C2B22] flex flex-col font-sans selection:bg-[#2F8F5B] selection:text-white">
      
      {/* Top Header Navigation (Desktop) & Bottom Navigation (Mobile) */}
      {!activeQuizSession && (
        <Navigation
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setIsUploading(false);
            setFileForQuiz(null);
            setActiveQuizResult(null);
            setActiveTab(tab);
          }}
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4">
        
        {/* QUIZ IN PROGRESS ACTIVE VIEW */}
        {activeQuizSession ? (
          <QuizPlayer
            questions={activeQuizSession.questions}
            config={activeQuizSession.config}
            documentText={activeQuizSession.documentText}
            onExit={() => setActiveQuizSession(null)}
            onComplete={handleQuizCompleted}
            onSaveMistake={handleSaveMistake}
          />
        ) : activeQuizResult ? (
          /* QUIZ RESULTS VIEW */
          <QuizResultView
            result={activeQuizResult}
            onBackToHome={() => {
              setActiveQuizResult(null);
              setActiveTab('home');
            }}
            onTryAgain={() => {
              const previousConfig: QuizConfig = {
                fileId: activeQuizResult.fileId,
                fileName: activeQuizResult.fileName,
                subject: activeQuizResult.subject,
                questionType: 'mixed',
                difficulty: 'Normal',
                questionCount: activeQuizResult.totalQuestions
              };
              const questions = activeQuizResult.questions.map(q => ({
                ...q,
                userAnswer: undefined,
                isCorrect: undefined
              }));
              setActiveQuizResult(null);
              setActiveQuizSession({
                questions,
                config: previousConfig,
                documentText: ''
              });
            }}
            onAddTaskToPlan={handleAddTaskToPlan}
          />
        ) : fileForQuiz ? (
          /* GENERATE QUIZ SETTINGS MODAL */
          <GenerateQuizModal
            file={fileForQuiz}
            onBack={() => setFileForQuiz(null)}
            onQuizGenerated={handleStartQuizFromGenerated}
          />
        ) : isUploading ? (
          /* UPLOAD MATERIALS SCREEN */
          <UploadScreen
            files={files}
            onBack={() => setIsUploading(false)}
            onFileReadyForQuiz={(file) => {
              setIsUploading(false);
              setFileForQuiz(file);
            }}
            onAddFile={handleAddFile}
          />
        ) : (
          /* TAB SCREENS */
          <>
            {activeTab === 'home' && (
              <HomeScreen
                files={files}
                tasks={tasks}
                onUploadClick={() => setIsUploading(true)}
                onCreateQuizClick={() => {
                  if (files.length > 0) {
                    setFileForQuiz(files[0]);
                  } else {
                    setIsUploading(true);
                  }
                }}
                onMyFilesClick={() => setActiveTab('files')}
                onPlanClick={() => setActiveTab('plan')}
                onSelectFile={(file) => setFileForQuiz(file)}
              />
            )}

            {activeTab === 'files' && (
              <FilesScreen
                files={files}
                onUploadClick={() => setIsUploading(true)}
                onGenerateQuiz={(file) => setFileForQuiz(file)}
                onDeleteFile={handleDeleteFile}
              />
            )}

            {activeTab === 'plan' && (
              <StudyPlanScreen
                tasks={tasks}
                onUpdateTasks={handleUpdateTasks}
                onStartQuizForTask={(subject) => {
                  const matchingFile = files.find(f => f.subject.toLowerCase() === subject.toLowerCase()) || files[0];
                  if (matchingFile) setFileForQuiz(matchingFile);
                }}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                profile={profile}
                mistakes={mistakes}
                quizHistory={quizHistory}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </>
        )}

      </main>

    </div>
  );
}
