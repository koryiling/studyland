'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { GradeLetter, Semester, SemesterCourse } from '@/types/studybub';
import { newId } from '@/lib/studybub-storage';
import { addDaysKey, formatDayLabel, todayKey } from '@/lib/dates';
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
    if (!name.trim()) return setError('先给这个学期取个名字，例如 “Y2S1 · May 2026”。');
    if (cleaned.length === 0) return setError('至少加一个科目哦。');
    if (hasPlan && (!startDate || !finalStart || !sprintStart)) return setError('请填好开课日期、期末考日期和开始冲刺的日期。');
    if (hasPlan && finalStart <= startDate) return setError('期末考要在开课之后哦，请检查一下日期。');
    if (hasPlan && sprintStart > finalStart) return setError('开始冲刺的日期要在期末考之前。');
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
        <button onClick={onBack} className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">{semester ? '编辑学期' : '新学期设定'}</h1>
          <p className="text-xs text-[#8A9E92]">每个学期填一次，AI 会按这些资料帮你排计划</p>
        </div>
      </div>

      {/* Basics */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div>
          <label className={labelClass}>学期名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：Y2S1 · May 2026" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2 bg-[#EBF5F0]/60 p-1.5 rounded-2xl border border-[#DCEDE4]">
          {[
            { value: true, label: '现在读的学期（要排计划）' },
            { value: false, label: '已经考完（只记录成绩）' },
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
          <h2 className="text-sm font-extrabold text-[#1C2B22]">上课和考试时间</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>第一天上课</label>
              <input type="date" value={startDate} onChange={(e) => e.target.value && updateSchedule(e.target.value, teachingWeeks)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>上课几个星期</label>
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
            <label className={labelClass}>期末考开始（默认是上完课的下个星期）</label>
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
                改回自动（{formatDayLabel(autoFinal(startDate, teachingWeeks))}）
              </button>
            )}
            <p className="text-[11px] text-[#8A9E92] mt-1">每科的考试日期、Midterm、Quiz 可以之后在日历上直接加。</p>
          </div>

          <div>
            <label className={labelClass}>几时开始冲刺复习？</label>
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
                  考试前 {w} 星期
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-[#607367] whitespace-nowrap">或自己选日期</span>
              <input type="date" value={sprintStart} max={finalStart} onChange={(e) => e.target.value && setSprintStart(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>冲刺期间每天大概可以读多久？</label>
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
                  {m >= 60 ? `${m / 60} 小时` : `${m} 分钟`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Courses */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#1C2B22]">科目</h2>
          <span className="text-[11px] text-[#8A9E92]">UTAR 计分：A+/A 4.00 · A- 3.67 · B+ 3.33 …</span>
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
                placeholder="科目名称"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setCourses((prev) => prev.filter((c) => c.id !== course.id))}
                className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 flex-shrink-0"
                title="删除科目"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className={labelClass}>代码（可不填）</label>
                <input
                  value={course.code || ''}
                  onChange={(e) => updateCourse(course.id, { code: e.target.value })}
                  placeholder="UECS1004"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>学分</label>
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
                Pass / Fail（不算 CGPA）
              </label>
              {!course.passFail && (
                <div>
                  <label className={labelClass}>目标成绩</label>
                  <select
                    value={course.targetGrade || ''}
                    onChange={(e) => updateCourse(course.id, { targetGrade: (e.target.value || undefined) as GradeLetter | undefined })}
                    className={inputClass}
                  >
                    <option value="">还没定</option>
                    {GRADE_LETTERS.filter((g) => g !== 'F').map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={course.passFail ? 'col-span-2' : ''}>
                <label className={labelClass}>真实成绩</label>
                <select
                  value={course.result || ''}
                  onChange={(e) => updateCourse(course.id, { result: (e.target.value || undefined) as SemesterCourse['result'] })}
                  className={inputClass}
                >
                  <option value="">还没出</option>
                  {course.passFail ? (
                    <>
                      <option value="P">Pass</option>
                      <option value="FL">Fail</option>
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
          <Plus className="w-4 h-4" /> 加一个科目
        </button>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#EBF5F0] text-center">
            <div className="text-[11px] font-bold text-[#607367]">这学期 GPA（真实成绩）</div>
            <div className="text-lg font-extrabold text-[#2F8F5B]">{formatGpa(semesterGpa(draft))}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#FFF8EC] text-center">
            <div className="text-[11px] font-bold text-[#607367]">照目标成绩的 GPA</div>
            <div className="text-lg font-extrabold text-[#D97706]">{formatGpa(semesterTargetGpa(draft))}</div>
          </div>
        </div>

        {hasPlan && (
          <div>
            <label className={labelClass}>目标 CGPA（可不填）</label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={4}
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
              placeholder="例如 3.50"
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
              if (confirm(`确定要删除「${semester.name}」吗？这个学期的成绩记录会一起删除。`)) onDelete(semester.id);
            }}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-[#8A9E92] hover:text-rose-600 hover:bg-rose-50"
          >
            删除学期
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3.5 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm shadow-lg shadow-[#2F8F5B]/25"
        >
          保存
        </button>
      </div>
    </div>
  );
}
