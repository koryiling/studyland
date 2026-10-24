'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { LANGS, type Lang } from '@/i18n';
import { useI18n } from '@/lib/i18n';

// Three buttons: English / 中文 / Bahasa Melayu. `onChange` lets the app also save it to the account.
export function LanguagePicker({ compact = false, onChange }: { compact?: boolean; onChange?: (lang: Lang) => void }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={compact ? 'flex items-center justify-center gap-1' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C2B22]">
          <Languages className="w-4 h-4 text-[#2F8F5B]" /> {t('lang.title')}
        </div>
      )}
      <div className={`flex gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
        {compact && <Languages className="w-4 h-4 text-[#8A9E92] self-center mr-0.5" aria-label={t('lang.title')} />}
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setLang(l.id);
              onChange?.(l.id);
            }}
            aria-pressed={lang === l.id}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              lang === l.id ? 'bg-[#2F8F5B] text-white' : 'bg-white border border-[#E2EFE7] text-[#607367] hover:bg-[#EBF5F0]'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {!compact && <p className="text-[11px] text-[#8A9E92]">{t('lang.hint')}</p>}
    </div>
  );
}
