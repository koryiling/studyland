// The app language outside React (e.g. for API requests). Same storage as LanguageProvider.
import { isLang, type Lang } from '@/i18n';

export const LANG_STORAGE_KEY = 'studyland_lang';

export function currentLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}
