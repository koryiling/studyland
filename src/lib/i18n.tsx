'use client';

// The chosen language lives in localStorage (works before sign-in) and is copied to the
// account so it follows the student to other devices.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { isLang, translator, LOCALES, type Lang, type TFn } from '@/i18n';
import { formatDayLabel, formatDuration, formatRelative } from '@/lib/dates';
import { formatMinutes } from '@/lib/focus';
import { LANG_STORAGE_KEY as KEY, currentLang } from '@/lib/i18n-store';

const listeners = new Set<() => void>();

const readLang = currentLang;

// True once the student picked a language on this device (then it wins over the account's)
export function hasStoredLang(): boolean {
  try {
    return isLang(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function storeLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Storage blocked: the choice still applies until the page is closed
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

interface I18nValue {
  lang: Lang;
  t: TFn;
  locale: string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // English on the server and during hydration; the stored choice right after
  const lang = useSyncExternalStore(subscribe, readLang, () => 'en' as Lang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => storeLang(next), []);
  const value = useMemo(() => ({ lang, t: translator(lang), locale: LOCALES[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}

// Dates, durations and minutes in the current language
export function useFormat() {
  const { t, locale } = useI18n();
  return useMemo(
    () => ({
      relative: (iso: string) => formatRelative(iso, t, locale),
      duration: (seconds: number) => formatDuration(seconds, t),
      day: (key: string) => formatDayLabel(key, locale),
      minutes: (minutes: number) => formatMinutes(minutes, t),
      time: (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      month: (date: Date) => date.toLocaleDateString(locale, { year: 'numeric', month: 'long' }),
    }),
    [t, locale]
  );
}
