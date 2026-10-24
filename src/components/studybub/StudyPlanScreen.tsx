'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Trash2,
  Sparkles,
  Loader2,
  BookOpen,
  PencilLine,
  CalendarPlus,
  Settings2,
  Timer,
  FileText,
  X,
} from 'lucide-react';
import { EventKind, FocusSession, Semester, StudyEvent, StudyFile, StudyTask, TaskKind } from '@/types/studybub';
import { newId } from '@/lib/studybub-storage';
import { addDaysKey, daysUntil, todayKey } from '@/lib/dates';
import { playChimeSound } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';
import type { MessageKey, TFn } from '@/i18n';
import { generateStudyPlan, AIRequestError } from '@/lib/studybub-ai';
import { MonthCalendar } from '@/components/ui/MonthCalendar';
import { FriendlyNotice } from '@/components/ui/FriendlyNotice';
import { ProgressBar, useEstimatedProgress } from '@/components/ui/AIProgress';
import { AIProviderPicker, useAIProvider } from '@/components/ui/AIProviderPicker';

export const EVENT_KINDS: Record<EventKind, { chip: string }> = {
  final: { chip: 'bg-rose-100 text-rose-700' },
  midterm: { chip: 'bg-amber-100 text-amber-800' },
  quiz: { chip: 'bg-sky-100 text-sky-700' },
  test: { chip: 'bg-violet-100 text-violet-700' },
  assignment: { chip: 'bg-slate-200 text-slate-700' },
  other: { chip: 'bg-[#EBF5F0] text-[#2F8F5B]' },
};

export function eventLabel(kind: EventKind, t: TFn): string {
  return t(`event.${kind}` as MessageKey);
}

const STUDY_MINUTES = [25, 45, 60, 90];

export interface StartFocusRequest {
  subject: string;
  minutes: number;
  taskId?: string;
}

interface StudyPlanScreenProps {
  semester: Semester | null; // the current semester (with a plan), if any
  tasks: StudyTask[];
  events: StudyEvent[];
  focusSessions: FocusSession[];
  files: StudyFile[];
  streakDays: number;
  onEditSemester: (semester: Semester | null) => void; // null = create a new one
  onSaveTask: (task: StudyTask) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveEvent: (event: StudyEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onApplyPlan: (semester: Semester, fromDate: string, tasks: StudyTask[]) => void;
  onStartFocus: (req: StartFocusRequest) => void;
  onStartPractice: (task: StudyTask, file: StudyFile) => void;
  onUploadClick: () => void;
}

// Plan range: from the sprint start (or today, if later) to the last final exam of the semester
export function planRange(semester: Semester, events: StudyEvent[], today: string) {
  const plan = semester.plan!;
  const finals = events.filter((e) => e.kind === 'final' && e.date >= plan.finalStart).map((e) => e.date);
  const end = finals.length ? finals.sort().at(-1)! : addDaysKey(plan.finalStart, 13);
  const start = plan.sprintStart > today ? plan.sprintStart : today;
  return { start, end };
}

const selectClass = 'w-full min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] font-semibold focus:outline-none focus:border-[#2F8F5B]';

export function StudyPlanScreen({
  semester,
  tasks,
  events,
  focusSessions,
  files,
  streakDays,
  onEditSemester,
  onSaveTask,
  onDeleteTask,
  onSaveEvent,
  onDeleteEvent,
  onApplyPlan,
  onStartFocus,
  onStartPractice,
  onUploadClick,
}: StudyPlanScreenProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState(today);
  const [monthKey, setMonthKey] = useState(today);
  const [form, setForm] = useState<TaskKind | 'event' | null>(null);
  const [practiceTask, setPracticeTask] = useState<StudyTask | null>(null);

  // AI plan generation
  const [planning, setPlanning] = useState(false);
  const [planRun, setPlanRun] = useState(0);
  const [planMsg, setPlanMsg] = useState('');
  const [provider, setProvider, providerOptions] = useAIProvider();
  const planPercent = useEstimatedProgress(planning ? planRun : null, { index: 0, count: 1, expectedMs: 45_000 });

  const subjects = semester?.courses.map((c) => c.name) ?? Array.from(new Set(tasks.map((t) => t.subject)));
  const plan = semester?.plan;

  const dayTasks = tasks.filter((t) => t.date === selectedDay);
  const dayEvents = events.filter((e) => e.date === selectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const dayFocusMinutes = Math.round(
    focusSessions.filter((s) => s.endedAt && toLocalKey(s.endedAt) === selectedDay).reduce((sum, s) => sum + s.focusedSeconds, 0) / 60
  );

  const semesterTasks = semester ? tasks.filter((t) => t.semesterId === semester.id) : [];
  const semesterDone = semesterTasks.filter((t) => t.completed).length;

  const handleGeneratePlan = async () => {
    if (!semester || !plan) return;
    const { start, end } = planRange(semester, events, today);
    if (end < today) {
      setPlanMsg(t('plan.examsOver'));
      return;
    }
    const existing = tasks.filter((t) => t.semesterId === semester.id && t.source === 'ai' && !t.completed && t.date >= start);
    if (existing.length && !confirm(t('plan.confirmReplace', { n: existing.length, date: fmt.day(start) }))) {
      return;
    }
    setPlanMsg('');
    setPlanRun((r) => r + 1);
    setPlanning(true);
    try {
      const planned = await generateStudyPlan(
        {
          semesterName: semester.name,
          courses: semester.courses.map((c) => ({ name: c.name, creditHours: c.creditHours, passFail: c.passFail, targetGrade: c.targetGrade })),
          events: events.filter((e) => e.date >= start && e.date <= end).map((e) => ({ date: e.date, kind: e.kind, title: e.title, subject: e.subject })),
          startDate: start,
          endDate: end,
          finalStart: plan.finalStart,
          dailyMinutes: plan.dailyMinutes,
        },
        provider
      );
      const now = new Date().toISOString();
      onApplyPlan(
        semester,
        start,
        planned.map((p) => ({
          id: newId('task'),
          kind: p.kind,
          title: p.title,
          subject: p.subject,
          date: p.date,
          minutes: p.minutes,
          semesterId: semester.id,
          source: 'ai',
          completed: false,
          createdAt: now,
        }))
      );
      playChimeSound('success');
      setSelectedDay(start);
      setMonthKey(start);
      setPlanMsg(t('plan.planned', { n: planned.length, date: fmt.day(start) }));
    } catch (err) {
      setPlanMsg(err instanceof AIRequestError ? err.message : t('plan.planFailed'));
    } finally {
      setPlanning(false);
    }
  };

  // Calendar cell decorations
  const renderDay = (key: string) => {
    const evs = events.filter((e) => e.date === key);
    const ts = tasks.filter((t) => t.date === key);
    return (
      <div className="w-full flex flex-col items-center gap-0.5">
        {evs.slice(0, 2).map((e) => (
          <span key={e.id} className={`w-full truncate rounded px-0.5 text-[8px] md:text-[9px] font-bold leading-tight ${EVENT_KINDS[e.kind].chip}`}>
            {eventLabel(e.kind, t)}
          </span>
        ))}
        {evs.length > 2 && <span className="text-[8px] text-[#8A9E92]">+{evs.length - 2}</span>}
        {ts.length > 0 && (
          <span className="flex gap-0.5">
            {ts.slice(0, 4).map((t) => (
              <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-[#2F8F5B]' : 'bg-[#C8E3D3]'}`} />
            ))}
          </span>
        )}
      </div>
    );
  };
  const dayClassName = (key: string) => {
    if (!plan) return '';
    if (key >= plan.finalStart && key <= addDaysKey(plan.finalStart, 13)) return 'bg-rose-50/60';
    if (key >= plan.sprintStart && key < plan.finalStart) return 'bg-[#EBF5F0]/70';
    return '';
  };

  const daysToFinal = plan ? daysUntil(today, plan.finalStart) : null;

  return (
    <div className="space-y-5 pb-24 md:pb-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-[#1C2B22]">{t('plan.title')}</h1>
        <button
          onClick={() => onEditSemester(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#2F8F5B] text-xs font-bold hover:bg-[#EBF5F0]"
        >
          <Plus className="w-4 h-4" /> {t('plan.newSemester')}
        </button>
      </div>

      {/* Semester card */}
      {!semester ? (
        <button
          onClick={() => onEditSemester(null)}
          className="w-full p-6 rounded-3xl bg-white border-2 border-dashed border-[#C8E3D3] hover:border-[#2F8F5B] text-center space-y-1.5 transition-all"
        >
          <div className="text-sm font-extrabold text-[#1C2B22]">{t('plan.setupTitle')}</div>
          <div className="text-xs text-[#607367] leading-relaxed">{t('plan.setupSub')}</div>
        </button>
      ) : (
        <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#2F8F5B]">{t('plan.thisSemester')}</div>
              <h2 className="text-lg font-extrabold text-[#1C2B22] truncate">{semester.name}</h2>
              {plan && (
                <p className="text-xs text-[#607367] mt-0.5">
                  {daysToFinal !== null && daysToFinal > 0
                    ? t('plan.daysToFinal', { n: daysToFinal })
                    : daysToFinal === 0
                    ? t('plan.finalToday')
                    : t('plan.finalOngoing')}
                  {' · '}
                  {t('plan.sprintFrom', { date: fmt.day(plan.sprintStart) })}
                </p>
              )}
            </div>
            <button
              onClick={() => onEditSemester(semester)}
              className="p-2 rounded-xl text-[#607367] hover:bg-[#EBF5F0] flex-shrink-0"
              title={t('plan.editSemester')}
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {semester.courses.map((c) => (
              <span key={c.id} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F4F9F5] border border-[#E2EFE7] text-[#1C2B22]">
                {c.name}
                <span className="text-[#8A9E92] font-semibold"> · {c.passFail ? t('plan.passFail') : c.targetGrade ? t('plan.target', { grade: c.targetGrade }) : t('plan.credits', { n: c.creditHours })}</span>
              </span>
            ))}
          </div>

          {semesterTasks.length > 0 && (
            <ProgressBar
              percent={Math.round((semesterDone / semesterTasks.length) * 100)}
              label={t('plan.progress', { done: semesterDone, total: semesterTasks.length })}
            />
          )}

          <AIProviderPicker value={provider} options={providerOptions} onChange={setProvider} disabled={planning} />
          <button
            onClick={handleGeneratePlan}
            disabled={planning}
            className="w-full py-3 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-[#2F8F5B]/25 flex items-center justify-center gap-2"
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{planning ? t('plan.aiPlanning', { pct: planPercent }) : semesterTasks.some((task) => task.source === 'ai') ? t('plan.aiReplan') : t('plan.aiPlan')}</span>
          </button>
          {planning && <ProgressBar percent={planPercent} label={t('common.approxProgress')} />}
          {!planning && (
            <p className="text-[11px] text-[#8A9E92] leading-relaxed">{t('plan.aiTip')}</p>
          )}
          {planMsg && <FriendlyNotice message={planMsg} />}
        </section>
      )}

      {/* Month calendar */}
      <MonthCalendar
        monthKey={monthKey}
        selectedDay={selectedDay}
        today={today}
        onSelectDay={(key) => {
          setSelectedDay(key);
          setForm(null);
        }}
        onChangeMonth={setMonthKey}
        renderDay={renderDay}
        dayClassName={dayClassName}
      />
      {plan && (
        <div className="flex flex-wrap gap-3 text-[10px] text-[#607367] -mt-2 px-1">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#EBF5F0]" /> {t('plan.legend.sprint')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-50 border border-rose-100" /> {t('plan.legend.finals')}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#2F8F5B]" /> {t('plan.legend.done')}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#C8E3D3]" /> {t('plan.legend.todo')}</span>
        </div>
      )}

      {/* Selected day */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#1C2B22]">
            {selectedDay === today ? t('plan.todayPrefix') : ''}
            {fmt.day(selectedDay)}
          </h2>
          {dayFocusMinutes > 0 && (
            <span className="text-[11px] font-bold text-[#2F8F5B] bg-[#EBF5F0] px-2.5 py-1 rounded-full">{t('plan.focused', { time: fmt.minutes(dayFocusMinutes) })}</span>
          )}
        </div>

        {dayEvents.map((e) => (
          <div key={e.id} className="p-3 rounded-2xl bg-white border border-[#E2EFE7] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${EVENT_KINDS[e.kind].chip}`}>{eventLabel(e.kind, t)}</span>
              <span className="text-sm font-bold text-[#1C2B22] truncate">{e.title}</span>
              {e.time && <span className="text-xs text-[#8A9E92] flex-shrink-0">{e.time}</span>}
            </div>
            <button onClick={() => onDeleteEvent(e.id)} className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50" title={t('plan.deleteTitle')}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {dayTasks.length === 0 && dayEvents.length === 0 && (
          <div className="p-5 rounded-3xl bg-white border border-dashed border-[#C8E3D3] text-center text-xs text-[#8A9E92]">
            {t('plan.emptyDay')}
          </div>
        )}

        {dayTasks.map((task) => {
          const kind = task.kind || 'study';
          return (
            <div key={task.id} className={`p-4 rounded-3xl border bg-white flex items-center justify-between gap-3 ${task.completed ? 'border-[#E2EFE7] opacity-80' : 'border-[#E2EFE7] shadow-sm'}`}>
              <div className="flex items-center gap-3 min-w-0">
                {task.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-[#2F8F5B] fill-[#EBF5F0] flex-shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-[#C8E3D3] flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h3 className={`text-sm font-bold truncate ${task.completed ? 'text-[#8A9E92] line-through' : 'text-[#1C2B22]'}`}>{task.title}</h3>
                  <p className="text-xs text-[#8A9E92] mt-0.5 flex items-center gap-1">
                    {kind === 'study' ? <BookOpen className="w-3 h-3" /> : <PencilLine className="w-3 h-3" />}
                    {kind === 'study' ? t('plan.study') : t('plan.practice')} · {task.subject}
                    {kind === 'study' && task.minutes ? ` · ${fmt.minutes(task.minutes)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!task.completed && (
                  <button
                    onClick={() =>
                      kind === 'study'
                        ? onStartFocus({ subject: task.subject, minutes: task.minutes || task.estimatedMinutes || 25, taskId: task.id })
                        : setPracticeTask(task)
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#EBF5F0] hover:bg-[#2F8F5B] hover:text-white text-[#2F8F5B] text-xs font-bold transition-all flex items-center gap-1"
                  >
                    {kind === 'study' ? <Timer className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                    {kind === 'study' ? t('plan.startFocus') : t('plan.startPractice')}
                  </button>
                )}
                <button onClick={() => onDeleteTask(task.id)} className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50" title={t('plan.deleteTitle')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {dayTasks.some((task) => !task.completed && (task.kind || 'study') === 'study') && (
          <p className="text-[11px] text-[#8A9E92] px-1">{t('plan.taskHint')}</p>
        )}

        {/* Add buttons */}
        {!form && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setForm('study')} className="py-2.5 rounded-2xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] text-xs font-bold text-[#1C2B22] flex items-center justify-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#2F8F5B]" /> {t('plan.study')}
            </button>
            <button onClick={() => setForm('practice')} className="py-2.5 rounded-2xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] text-xs font-bold text-[#1C2B22] flex items-center justify-center gap-1.5">
              <PencilLine className="w-4 h-4 text-[#0284C7]" /> {t('plan.practice')}
            </button>
            <button onClick={() => setForm('event')} className="py-2.5 rounded-2xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] text-xs font-bold text-[#1C2B22] flex items-center justify-center gap-1.5">
              <CalendarPlus className="w-4 h-4 text-rose-500" /> {t('plan.examEvent')}
            </button>
          </div>
        )}

        {(form === 'study' || form === 'practice') && (
          <TaskForm
            kind={form}
            day={selectedDay}
            isToday={selectedDay === today}
            subjects={subjects}
            semesterId={semester?.id}
            onCancel={() => setForm(null)}
            onSave={(task) => {
              onSaveTask(task);
              playChimeSound('success');
              setForm(null);
            }}
            onStartNow={(req) => {
              setForm(null);
              onStartFocus(req);
            }}
          />
        )}

        {form === 'event' && (
          <EventForm
            day={selectedDay}
            subjects={subjects}
            semesterId={semester?.id}
            onCancel={() => setForm(null)}
            onSave={(event) => {
              onSaveEvent(event);
              playChimeSound('success');
              setForm(null);
            }}
          />
        )}
      </section>

      {/* Streak */}
      <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1C2B22]">{t('plan.streak')}</div>
            <div className="text-xs text-[#8A9E92]">
              {streakDays > 0 ? t('plan.streakOn', { n: streakDays }) : t('plan.streakOff')}
            </div>
          </div>
        </div>
        <span className="text-sm font-extrabold text-[#D97706] bg-[#FEF3C7] px-3 py-1 rounded-full whitespace-nowrap">{t('plan.streakDays', { n: streakDays })}</span>
      </div>

      {practiceTask && (
        <PracticeFilePicker
          task={practiceTask}
          files={files}
          onClose={() => setPracticeTask(null)}
          onPick={(file) => {
            setPracticeTask(null);
            onStartPractice(practiceTask, file);
          }}
          onUploadClick={() => {
            setPracticeTask(null);
            onUploadClick();
          }}
        />
      )}
    </div>
  );
}

function toLocalKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SubjectSelect({ subjects, value, onChange }: { subjects: string[]; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [custom, setCustom] = useState(subjects.length === 0);
  if (custom) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('plan.form.subjectPlaceholder')} className={selectClass} />;
  }
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__custom') {
          setCustom(true);
          onChange('');
        } else onChange(e.target.value);
      }}
      className={selectClass}
    >
      {subjects.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
      <option value="__custom">{t('plan.form.otherSubject')}</option>
    </select>
  );
}

function TaskForm({
  kind,
  day,
  isToday,
  subjects,
  semesterId,
  onCancel,
  onSave,
  onStartNow,
}: {
  kind: TaskKind;
  day: string;
  isToday: boolean;
  subjects: string[];
  semesterId?: string;
  onCancel: () => void;
  onSave: (task: StudyTask) => void;
  onStartNow: (req: StartFocusRequest) => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [subject, setSubject] = useState(subjects[0] || '');
  const [minutes, setMinutes] = useState(45);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const build = (): StudyTask | null => {
    if (!subject.trim()) {
      setError(t('plan.form.pickSubject'));
      return null;
    }
    return {
      id: newId('task'),
      kind,
      subject: subject.trim(),
      title: title.trim() || t(kind === 'study' ? 'plan.form.defaultStudy' : 'plan.form.defaultPractice', { subject: subject.trim() }),
      minutes: kind === 'study' ? minutes : undefined,
      date: day,
      semesterId,
      source: 'manual',
      completed: false,
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <div className="p-5 rounded-3xl bg-white border-2 border-[#2F8F5B] shadow-sm space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1C2B22]">{t(kind === 'study' ? 'plan.form.study' : 'plan.form.practice')}</h3>
        <button type="button" onClick={onCancel} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">{t('common.cancel')}</button>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.form.subject')}</label>
        <SubjectSelect subjects={subjects} value={subject} onChange={setSubject} />
      </div>
      {kind === 'study' && (
        <div>
          <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.form.howLong')}</label>
          <div className="flex flex-wrap gap-2">
            {STUDY_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${minutes === m ? 'bg-[#2F8F5B] text-white' : 'bg-[#F4F9F5] border border-[#E2EFE7] text-[#607367]'}`}
              >
                {fmt.minutes(m)}
              </button>
            ))}
            <input
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Math.min(240, Math.max(5, Number(e.target.value) || 5)))}
              className="w-20 px-2 py-1.5 rounded-full bg-[#F4F9F5] border border-[#E2EFE7] text-xs font-bold text-center"
              aria-label={t('plan.form.customMinutes')}
            />
          </div>
        </div>
      )}
      <div>
        <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.form.what')}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(kind === 'study' ? 'plan.form.studyPlaceholder' : 'plan.form.practicePlaceholder')}
          className={selectClass}
        />
      </div>
      {error && <p className="text-xs text-[#7A5A1E]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {kind === 'study' && isToday && (
          <button
            type="button"
            onClick={() => {
              const task = build();
              if (!task) return;
              onSave(task);
              onStartNow({ subject: task.subject, minutes, taskId: task.id });
            }}
            className="px-4 py-2 rounded-xl bg-white border border-[#2F8F5B] text-[#2F8F5B] text-xs font-bold flex items-center gap-1"
          >
            <Timer className="w-3.5 h-3.5" /> {t('plan.form.startNow')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const task = build();
            if (task) onSave(task);
          }}
          className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
        >
          {t('plan.form.add')}
        </button>
      </div>
    </div>
  );
}

function EventForm({
  day,
  subjects,
  semesterId,
  onCancel,
  onSave,
}: {
  day: string;
  subjects: string[];
  semesterId?: string;
  onCancel: () => void;
  onSave: (event: StudyEvent) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<EventKind>('midterm');
  const [subject, setSubject] = useState(subjects[0] || '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(day);
  const [time, setTime] = useState('');

  return (
    <div className="p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-sm space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1C2B22]">{t('plan.event.title')}</h3>
        <button type="button" onClick={onCancel} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">{t('common.cancel')}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${kind === k ? `${EVENT_KINDS[k].chip} border-current` : 'bg-[#F4F9F5] border-[#E2EFE7] text-[#607367]'}`}
          >
            {eventLabel(k, t)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.form.subject')}</label>
          <SubjectSelect subjects={subjects} value={subject} onChange={setSubject} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.event.date')}</label>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={selectClass} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.event.time')}</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={selectClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-[#607367] mb-1">{t('plan.event.note')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('plan.event.notePlaceholder')} className={selectClass} />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            onSave({
              id: newId('event'),
              kind,
              subject: subject.trim() || undefined,
              title: [subject.trim() || eventLabel(kind, t), title.trim()].filter(Boolean).join(' · '),
              date,
              time: time || undefined,
              semesterId,
              createdAt: new Date().toISOString(),
            })
          }
          className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
        >
          {t('plan.event.add')}
        </button>
      </div>
    </div>
  );
}

// Which material to practise with: files whose subject or name matches come first
export function PracticeFilePicker({
  task,
  files,
  onClose,
  onPick,
  onUploadClick,
}: {
  task: StudyTask;
  files: StudyFile[];
  onClose: () => void;
  onPick: (file: StudyFile) => void;
  onUploadClick: () => void;
}) {
  const { t } = useI18n();
  const needle = task.subject.toLowerCase();
  const matches = (f: StudyFile) => f.subject.toLowerCase() === needle || f.name.toLowerCase().includes(needle);
  const sorted = [...files.filter(matches), ...files.filter((f) => !matches(f))];

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div
        className="w-full md:max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl p-5 space-y-3 animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[#1C2B22]">{t('plan.pick.title')}</h3>
            <p className="text-xs text-[#8A9E92]">{task.subject} · {task.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[#8A9E92] hover:bg-[#EBF5F0]"><X className="w-5 h-5" /></button>
        </div>
        {sorted.length === 0 ? (
          <div className="text-center space-y-2 py-4">
            <p className="text-xs text-[#607367]">{t('plan.pick.none')}</p>
            <button onClick={onUploadClick} className="px-4 py-2 rounded-xl bg-[#2F8F5B] text-white text-xs font-bold">{t('plan.pick.upload')}</button>
          </div>
        ) : (
          sorted.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className="w-full p-3 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] hover:border-[#2F8F5B] flex items-center gap-3 text-left"
            >
              <FileText className="w-5 h-5 text-[#2F8F5B] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1C2B22] truncate">{f.name}</div>
                <div className="text-[11px] text-[#8A9E92]">{f.subject}{matches(f) ? t('plan.pick.related') : ''}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
