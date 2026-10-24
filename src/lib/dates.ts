import type { TFn } from '@/i18n';

// Calendar-day helpers. Day keys use the student's local time zone ("YYYY-MM-DD"),
// so a quiz finished at 11pm counts for that evening, not the next UTC day.

export function toDayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDayKey(new Date());
}

// Monday-first week containing the given day
export function weekDays(anchorKey: string): Array<{ key: string; weekday: string; date: number }> {
  const anchor = fromDayKey(anchorKey);
  const offset = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return {
      key: toDayKey(d),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
    };
  });
}

// Consecutive days with activity, ending today (or yesterday, so the streak
// isn't shown as broken before the student has studied today).
export function computeStreak(activeDayKeys: Iterable<string>): number {
  const days = new Set(activeDayKeys);
  const cursor = new Date();
  if (!days.has(toDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatRelative(iso: string, t: TFn, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t('time.daysAgo', { n: days });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatDuration(totalSeconds: number, t: TFn): string {
  return t('common.durationShort', { m: Math.floor(totalSeconds / 60), s: totalSeconds % 60 });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function addDaysKey(key: string, days: number): string {
  const d = fromDayKey(key);
  return toDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function daysUntil(fromKey: string, toKey: string): number {
  return Math.round((fromDayKey(toKey).getTime() - fromDayKey(fromKey).getTime()) / 86_400_000);
}

export function formatDayLabel(key: string, locale: string): string {
  return fromDayKey(key).toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' });
}
