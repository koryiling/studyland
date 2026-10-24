'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, X, CheckCircle2 } from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { FocusSession } from '@/types/studybub';
import {
  RunningFocus,
  OVERTIME_CAP_MS,
  countedMs,
  elapsedMs,
  plannedMs,
  pause,
  resume,
  formatClock,
} from '@/lib/focus';
import { playChimeSound, triggerConfetti } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';

interface FocusTimerProps {
  focus: RunningFocus;
  onUpdate: (focus: RunningFocus) => void;
  onFinish: (session: FocusSession) => void;
  onCancel: () => void;
}

const RING = 2 * Math.PI * 88;

export function FocusTimer({ focus, onUpdate, onFinish, onCancel }: FocusTimerProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [now, setNow] = useState<number | null>(null);
  const celebrated = useRef(false);
  const finished = useRef(false);

  const finish = (at: number) => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      id: focus.id,
      subject: focus.subject,
      taskId: focus.taskId,
      plannedMinutes: focus.plannedMinutes,
      focusedSeconds: Math.round(countedMs(focus, at) / 1000),
      startedAt: focus.startedAt,
      endedAt: new Date(at).toISOString(),
    });
  };

  // Tick once a second; time itself always comes from timestamps
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const elapsed = elapsedMs(focus, t);
      if (!celebrated.current && elapsed >= plannedMs(focus)) {
        celebrated.current = true;
        playChimeSound('complete');
        triggerConfetti();
      }
      // Overtime is capped: stop counting and save automatically
      if (elapsed >= plannedMs(focus) + OVERTIME_CAP_MS) finish(t);
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
    // finish only reads the latest focus through closure; re-run when focus changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const elapsed = now === null ? focus.accumulatedMs : elapsedMs(focus, now);
  const planned = plannedMs(focus);
  const done = elapsed >= planned;
  const overtime = Math.min(elapsed - planned, OVERTIME_CAP_MS);
  const ratio = Math.min(1, elapsed / planned);
  const paused = focus.runningSince === null;

  const handleStop = () => {
    if (done) {
      finish(Date.now());
      return;
    }
    if (confirm(t('focus.confirmEarly'))) onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F9F5] flex flex-col items-center justify-center px-4 animate-in fade-in duration-200 motion-reduce:animate-none">
      <button
        onClick={handleStop}
        className="absolute top-4 right-4 p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#607367] hover:bg-[#EBF5F0]"
        title={t('focus.end')}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="text-center space-y-1 mb-6">
        <div className="text-xs font-bold text-[#2F8F5B] uppercase tracking-wider">{t('focus.mode')}</div>
        <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">{focus.subject}</h1>
        <p className="text-xs text-[#8A9E92]">{t('focus.goal', { time: fmt.minutes(focus.plannedMinutes) })}</p>
      </div>

      <div className="relative w-56 h-56 md:w-64 md:h-64">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#E2EFE7" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={done ? '#D97706' : '#2F8F5B'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - ratio)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {done ? (
            <>
              <StudyBubMascot mood="happy" size={70} />
              <div className="text-sm font-extrabold text-[#2F8F5B] mt-1">{t('focus.done')}</div>
              <div className="text-xs text-[#D97706] font-bold tabular-nums">{t('focus.overtime', { time: formatClock(overtime) })}</div>
            </>
          ) : (
            <>
              <div className="text-4xl md:text-5xl font-extrabold text-[#1C2B22] tabular-nums">{formatClock(planned - elapsed)}</div>
              <div className="text-xs text-[#8A9E92] mt-1">{paused ? t('focus.paused') : t('focus.keepGoing')}</div>
            </>
          )}
        </div>
      </div>

      {done && (
        <p className="mt-5 max-w-xs text-center text-xs text-[#607367] leading-relaxed">
          {t('focus.doneHint')}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {!done && (
          <button
            onClick={() => onUpdate(paused ? resume(focus, Date.now()) : pause(focus, Date.now()))}
            className="px-5 py-3 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] font-bold text-sm flex items-center gap-2 hover:bg-[#EBF5F0]"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{paused ? t('focus.resume') : t('focus.pause')}</span>
          </button>
        )}
        <button
          onClick={handleStop}
          className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 ${
            done ? 'bg-[#2F8F5B] hover:bg-[#26774B] text-white shadow-lg shadow-[#2F8F5B]/25' : 'bg-white border border-[#E2EFE7] text-[#8A9E92] hover:text-[#1C2B22]'
          }`}
        >
          {done && <CheckCircle2 className="w-4 h-4" />}
          <span>{done ? t('focus.finish') : t('focus.stopEarly')}</span>
        </button>
      </div>
    </div>
  );
}
