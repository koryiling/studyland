'use client';

import React, { useEffect, useState } from 'react';

// An AI request gives no progress until it finishes, so the percentage is an
// estimate: each step eases toward its end based on how long it usually takes,
// real step changes (e.g. note sections finished) jump it forward, and it never
// goes backwards or reaches 100% before the work is actually done.
export interface ProgressStep {
  index: number; // 0-based step currently running
  count: number; // total steps
  expectedMs: number; // typical duration of one step
}

const TICK_MS = 250;
const MAX_PERCENT = 99;

export function useEstimatedProgress(runId: number | null, step: ProgressStep): number {
  const [state, setState] = useState({ run: -1, pct: 0 });
  const { index, count, expectedMs } = step;

  useEffect(() => {
    if (runId === null) return;
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const withinStep = Math.min(0.95, 1 - Math.exp((-1.6 * elapsed) / expectedMs));
      const pct = Math.min(MAX_PERCENT, ((index + withinStep) / Math.max(1, count)) * 100);
      setState((prev) => ({ run: runId, pct: Math.max(prev.run === runId ? prev.pct : 0, pct) }));
    };
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [runId, index, count, expectedMs]);

  return runId !== null && state.run === runId ? Math.floor(state.pct) : 0;
}

export function ProgressBar({ percent, label, color = '#2F8F5B' }: { percent: number; label?: string; color?: string }) {
  return (
    <div className="space-y-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#607367]">
        <span className="truncate">{label}</span>
        <span className="tabular-nums font-extrabold" style={{ color }}>{percent}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#EBF5F0] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
