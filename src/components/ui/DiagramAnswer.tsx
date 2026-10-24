'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

// The expected diagram for "draw a diagram" questions, drawn with plain text by the AI
export function DiagramAnswer({ diagram }: { diagram?: string }) {
  const { t } = useI18n();
  if (!diagram) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs font-bold text-[#2F8F5B]">{t('draw.expected')}</span>
      <pre className="p-3 rounded-xl bg-white border border-[#E2EFE7] text-[11px] md:text-xs leading-snug text-[#1C2B22] font-mono overflow-x-auto whitespace-pre">
        {diagram}
      </pre>
    </div>
  );
}

// The photo of the student's own drawing or handwriting
export function AnswerPhoto({ src }: { src?: string }) {
  const { t } = useI18n();
  if (!src) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs font-bold text-[#607367]">{t('draw.yourPhoto')}</span>
      <a href={src} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={t('draw.yourPhoto')} className="max-h-64 rounded-xl border border-[#E2EFE7] bg-white object-contain" />
      </a>
    </div>
  );
}

export function asksForDrawing(question: { question: string; diagramAnswer?: string }): boolean {
  return Boolean(question.diagramAnswer) || /\b(diagram|draw|sketch|illustrate|flowchart)\b|画|绘|图示|lukis|rajah/i.test(question.question);
}
