// App languages. English is the default. Each message group (./parts) defines every key
// in English, Chinese and Malay; a missing translation is a type error, not a blank label.
import { en, zh, ms, type MessageKey } from './messages';

export type Lang = 'en' | 'zh' | 'ms';
export type { MessageKey };
export type Vars = Record<string, string | number>;
export type TFn = (key: MessageKey, vars?: Vars) => string;

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'ms', label: 'Bahasa Melayu' },
];

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, zh, ms };

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'zh' || value === 'ms';
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const text = DICTS[isLang(lang) ? lang : 'en'][key] ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
}

export function translator(lang: Lang): TFn {
  return (key, vars) => translate(lang, key, vars);
}

// For dates and numbers
export const LOCALES: Record<Lang, string> = { en: 'en-MY', zh: 'zh-CN', ms: 'ms-MY' };
