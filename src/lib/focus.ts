import type { TFn } from '@/i18n';

// Focus timer state. Time is computed from timestamps (not by counting ticks), so it stays
// correct when the tab sleeps, and the running timer survives a page refresh via localStorage.

export const OVERTIME_CAP_MS = 30 * 60_000;
const KEY = 'studyland_focus_v1';

export interface RunningFocus {
  id: string;
  userId: string;
  subject: string;
  taskId?: string;
  plannedMinutes: number;
  startedAt: string; // ISO timestamp
  accumulatedMs: number; // focused time before the current running stretch
  runningSince: number | null; // epoch ms, null while paused
}

export function elapsedMs(focus: RunningFocus, now: number): number {
  return focus.accumulatedMs + (focus.runningSince !== null ? Math.max(0, now - focus.runningSince) : 0);
}

export function plannedMs(focus: RunningFocus): number {
  return focus.plannedMinutes * 60_000;
}

// Focused time that counts: planned time plus overtime, overtime capped at 30 minutes
export function countedMs(focus: RunningFocus, now: number): number {
  return Math.min(elapsedMs(focus, now), plannedMs(focus) + OVERTIME_CAP_MS);
}

export function pause(focus: RunningFocus, now: number): RunningFocus {
  if (focus.runningSince === null) return focus;
  return { ...focus, accumulatedMs: elapsedMs(focus, now), runningSince: null };
}

export function resume(focus: RunningFocus, now: number): RunningFocus {
  return focus.runningSince === null ? { ...focus, runningSince: now } : focus;
}

export function loadRunningFocus(userId: string): RunningFocus | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunningFocus;
    return parsed.userId === userId && parsed.plannedMinutes > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveRunningFocus(focus: RunningFocus | null): void {
  try {
    if (focus) localStorage.setItem(KEY, JSON.stringify(focus));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode): the timer still works, it just won't survive a refresh
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatMinutes(totalMinutes: number, t: TFn): string {
  const m = Math.round(totalMinutes);
  if (m < 60) return t('common.minutes', { n: m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? t('common.hoursMinutes', { h, m: rest }) : t('common.hours', { h });
}
