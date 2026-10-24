'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { GradeLetter, Semester, SemesterCourse } from '@/types/studybub';
import { newId } from '@/lib/studybub-storage';
import { addDaysKey, todayKey } from '@/lib/dates';
import { useFormat, useI18n } from '@/lib/i18n';
import { GRADE_LETTERS, formatGpa, semesterGpa, semesterTargetGpa } from '@/lib/grades';

interface SemesterEditorProps {
  semester?: Semester; // missing = new semester
  startAsPast?: boolean; // new semester that only records results
  subjectSuggestions: string[];
  onSave: (semester: Semester) => void;
  onDelete?: (semesterId: string) => void;
  onBack: () => void;
}

const SPRINT_WEEKS = [1, 2, 3, 4, 6];
const DAILY_MINUTES = [60, 90, 120, 180, 240];

const inputClass =
  'w-full min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]';
const labelClass = 'block text-[11px] font-bold text-[#607367] mb-1';

const blankCourse = (): SemesterCourse => ({ id: newId('course'), name: '', code: '', creditHours: 3, passFail: false });

export function SemesterEditor({ semester, startAsPast, subjectSuggestions, onSave, onDelete, onBack }: SemesterEditorProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const today = todayKey();
  const [name, setName] = useState(semester?.name || '');
  const [hasPlan, setHasPlan] = useState(semester ? Boolean(semester.plan) : !startAsPast);
  const [startDate, setStartDate] = useState(semester?.plan?.startDate || today);
  const [teachingWeeks, setTeachingWeeks] = useState(semester?.plan?.teachingWeeks || 14);
  const [finalStart, setFinalStart] = useState(semester?.plan?.finalStart || addDaysKey(today, 14 * 7));
  const [finalEdited, setFinalEdited] = useState(Boolean(semester?.plan));
  const [sprintStart, setSprintStart] = useState(semester?.plan?.sprintStart || addDaysKey(finalStart, -21));
  const [dailyMinutes, setDailyMinutes] = useState(semester?.plan?.dailyMinutes || 120);
  const [targetCgpa, setTargetCgpa] = useState(semester?.targetCgpa ? String(semester.targetCgpa) : '');
  const [courses, setCourses] = useState<SemesterCourse[]>(semester?.courses.length ? semester.courses : [blankCourse()]);
  const [error, setError] = useState('');

  // Finals default to the week after classes end, until the student picks a date themselves
  const autoFinal = (start: string, weeks: number) => addDaysKey(start, Math.max(1, weeks) * 7);
  const updateSchedule = (start: string, weeks: number) => {
    setStartDate(start);
    setTeachingWeeks(weeks);
    if (!finalEdited) {
      const nextFinal = autoFinal(start, weeks);
      const sprintWeeks = Math.round((Date.parse(finalStart) - Date.parse(sprintStart)) / (7 * 86_400_000));
      setFinalStart(nextFinal);
      setSprintStart(addDaysKey(nextFinal, -7 * (SPRINT_WEEKS.includes(sprintWeeks) ? sprintWeeks : 3)));
    }
  };

  const sprintWeeksBefore = Math.round((Date.parse(finalStart) - Date.parse(sprintStart)) / (7 * 86_400_000));

  const updateCourse = (id: string, patch: Partial<SemesterCourse>) =>
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const draft: Semester = {
    id: semester?.id || 'draft',
    name,
    courses: courses.filter((c) => c.name.trim()),
    createdAt: semester?.createdAt || '',
  };

  const handleSave = () => {
    const cleaned = courses
      .map((c) => ({ ...c, name: c.name.trim(), code: c.code?.trim() || undefined, creditHours: Math.max(0, Number(c.creditHours) || 0) }))
      .filter((c) => c.name);
    if (!name.trim()) return setError(t('sem.err.name'));
    if (cleaned.length === 0) return setError(t('sem.err.subjects'));
    if (hasPlan && (!startDate || !finalStart || !sprintStart)) return setError(t('sem.err.dates'));
    if (hasPlan && finalStart <= startDate) return setError(t('sem.err.finalAfter'));
    if (hasPlan && sprintStart > finalStart) return setError(t('sem.err.sprint'));
    const target = Number(targetCgpa);
    onSave({
      id: semester?.id || newId('semester'),
      name: name.trim(),
      courses: cleaned,
      plan: hasPlan ? { startDate, teachingWeeks, finalStart, sprintStart, dailyMinutes } : undefined,
      targetCgpa: targetCgpa && target > 0 && target <= 4 ? Math.round(target * 100) / 100 : undefined,
      createdAt: semester?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={onBack} className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0]" aria-label={t('common.back')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">{semester ? t('sem.titleEdit') : t('sem.titleNew')}</h1>
          <p className="text-xs text-[#8A9E92]">{t('sem.sub')}</p>
        </div>
      </div>

      {/* Basics */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div>
          <label className={labelClass}>{t('sem.name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('sem.namePlaceholder')} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2 bg-[#EBF5F0]/60 p-1.5 rounded-2xl border border-[#DCEDE4]">
          {[
            { value: true, label: t('sem.current') },
            { value: false, label: t('sem.past') },
          ].map((o) => (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => setHasPlan(o.value)}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${hasPlan === o.value ? 'bg-[#2F8F5B] text-white shadow-sm' : 'text-[#607367]'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Schedule */}
      {hasPlan && (
        <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-[#1C2B22]">{t('sem.schedule')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('sem.firstDay')}</label>
              <input type="date" value={startDate} onChange={(e) => e.target.value && updateSchedule(e.target.value, teachingWeeks)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('sem.weeks')}</label>
              <input
                type="number"
                min={1}
                max={30}
                value={teachingWeeks}
                onChange={(e) => updateSchedule(startDate, Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('sem.finalStart')}</label>
            <input
              type="date"
              value={finalStart}
              onChange={(e) => {
                if (!e.target.value) return;
                setFinalEdited(true);
                setSprintStart(addDaysKey(e.target.value, -7 * (sprintWeeksBefore > 0 ? sprintWeeksBefore : 3)));
                setFinalStart(e.target.value);
              }}
              className={inputClass}
            />
            {finalEdited && finalStart !== autoFinal(startDate, teachingWeeks) && (
              <button
                type="button"
                onClick={() => {
                  setFinalEdited(false);
                  const f = autoFinal(startDate, teachingWeeks);
                  setFinalStart(f);
                  setSprintStart(addDaysKey(f, -7 * (sprintWeeksBefore > 0 ? sprintWeeksBefore : 3)));
                }}
                className="mt-1 text-[11px] font-bold text-[#2F8F5B]"
              >
                {t('sem.resetAuto', { date: fmt.day(autoFinal(startDate, teachingWeeks)) })}
              </button>
            )}
            <p className="text-[11px] text-[#8A9E92] mt-1">{t('sem.examsLater')}</p>
          </div>

          <div>
            <label className={labelClass}>{t('sem.sprint')}</label>
            <div className="flex flex-wrap gap-2">
              {SPRINT_WEEKS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSprintStart(addDaysKey(finalStart, -7 * w))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    sprintStart === addDaysKey(finalStart, -7 * w) ? 'bg-[#2F8F5B] text-white' : 'bg-[#F4F9F5] border border-[#E2EFE7] text-[#607367]'
                  }`}
                >
                  {w === 1 ? t('sem.weekBefore') : t('sem.weeksBefore', { n: w })}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-[#607367] whitespace-nowrap">{t('sem.orPick')}</span>
              <input type="date" value={sprintStart} max={finalStart} onChange={(e) => e.target.value && setSprintStart(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('sem.daily')}</label>
            <div className="flex flex-wrap gap-2">
              {DAILY_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMinutes(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    dailyMinutes === m ? 'bg-[#2F8F5B] text-white' : 'bg-[#F4F9F5] border border-[#E2EFE7] text-[#607367]'
                  }`}
                >
                  {m >= 60 ? t('sem.hoursN', { n: m / 60 }) : t('sem.minutesN', { n: m })}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Courses */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1C2B22]">{t('sem.subjects')}</h2>
          <span className="text-[11px] text-[#8A9E92]">{t('sem.utarScale')}</span>
        </div>
        <datalist id="subject-suggestions">
          {subjectSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        {courses.map((course, idx) => (
          <div key={course.id} className="p-3 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#2F8F5B] w-5 flex-shrink-0">{idx + 1}</span>
              <input
                value={course.name}
                list="subject-suggestions"
                onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                placeholder={t('sem.subjectName')}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setCourses((prev) => prev.filter((c) => c.id !== course.id))}
                className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 flex-shrink-0"
                title={t('sem.removeSubject')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className={labelClass}>{t('sem.code')}</label>
                <input
                  value={course.code || ''}
                  onChange={(e) => updateCourse(course.id, { code: e.target.value })}
                  placeholder="UECS1004"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('sem.credits')}</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={course.creditHours}
                  onChange={(e) => updateCourse(course.id, { creditHours: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <label className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs font-bold text-[#607367] sm:pb-2.5">
                <input
                  type="checkbox"
                  checked={course.passFail}
                  onChange={(e) => updateCourse(course.id, { passFail: e.target.checked, targetGrade: undefined, result: undefined })}
                  className="w-4 h-4 accent-[#2F8F5B]"
                />
                {t('sem.passFail')}
              </label>
              {!course.passFail && (
                <div>
                  <label className={labelClass}>{t('sem.targetGrade')}</label>
                  <select
                    value={course.targetGrade || ''}
                    onChange={(e) => updateCourse(course.id, { targetGrade: (e.target.value || undefined) as GradeLetter | undefined })}
                    className={inputClass}
                  >
                    <option value="">{t('sem.notSet')}</option>
                    {GRADE_LETTERS.filter((g) => g !== 'F').map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={course.passFail ? 'col-span-2' : ''}>
                <label className={labelClass}>{t('sem.result')}</label>
                <select
                  value={course.result || ''}
                  onChange={(e) => updateCourse(course.id, { result: (e.target.value || undefined) as SemesterCourse['result'] })}
                  className={inputClass}
                >
                  <option value="">{t('sem.notOut')}</option>
                  {course.passFail ? (
                    <>
                      <option value="P">{t('sem.pass')}</option>
                      <option value="FL">{t('sem.fail')}</option>
                    </>
                  ) : (
                    GRADE_LETTERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setCourses((prev) => [...prev, blankCourse()])}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[#C8E3D3] text-[#2F8F5B] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#EBF5F0]"
        >
          <Plus className="w-4 h-4" /> {t('sem.addSubject')}
        </button>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#EBF5F0] text-center">
            <div className="text-[11px] font-bold text-[#607367]">{t('sem.gpaActual')}</div>
            <div className="text-lg font-extrabold text-[#2F8F5B]">{formatGpa(semesterGpa(draft))}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#FFF8EC] text-center">
            <div className="text-[11px] font-bold text-[#607367]">{t('sem.gpaTarget')}</div>
            <div className="text-lg font-extrabold text-[#D97706]">{formatGpa(semesterTargetGpa(draft))}</div>
          </div>
        </div>

        {hasPlan && (
          <div>
            <label className={labelClass}>{t('sem.targetCgpa')}</label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={4}
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
              placeholder="3.50"
              className={inputClass}
            />
          </div>
        )}
      </section>

      {error && <p className="p-3 rounded-2xl bg-[#FFF8EC] border border-[#F6E3BF] text-[#7A5A1E] text-xs">{error}</p>}

      <div className="flex items-center gap-3">
        {semester && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm(t('sem.confirmDelete', { name: semester.name }))) onDelete(semester.id);
            }}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-[#8A9E92] hover:text-rose-600 hover:bg-rose-50"
          >
            {t('sem.delete')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3.5 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm shadow-lg shadow-[#2F8F5B]/25"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
