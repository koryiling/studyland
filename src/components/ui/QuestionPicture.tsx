'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { TFn } from '@/i18n';

// "page:3" -> "Page 3" in the app language
export function pictureLabel(source: string | undefined, t: TFn): string {
  const [kind, n] = (source || '').split(':');
  if (kind === 'page') return t('pic.page', { n });
  if (kind === 'slide') return t('pic.slide', { n });
  if (kind === 'image') return t('pic.image', { n });
  return '';
}

// The picture of a picture question, shown above the question; tap to enlarge
export function QuestionPicture({ src, source, compact = false }: { src: string; source?: string; compact?: boolean }) {
  const { t } = useI18n();
  const [big, setBig] = useState(false);
  const label = pictureLabel(source, t);
  return (
    <figure className="space-y-1">
      <button
        type="button"
        onClick={() => setBig(!big)}
        className="block w-full rounded-2xl border border-[#E2EFE7] bg-white overflow-hidden"
        title={big ? t('pic.shrink') : t('pic.zoom')}
      >
        {/* A data URL picture from the student's own file; next/image adds nothing here */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={t('pic.alt')}
          className={`w-full object-contain ${big ? '' : compact ? 'max-h-40' : 'max-h-[360px]'}`}
        />
      </button>
      {label && <figcaption className="text-[11px] text-[#8A9E92]">{t('pic.from', { where: label })}</figcaption>}
    </figure>
  );
}
