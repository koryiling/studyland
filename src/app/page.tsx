'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navigation, TabType } from '@/components/studybub/Navigation';
import { HomeScreen } from '@/components/studybub/HomeScreen';
import { UploadScreen } from '@/components/studybub/UploadScreen';
import { GenerateQuizModal } from '@/components/studybub/GenerateQuizModal';
import { QuizPlayer } from '@/components/studybub/QuizPlayer';
import { QuizResultView } from '@/components/studybub/QuizResultView';
import { FilesScreen } from '@/components/studybub/FilesScreen';
import { StudyPlanScreen } from '@/components/studybub/StudyPlanScreen';
import { ProfileScreen } from '@/components/studybub/ProfileScreen';
import { PastYearAnalysisView } from '@/components/studybub/PastYearAnalysisView';
import { NotesView } from '@/components/studybub/NotesView';
import { AuthScreen } from '@/components/studybub/AuthScreen';
import { SetPasswordScreen } from '@/components/studybub/SetPasswordScreen';
import { SemesterEditor } from '@/components/studybub/SemesterEditor';
import { JourneyScreen } from '@/components/studybub/JourneyScreen';
import { FocusTimer } from '@/components/studybub/FocusTimer';
import { PracticeFilePicker, type StartFocusRequest } from '@/components/studybub/StudyPlanScreen';
import {
  StudyFile,
  StudyTask,
  MistakeItem,
  QuizResult,
  QuizConfig,
  QuizQuestion,
  StudyNote,
  Semester,
  StudyEvent,
  FocusSession,
} from '@/types/studybub';
import { db, newId } from '@/lib/studybub-storage';
import { createClient } from '@/lib/supabase/client';
import { addDaysKey, computeStreak, toDayKey, todayKey } from '@/lib/dates';
import { RunningFocus, loadRunningFocus, saveRunningFocus } from '@/lib/focus';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface SignedInUser {
  id: string;
  email: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

type AuthState = { status: 'loading' } | { status: 'signed-out'; error?: string } | { status: 'signed-in'; user: SignedInUser };

// Removes ?set-password / ?auth_error from the address bar once handled
function clearAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('set-password');
  url.searchParams.delete('auth_error');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// The semester being studied now: the one whose classes-to-finals period contains today,
// otherwise the next upcoming one, otherwise the most recent one with a plan.
function pickCurrentSemester(semesters: Semester[], today: string): Semester | null {
  const planned = semesters.filter((s) => s.plan).sort((a, b) => a.plan!.startDate.localeCompare(b.plan!.startDate));
  return (
    planned.find((s) => s.plan!.startDate <= today && today <= addDaysKey(s.plan!.finalStart, 20)) ||
    planned.find((s) => s.plan!.startDate > today) ||
    planned.at(-1) ||
    null
  );
}

const byNewest = <T,>(key: (item: T) => string) => (a: T, b: T) => key(b).localeCompare(key(a));

// Stable id per file + question, so getting the same question wrong again updates one record
function mistakeIdFor(fileId: string, questionText: string): string {
  let hash = 0;
  for (let i = 0; i < questionText.length; i++) hash = (hash * 31 + questionText.charCodeAt(i)) | 0;
  return `mistake-${fileId}-${(hash >>> 0).toString(36)}`;
}

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [passwordMode, setPasswordMode] = useState<'recovery' | 'change' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focus, setFocus] = useState<RunningFocus | null>(null);
  const [editingSemester, setEditingSemester] = useState<{ semester?: Semester; past?: boolean } | null>(null);
  const [practiceTaskId, setPracticeTaskId] = useState<string | null>(null);
  const [homePracticeTask, setHomePracticeTask] = useState<StudyTask | null>(null);

  // Workflow states
  const [isUploading, setIsUploading] = useState(false);
  const [fileForQuiz, setFileForQuiz] = useState<StudyFile | null>(null);
  const [fileForPastYear, setFileForPastYear] = useState<StudyFile | null>(null);
  const [fileForNotes, setFileForNotes] = useState<StudyFile | null>(null);
  const [activeQuizSession, setActiveQuizSession] = useState<{
    questions: QuizQuestion[];
    config: QuizConfig;
  } | null>(null);
  const [activeQuizResult, setActiveQuizResult] = useState<QuizResult | null>(null);

  // Track the signed-in user. onAuthStateChange fires immediately with the current session.
  useEffect(() => {
    const supabase = createClient();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const params = new URLSearchParams(window.location.search);
      if (!session?.user) {
        const error = params.get('auth_error') || undefined;
        if (error) clearAuthParams();
        setAuth({ status: 'signed-out', error });
        return;
      }
      if (event === 'PASSWORD_RECOVERY' || params.get('set-password')) {
        setPasswordMode('recovery');
        clearAuthParams();
      }
      const user = session.user;
      setAuth((prev) => {
        const next: SignedInUser = {
          id: user.id,
          email: user.email || '',
          isAdmin: user.app_metadata?.role === 'admin',
          mustChangePassword: Boolean(user.app_metadata?.must_change_password),
        };
        // Keep the same object when nothing changed, so data isn't reloaded on token refresh
        if (prev.status === 'signed-in' && JSON.stringify(prev.user) === JSON.stringify(next)) return prev;
        return { status: 'signed-in', user: next };
      });
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const userId = auth.status === 'signed-in' ? auth.user.id : null;

  // Load this user's data from the cloud whenever the signed-in user changes
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [f, t, m, r, n, sem, ev, fs] = await Promise.all([
        db.files.list(),
        db.tasks.list(),
        db.mistakes.list(),
        db.quizResults.list(),
        db.notes.list(),
        db.semesters.list(),
        db.events.list(),
        db.focusSessions.list(),
      ]);
      if (cancelled) return;
      setSemesters(sem);
      setEvents(ev.sort((a, b) => a.date.localeCompare(b.date)));
      setFocusSessions(fs.sort(byNewest((x) => x.endedAt)));
      // A focus timer that was running before a refresh keeps going
      setFocus(loadRunningFocus(userId));
      setNotes(n.sort(byNewest((x) => x.createdAt)));
      setFiles(f.sort(byNewest((x) => x.createdAt)));
      setTasks(t.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setMistakes(m.sort(byNewest((x) => x.lastWrongAt)));
      setQuizHistory(r.sort(byNewest((x) => x.completedAt)));
      setLoadError('');
      setIsLoaded(true);
    })().catch((err) => {
      console.error('Failed to load data:', err);
      if (!cancelled) setLoadError('无法读取你的资料，请检查网络后刷新页面。');
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    // Clear everything from the previous account
    setFiles([]);
    setTasks([]);
    setMistakes([]);
    setQuizHistory([]);
    setNotes([]);
    setSemesters([]);
    setEvents([]);
    setFocusSessions([]);
    setFocus(null);
    setEditingSemester(null);
    setPracticeTaskId(null);
    setIsLoaded(false);
    setActiveTab('home');
    setIsUploading(false);
    setFileForQuiz(null);
    setFileForPastYear(null);
    setFileForNotes(null);
    setActiveQuizSession(null);
    setActiveQuizResult(null);
  };

  const stats = useMemo(() => {
    // Date-based stats are only computed in the browser after data loads (not during prerender)
    if (!isLoaded) return { streakDays: 0, quizzesCompleted: 0, totalQuestionsAnswered: 0, accuracyRate: null };
    const activeDays = [
      ...quizHistory.map((r) => toDayKey(r.completedAt)),
      ...tasks.filter((t) => t.completedAt).map((t) => toDayKey(t.completedAt!)),
      ...focusSessions.map((s) => toDayKey(s.endedAt)),
    ];
    const totalQuestions = quizHistory.reduce((sum, r) => sum + r.totalQuestions, 0);
    const totalCorrect = quizHistory.reduce((sum, r) => sum + r.correctCount, 0);
    return {
      streakDays: computeStreak(activeDays),
      quizzesCompleted: quizHistory.length,
      totalQuestionsAnswered: totalQuestions,
      accuracyRate: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null,
    };
  }, [isLoaded, quizHistory, tasks, focusSessions]);

  const currentSemester = useMemo(
    () => (isLoaded ? pickCurrentSemester(semesters, todayKey()) : null),
    [isLoaded, semesters]
  );

  const persist = (action: Promise<unknown>) => {
    action.catch((err) => {
      console.error('Failed to save:', err);
      alert('保存失败，请检查网络连接。刚才的改动可能没有保存到你的账号。');
    });
  };

  // Files
  const handleAddFile = (newFile: StudyFile) => {
    setFiles((prev) => [newFile, ...prev]);
    persist(db.files.put(newFile));
  };

  const handleUpdateFile = (updated: StudyFile) => {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setFileForPastYear((prev) => (prev?.id === updated.id ? updated : prev));
    persist(db.files.put(updated));
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    persist(db.files.delete(fileId));
    // Notes belong to the file; quiz history and mistakes are kept as learning records
    const fileNotes = notes.filter((n) => n.fileId === fileId);
    setNotes((prev) => prev.filter((n) => n.fileId !== fileId));
    fileNotes.forEach((n) => persist(db.notes.delete(n.id)));
  };

  // Notes
  const handleSaveNote = (note: StudyNote) => {
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
    persist(db.notes.put(note));
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    persist(db.notes.delete(noteId));
  };

  // Tasks
  const handleSaveTask = (task: StudyTask) => {
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]));
    persist(db.tasks.put(task));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    persist(db.tasks.delete(taskId));
  };

  const handleAddTaskToPlan = (title: string, subject: string, fileId?: string) => {
    handleSaveTask({
      id: newId('task'),
      kind: 'practice',
      title,
      subject,
      fileId,
      date: todayKey(),
      semesterId: currentSemester?.id,
      source: 'manual',
      completed: false,
      createdAt: new Date().toISOString(),
    });
  };

  // Replace the AI-made, unfinished tasks of a semester from fromDate on with a new plan
  const handleApplyPlan = (semester: Semester, fromDate: string, planned: StudyTask[]) => {
    const stale = tasks.filter((t) => t.semesterId === semester.id && t.source === 'ai' && !t.completed && t.date >= fromDate);
    const staleIds = new Set(stale.map((t) => t.id));
    setTasks((prev) => [...prev.filter((t) => !staleIds.has(t.id)), ...planned]);
    stale.forEach((t) => persist(db.tasks.delete(t.id)));
    planned.forEach((t) => persist(db.tasks.put(t)));
  };

  // Semesters
  const handleSaveSemester = (semester: Semester) => {
    setSemesters((prev) => (prev.some((s) => s.id === semester.id) ? prev.map((s) => (s.id === semester.id ? semester : s)) : [...prev, semester]));
    persist(db.semesters.put(semester));
    setEditingSemester(null);
  };

  const handleDeleteSemester = (semesterId: string) => {
    setSemesters((prev) => prev.filter((s) => s.id !== semesterId));
    persist(db.semesters.delete(semesterId));
    // Unfinished plan tasks go with the semester; finished ones stay as learning records
    const unfinished = new Set(tasks.filter((t) => t.semesterId === semesterId && !t.completed).map((t) => t.id));
    setTasks((prev) => prev.filter((t) => !unfinished.has(t.id)));
    unfinished.forEach((id) => persist(db.tasks.delete(id)));
    setEditingSemester(null);
  };

  // Calendar events
  const handleSaveEvent = (event: StudyEvent) => {
    setEvents((prev) => [...prev.filter((e) => e.id !== event.id), event].sort((a, b) => a.date.localeCompare(b.date)));
    persist(db.events.put(event));
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    persist(db.events.delete(eventId));
  };

  // Focus timer
  const updateFocus = (next: RunningFocus | null) => {
    setFocus(next);
    saveRunningFocus(next);
  };

  const handleStartFocus = (req: StartFocusRequest) => {
    if (!userId) return;
    updateFocus({
      id: newId('focus'),
      userId,
      subject: req.subject,
      taskId: req.taskId,
      plannedMinutes: req.minutes,
      startedAt: new Date().toISOString(),
      accumulatedMs: 0,
      runningSince: Date.now(),
    });
  };

  const handleFocusFinished = (session: FocusSession) => {
    updateFocus(null);
    setFocusSessions((prev) => [session, ...prev]);
    persist(db.focusSessions.put(session));
    const task = session.taskId ? tasks.find((t) => t.id === session.taskId) : undefined;
    if (task && !task.completed) handleSaveTask({ ...task, completed: true, completedAt: session.endedAt });
    playChimeSound('success');
    triggerConfetti();
  };

  // Practice task: the quiz started from it completes it
  const handleStartPractice = (task: StudyTask, file: StudyFile) => {
    setPracticeTaskId(task.id);
    openFileForQuiz(file);
  };

  // Mistakes
  const handleSaveMistake = (question: QuizQuestion, config: QuizConfig) => {
    const id = mistakeIdFor(config.fileId, question.question);
    const now = new Date().toISOString();
    const existing = mistakes.find((m) => m.id === id);
    const mistake: MistakeItem = existing
      ? { ...existing, question, wrongCount: existing.wrongCount + 1, lastWrongAt: now, resolved: false }
      : {
          id,
          fileId: config.fileId,
          fileName: config.fileName,
          subject: config.subject,
          question,
          wrongCount: 1,
          firstWrongAt: now,
          lastWrongAt: now,
          resolved: false,
        };
    setMistakes((prev) => [mistake, ...prev.filter((m) => m.id !== id)]);
    persist(db.mistakes.put(mistake));
  };

  // Quiz workflow
  const handleStartQuiz = (questions: QuizQuestion[], config: QuizConfig) => {
    setFileForQuiz(null);
    setFileForPastYear(null);
    setFileForNotes(null);
    setIsUploading(false);
    setActiveQuizSession({ questions, config });
  };

  const handleQuizCompleted = (result: QuizResult) => {
    setActiveQuizSession(null);
    setActiveQuizResult(result);
    setQuizHistory((prev) => [result, ...prev]);
    persist(db.quizResults.put(result));
    const task = practiceTaskId ? tasks.find((t) => t.id === practiceTaskId) : undefined;
    if (task && !task.completed) handleSaveTask({ ...task, completed: true, completedAt: result.completedAt });
    setPracticeTaskId(null);
  };

  // The file list doesn't include the extracted text; fetch it before opening a file
  const loadFileText = async (file: StudyFile): Promise<StudyFile> => {
    if (file.textContent) return file;
    const full = await db.files.loadText(file);
    setFiles((prev) => prev.map((f) => (f.id === full.id ? full : f)));
    return full;
  };
  const openWith = (setter: (file: StudyFile) => void) => (file: StudyFile) => {
    loadFileText(file)
      .then(setter)
      .catch((err) => {
        console.error('Failed to load file:', err);
        alert('无法打开这个文件，请检查网络后重试。');
      });
  };
  const openFileForQuiz = openWith(setFileForQuiz);
  const openFileForNotes = openWith(setFileForNotes);
  const openFileForPastYear = openWith(setFileForPastYear);

  if (auth.status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#8A9E92]">Loading…</div>;
  }

  if (auth.status === 'signed-out') {
    return <AuthScreen initialError={auth.error} />;
  }

  if (auth.user.mustChangePassword || passwordMode) {
    return (
      <SetPasswordScreen
        reason={auth.user.mustChangePassword ? 'temporary' : passwordMode || 'change'}
        email={auth.user.email}
        onDone={() => {
          setPasswordMode(null);
          // A refreshed session updates mustChangePassword through onAuthStateChange
          setAuth((prev) => (prev.status === 'signed-in' ? { ...prev, user: { ...prev.user, mustChangePassword: false } } : prev));
        }}
        onCancel={passwordMode === 'change' ? () => setPasswordMode(null) : undefined}
      />
    );
  }

  if (loadError) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="max-w-sm text-center text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-4">{loadError}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F9F5] text-[#1C2B22] flex flex-col font-sans selection:bg-[#2F8F5B] selection:text-white">

      {/* Top Header Navigation (Desktop) & Bottom Navigation (Mobile) */}
      {!activeQuizSession && (
        <Navigation
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setIsUploading(false);
            setFileForQuiz(null);
            setFileForPastYear(null);
            setFileForNotes(null);
            setActiveQuizResult(null);
            setEditingSemester(null);
            setPracticeTaskId(null);
            setActiveTab(tab);
          }}
        />
      )}

      {focus && (
        <FocusTimer
          key={focus.id}
          focus={focus}
          onUpdate={updateFocus}
          onFinish={handleFocusFinished}
          onCancel={() => updateFocus(null)}
        />
      )}

      {homePracticeTask && (
        <PracticeFilePicker
          task={homePracticeTask}
          files={files}
          onClose={() => setHomePracticeTask(null)}
          onPick={(file) => {
            setHomePracticeTask(null);
            handleStartPractice(homePracticeTask, file);
          }}
          onUploadClick={() => {
            setHomePracticeTask(null);
            setIsUploading(true);
          }}
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4">

        {!isLoaded ? (
          <div className="py-24 text-center text-sm text-[#8A9E92]">Loading…</div>
        ) : editingSemester ? (
          <SemesterEditor
            key={editingSemester.semester?.id || (editingSemester.past ? 'new-past' : 'new')}
            semester={editingSemester.semester}
            startAsPast={editingSemester.past}
            subjectSuggestions={Array.from(new Set(files.map((f) => f.subject)))}
            onSave={handleSaveSemester}
            onDelete={handleDeleteSemester}
            onBack={() => setEditingSemester(null)}
          />
        ) : activeQuizSession ? (
          /* QUIZ IN PROGRESS */
          <QuizPlayer
            questions={activeQuizSession.questions}
            config={activeQuizSession.config}
            onExit={() => setActiveQuizSession(null)}
            onComplete={handleQuizCompleted}
            onSaveMistake={handleSaveMistake}
          />
        ) : activeQuizResult ? (
          /* QUIZ RESULTS */
          <QuizResultView
            result={activeQuizResult}
            onBackToHome={() => {
              setActiveQuizResult(null);
              setActiveTab('home');
            }}
            onTryAgain={() => {
              const config: QuizConfig = {
                fileId: activeQuizResult.fileId,
                fileName: activeQuizResult.fileName,
                subject: activeQuizResult.subject,
                category: activeQuizResult.category,
                questionType: 'mixed',
                difficulty: 'Normal',
                questionCount: activeQuizResult.totalQuestions,
              };
              const questions = activeQuizResult.questions.map((q) => ({
                ...q,
                userAnswer: undefined,
                isCorrect: undefined,
                aiEvaluation: undefined,
                selfAssessed: undefined,
              }));
              setActiveQuizResult(null);
              setActiveQuizSession({ questions, config });
            }}
            onAddTaskToPlan={handleAddTaskToPlan}
          />
        ) : fileForPastYear ? (
          /* PAST YEAR PAPER ANALYSIS */
          <PastYearAnalysisView
            file={fileForPastYear}
            onBack={() => setFileForPastYear(null)}
            onUpdateFile={handleUpdateFile}
            onStartExamDrill={handleStartQuiz}
          />
        ) : fileForQuiz ? (
          /* GENERATE QUIZ SETTINGS */
          <GenerateQuizModal
            file={fileForQuiz}
            onBack={() => setFileForQuiz(null)}
            onQuizGenerated={handleStartQuiz}
          />
        ) : fileForNotes ? (
          /* AI NOTES */
          <NotesView
            key={fileForNotes.id}
            file={fileForNotes}
            notes={notes.filter((n) => n.fileId === fileForNotes.id)}
            onBack={() => setFileForNotes(null)}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onGenerateQuiz={openFileForQuiz}
          />
        ) : isUploading ? (
          /* UPLOAD MATERIALS */
          <UploadScreen
            files={files}
            onBack={() => setIsUploading(false)}
            onFileReady={(file) => {
              setIsUploading(false);
              openFileForNotes(file);
            }}
            onFileReadyForPastYear={(file) => {
              setIsUploading(false);
              openFileForPastYear(file);
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
                events={events}
                onStartTask={(task) =>
                  (task.kind || 'study') === 'study'
                    ? handleStartFocus({ subject: task.subject, minutes: task.minutes || task.estimatedMinutes || 25, taskId: task.id })
                    : setHomePracticeTask(task)
                }
                onUploadClick={() => setIsUploading(true)}
                onCreateQuizClick={() => {
                  if (files.length > 0) openFileForQuiz(files[0]);
                  else setIsUploading(true);
                }}
                onMyFilesClick={() => setActiveTab('files')}
                onPlanClick={() => setActiveTab('plan')}
                onSelectFile={openFileForNotes}
                onPastYearClick={() => {
                  const pastYearFile = files.find((f) => f.category === 'past_year');
                  if (pastYearFile) openFileForPastYear(pastYearFile);
                  else setIsUploading(true);
                }}
              />
            )}

            {activeTab === 'files' && (
              <FilesScreen
                files={files}
                onUploadClick={() => setIsUploading(true)}
                onGenerateQuiz={openFileForQuiz}
                onOpenNotes={openFileForNotes}
                onSelectPastYearFile={openFileForPastYear}
                onLoadText={loadFileText}
                onDeleteFile={handleDeleteFile}
              />
            )}

            {activeTab === 'plan' && (
              <StudyPlanScreen
                semester={currentSemester}
                tasks={tasks}
                events={events}
                focusSessions={focusSessions}
                files={files}
                streakDays={stats.streakDays}
                onEditSemester={(semester) => setEditingSemester({ semester: semester || undefined })}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
                onSaveEvent={handleSaveEvent}
                onDeleteEvent={handleDeleteEvent}
                onApplyPlan={handleApplyPlan}
                onStartFocus={handleStartFocus}
                onStartPractice={handleStartPractice}
                onUploadClick={() => setIsUploading(true)}
              />
            )}

            {activeTab === 'journey' && (
              <JourneyScreen
                semesters={semesters}
                currentSemester={currentSemester}
                focusSessions={focusSessions}
                quizHistory={quizHistory}
                tasks={tasks}
                mistakes={mistakes}
                events={events}
                streakDays={stats.streakDays}
                onEditSemester={(semester) => setEditingSemester({ semester: semester || undefined })}
                onAddPastSemester={() => setEditingSemester({ past: true })}
                onOpenQuizResult={setActiveQuizResult}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                email={auth.user.email}
                isAdmin={auth.user.isAdmin}
                stats={stats}
                mistakes={mistakes}
                quizHistory={quizHistory}
                onChangePassword={() => setPasswordMode('change')}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}

      </main>

    </div>
  );
}
