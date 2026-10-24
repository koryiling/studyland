'use client';

import React, { useMemo, useState } from 'react';
import { Timer, Target, Flame, GraduationCap, ChevronRight, Plus, PencilLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { FocusSession, MistakeItem, QuizResult, Semester, StudyEvent, StudyTask } from '@/types/studybub';
import { MonthCalendar } from '@/components/ui/MonthCalendar';
import { toDayKey, todayKey, weekDays } from '@/lib/dates';
import { useFormat, useI18n } from '@/lib/i18n';
import {
  cgpa,
  countedCredits,
  encouragement,
  formatGpa,
  projectedCgpa,
  semesterGpa,
  semesterTargetGpa,
} from '@/lib/grades';
import { EVENT_KINDS } from '@/components/studybub/StudyPlanScreen';

interface JourneyScreenProps {
  semesters: Semester[];
  currentSemester: Semester | null;
  focusSessions: FocusSession[];
  quizHistory: QuizResult[];
  tasks: StudyTask[];
  mistakes: MistakeItem[];
  events: StudyEvent[];
  streakDays: number;
  onEditSemester: (semester: Semester | null) => void;
  onAddPastSemester: () => void;
  onOpenQuizResult: (result: QuizResult) => void;
}

const minutesOf = (sessions: FocusSession[]) => Math.round(sessions.reduce((s, x) => s + x.focusedSeconds, 0) / 60);

// Darker green = more focused minutes that day
function intensityClass(minutes: number): string {
  if (minutes >= 120) return 'bg-[#2F8F5B]/45';
  if (minutes >= 60) return 'bg-[#2F8F5B]/30';
  if (minutes >= 30) return 'bg-[#2F8F5B]/18';
  if (minutes > 0) return 'bg-[#2F8F5B]/10';
  return '';
}

export function JourneyScreen({
  semesters,
  currentSemester,
  focusSessions,
  quizHistory,
  tasks,
  mistakes,
  events,
  streakDays,
  onEditSemester,
  onAddPastSemester,
  onOpenQuizResult,
}: JourneyScreenProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState(today);
  const [monthKey, setMonthKey] = useState(today);
  const [openSemesterId, setOpenSemesterId] = useState<string | null>(currentSemester?.id ?? null);

  // Group everything by local day once
  const byDay = useMemo(() => {
    const map = new Map<string, { focus: FocusSession[]; quizzes: QuizResult[]; mistakes: number }>();
    const get = (key: string) => {
      if (!map.has(key)) map.set(key, { focus: [], quizzes: [], mistakes: 0 });
      return map.get(key)!;
    };
    focusSessions.forEach((s) => get(toDayKey(s.endedAt)).focus.push(s));
    quizHistory.forEach((q) => get(toDayKey(q.completedAt)).quizzes.push(q));
    mistakes.forEach((m) => get(toDayKey(m.firstWrongAt)).mistakes++);
    return map;
  }, [focusSessions, quizHistory, mistakes]);

  const week = weekDays(today).map((d) => d.key);
  const weekMinutes = minutesOf(focusSessions.filter((s) => week.includes(toDayKey(s.endedAt))));
  const plan = currentSemester?.plan;
  const semesterSessions = plan ? focusSessions.filter((s) => toDayKey(s.endedAt) >= plan.startDate) : focusSessions;
  const semesterMinutes = minutesOf(semesterSessions);
  const semesterQuizzes = plan ? quizHistory.filter((q) => toDayKey(q.completedAt) >= plan.startDate) : quizHistory;
  const answered = semesterQuizzes.reduce((s, q) => s + q.totalQuestions, 0);
  const correct = semesterQuizzes.reduce((s, q) => s + q.correctCount, 0);

  // Focus per subject this semester: shows which subject is being left behind
  const subjectMinutes = useMemo(() => {
    const totals = new Map<string, number>();
    currentSemester?.courses.forEach((c) => totals.set(c.name, 0));
    semesterSessions.forEach((s) => totals.set(s.subject, (totals.get(s.subject) || 0) + s.focusedSeconds / 60));
    return [...totals.entries()].map(([subject, m]) => ({ subject, minutes: Math.round(m) })).sort((a, b) => b.minutes - a.minutes);
  }, [currentSemester, semesterSessions]);
  const maxSubject = Math.max(1, ...subjectMinutes.map((s) => s.minutes));

  const semesterTasks = currentSemester ? tasks.filter((t) => t.semesterId === currentSemester.id) : [];
  const dueTasks = semesterTasks.filter((t) => t.date <= today);
  const doneDue = dueTasks.filter((t) => t.completed).length;

  const nowCgpa = cgpa(semesters);
  const projected = currentSemester ? projectedCgpa(semesters, currentSemester) : null;
  const sortedSemesters = [...semesters].sort((a, b) => (b.plan?.startDate || b.createdAt).localeCompare(a.plan?.startDate || a.createdAt));

  const nextExam = events
    .filter((e) => e.date >= today && ['final', 'midterm', 'quiz', 'test'].includes(e.kind))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const day = byDay.get(selectedDay);
  const dayTasks = tasks.filter((t) => t.date === selectedDay);
  const dayEvents = events.filter((e) => e.date === selectedDay);

  return (
    <div className="space-y-5 pb-24 md:pb-8 animate-in fade-in duration-200">
      <div className="pt-2">
        <h1 className="text-2xl font-extrabold text-[#1C2B22]">{t('jr.title')}</h1>
        <p className="text-xs text-[#8A9E92]">{t('jr.sub')}</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Timer className="w-4 h-4" />} label={t('jr.weekFocus')} value={fmt.minutes(weekMinutes)} />
        <StatCard icon={<Timer className="w-4 h-4" />} label={plan ? t('jr.semesterFocus') : t('jr.totalFocus')} value={fmt.minutes(semesterMinutes)} />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label={t('jr.accuracy')}
          value={answered ? `${Math.round((correct / answered) * 100)}%` : '—'}
          hint={t('jr.accuracyHint', { quizzes: semesterQuizzes.length, questions: answered })}
        />
        <StatCard icon={<Flame className="w-4 h-4" />} label={t('jr.streak')} value={t(streakDays === 1 ? 'common.dayCount' : 'common.daysCount', { n: streakDays })} />
      </div>

      {(currentSemester || nextExam) && (
        <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
          {nextExam && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-rose-700">{t('jr.nextExam')}</div>
                <div className="text-sm font-extrabold text-[#1C2B22] truncate">{nextExam.title}</div>
                <div className="text-[11px] text-[#607367]">{fmt.day(nextExam.date)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-extrabold text-rose-600">{Math.max(0, Math.round((Date.parse(nextExam.date) - Date.parse(today)) / 86_400_000))}</div>
                <div className="text-[10px] font-bold text-rose-700">{t('jr.daysLeft')}</div>
              </div>
            </div>
          )}
          {currentSemester && dueTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#1C2B22]">{t('jr.planSoFar')}</span>
                <span className="font-extrabold text-[#2F8F5B]">{t('jr.planDone', { done: doneDue, total: dueTasks.length })}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#EBF5F0] overflow-hidden">
                <div className="h-full bg-[#2F8F5B] rounded-full" style={{ width: `${Math.round((doneDue / dueTasks.length) * 100)}%` }} />
              </div>
              {dueTasks.length - doneDue > 0 && (
                <p className="text-[11px] text-[#8A9E92] mt-1">{t('jr.planBehind', { n: dueTasks.length - doneDue })}</p>
              )}
            </div>
          )}
          {subjectMinutes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1C2B22]">{t('jr.perSubject')}</div>
              {subjectMinutes.map((s) => (
                <div key={s.subject} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate font-semibold text-[#607367]">{s.subject}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#EBF5F0] overflow-hidden">
                    <div className="h-full rounded-full bg-[#2F8F5B]" style={{ width: `${(s.minutes / maxSubject) * 100}%` }} />
                  </div>
                  <span className={`w-20 text-right font-bold ${s.minutes ? 'text-[#1C2B22]' : 'text-[#D97706]'}`}>{s.minutes ? fmt.minutes(s.minutes) : t('jr.notStarted')}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* GPA / CGPA */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#2F8F5B]" />
            <h2 className="text-sm font-extrabold text-[#1C2B22]">{t('jr.gpaTitle')}</h2>
          </div>
          <button onClick={onAddPastSemester} className="text-xs font-bold text-[#2F8F5B] flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> {t('jr.addPast')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#EBF5F0] text-center">
            <div className="text-[11px] font-bold text-[#607367]">{t('jr.cgpaNow')}</div>
            <div className="text-3xl font-extrabold text-[#2F8F5B]">{formatGpa(nowCgpa)}</div>
            <div className="text-[10px] text-[#8A9E92]">{t('jr.creditsCounted', { n: countedCredits(semesters) })}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFF8EC] text-center">
            <div className="text-[11px] font-bold text-[#607367]">{t('jr.cgpaProjected')}</div>
            <div className="text-3xl font-extrabold text-[#D97706]">{formatGpa(projected)}</div>
            <div className="text-[10px] text-[#8A9E92]">{currentSemester?.targetCgpa ? t('jr.target', { cgpa: currentSemester.targetCgpa.toFixed(2) }) : t('jr.byTargets')}</div>
          </div>
        </div>
        <p className="p-3 rounded-2xl bg-[#F4F9F5] text-xs text-[#1C2B22] leading-relaxed">{encouragement(semesters, currentSemester, t)}</p>

        <div className="space-y-2">
          {sortedSemesters.length === 0 && (
            <p className="text-xs text-[#8A9E92] text-center py-2">{t('jr.noSemesters')}</p>
          )}
          {sortedSemesters.map((s) => {
            const open = openSemesterId === s.id;
            const gpa = semesterGpa(s);
            return (
              <div key={s.id} className="rounded-2xl border border-[#E2EFE7] overflow-hidden">
                <button onClick={() => setOpenSemesterId(open ? null : s.id)} className="w-full p-3 flex items-center justify-between gap-3 hover:bg-[#FAFCF9]">
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-bold text-[#1C2B22] truncate">{s.name}</div>
                    <div className="text-[11px] text-[#8A9E92]">
                      {t('jr.semSubjects', { n: s.courses.length })} · {s.id === currentSemester?.id ? t('jr.semCurrent') : s.plan ? t('jr.semPlanned') : t('jr.semRecord')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#8A9E92]">{t('jr.gpa')}</div>
                      <div className="text-sm font-extrabold text-[#2F8F5B]">{gpa !== null ? formatGpa(gpa) : t('jr.targetGpa', { gpa: formatGpa(semesterTargetGpa(s)) })}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-[#8A9E92] transition-transform ${open ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {s.courses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-xl bg-[#FAFCF9]">
                        <span className="min-w-0 truncate font-semibold text-[#1C2B22]">
                          {c.code ? `${c.code} ` : ''}{c.name}
                          <span className="text-[#8A9E92] font-normal"> · {t('jr.credits', { n: c.creditHours })}</span>
                        </span>
                        <span className="flex-shrink-0 font-bold">
                          {c.passFail ? (
                            <span className="text-[#607367]">{c.result === 'P' ? t('sem.pass') : c.result === 'FL' ? t('sem.fail') : t('jr.pf')} <span className="text-[10px] text-[#8A9E92]">{t('jr.notCounted')}</span></span>
                          ) : c.result ? (
                            <span className="text-[#2F8F5B]">{c.result}</span>
                          ) : c.targetGrade ? (
                            <span className="text-[#D97706]">{t('jr.targetGrade', { grade: c.targetGrade })}</span>
                          ) : (
                            <span className="text-[#8A9E92]">—</span>
                          )}
                        </span>
                      </div>
                    ))}
                    <button onClick={() => onEditSemester(s)} className="w-full mt-1 py-2 rounded-xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold">
                      {t('jr.editSemester')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Day by day */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold text-[#1C2B22]">{t('jr.perDay')}</h2>
        <MonthCalendar
          monthKey={monthKey}
          selectedDay={selectedDay}
          today={today}
          onSelectDay={setSelectedDay}
          onChangeMonth={setMonthKey}
          dayClassName={(key) => intensityClass(minutesOf(byDay.get(key)?.focus || []))}
          renderDay={(key) => {
            const d = byDay.get(key);
            const m = minutesOf(d?.focus || []);
            return (
              <span className="text-[9px] font-bold text-[#1C2B22] leading-tight">
                {m ? `${m}m` : ''}
                {d?.quizzes.length ? ` ✏️${d.quizzes.length}` : ''}
              </span>
            );
          }}
        />
        <div className="flex items-center gap-2 text-[10px] text-[#607367] px-1">
          <span>{t('jr.lessFocus')}</span>
          {['bg-[#2F8F5B]/10', 'bg-[#2F8F5B]/18', 'bg-[#2F8F5B]/30', 'bg-[#2F8F5B]/45'].map((c) => (
            <span key={c} className={`w-4 h-4 rounded ${c}`} />
          ))}
          <span>{t('jr.moreFocus')}</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1C2B22]">{fmt.day(selectedDay)}</h3>
            <span className="text-xs font-bold text-[#2F8F5B]">{t('jr.dayFocus', { time: fmt.minutes(minutesOf(day?.focus || [])) })}</span>
          </div>

          {!day?.focus.length && !day?.quizzes.length && !dayTasks.length && !dayEvents.length && (
            <p className="text-xs text-[#8A9E92] text-center py-3">
              {selectedDay > today ? t('jr.future') : t('jr.restDay')}
            </p>
          )}

          {dayEvents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dayEvents.map((e) => (
                <span key={e.id} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${EVENT_KINDS[e.kind].chip}`}>{e.title}</span>
              ))}
            </div>
          )}

          {day && day.focus.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-[#607367]">{t('jr.focusLog')}</div>
              {day.focus
                .slice()
                .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#FAFCF9] border border-[#E2EFE7]">
                    <span className="font-bold text-[#1C2B22] truncate">{s.subject}</span>
                    <span className="text-[#607367] flex-shrink-0">
                      {fmt.time(s.startedAt)} · {fmt.minutes(s.focusedSeconds / 60)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {day && day.quizzes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-[#607367]">{t('jr.quizLog')}</div>
              {day.quizzes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onOpenQuizResult(q)}
                  className="w-full flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl bg-[#FAFCF9] border border-[#E2EFE7] hover:border-[#2F8F5B] text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-bold text-[#1C2B22] truncate">{q.fileName}</span>
                    <span className="text-[#8A9E92]">{q.subject} · {t('jr.quizScore', { correct: q.correctCount, total: q.totalQuestions })}</span>
                  </span>
                  <span className={`text-sm font-extrabold flex-shrink-0 ${q.percentage >= 70 ? 'text-[#2F8F5B]' : q.percentage >= 50 ? 'text-[#D97706]' : 'text-rose-500'}`}>
                    {q.percentage}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {dayTasks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-[#607367]">{t('jr.planLog', { done: dayTasks.filter((task) => task.completed).length, total: dayTasks.length })}</div>
              {dayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  {task.completed ? <CheckCircle2 className="w-4 h-4 text-[#2F8F5B] flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-[#C8E3D3] flex-shrink-0" />}
                  <span className={`truncate ${task.completed ? 'text-[#1C2B22]' : 'text-[#8A9E92]'}`}>
                    {(task.kind || 'study') === 'study' ? '📖' : '✏️'} {task.subject} · {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {day && day.mistakes > 0 && (
            <p className="text-xs text-[#607367] flex items-center gap-1.5">
              <PencilLine className="w-3.5 h-3.5 text-[#D97706]" /> {t('jr.newMistakes', { n: day.mistakes })}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm">
      <div className="flex items-center gap-1.5 text-[#2F8F5B] text-[11px] font-bold">
        {icon}
        <span className="text-[#607367]">{label}</span>
      </div>
      <div className="text-lg font-extrabold text-[#1C2B22] mt-1">{value}</div>
      {hint && <div className="text-[10px] text-[#8A9E92]">{hint}</div>}
    </div>
  );
}
