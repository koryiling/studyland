'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles, FileText } from 'lucide-react';
import { MistakeItem } from '@/types/studybub';
import { analyzeMistakes, AIRequestError, type MistakeAnalysis } from '@/lib/studybub-ai';
import { useFormat, useI18n } from '@/lib/i18n';
import { QuestionPicture } from '@/components/ui/QuestionPicture';
import { DiagramAnswer, AnswerPhoto } from '@/components/ui/DiagramAnswer';
import { FriendlyNotice } from '@/components/ui/FriendlyNotice';

const ANALYSIS_KEY = 'studyland_mistake_analysis_v1';

type SavedAnalyses = Record<string, { count: number; analysis: MistakeAnalysis }>;

function loadSaved(): SavedAnalyses {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_KEY) || '{}') as SavedAnalyses;
  } catch {
    return {};
  }
}

function storeSaved(all: SavedAnalyses) {
  try {
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(all));
  } catch {
    // Only a convenience; the analysis can be made again
  }
}

// Turns "page:3" / "slide:2" / "Page 3" into a short place name
function sourceText(m: MistakeItem): string {
  return [m.fileName, m.question.sourceReference].filter(Boolean).join(' · ');
}

export function MistakeNotebook({ mistakes }: { mistakes: MistakeItem[] }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [subject, setSubject] = useState<string>('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<SavedAnalyses>(() => (typeof window === 'undefined' ? {} : loadSaved()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const subjects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of mistakes) counts.set(m.subject, (counts.get(m.subject) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  const shown = mistakes
    .filter((m) => !subject || m.subject === subject)
    .slice()
    .sort((a, b) => b.lastWrongAt.localeCompare(a.lastWrongAt));
  const current = subject ? saved[subject] : undefined;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAnalyze = async () => {
    if (!subject) return;
    setBusy(true);
    setError('');
    try {
      const analysis = await analyzeMistakes(subject, shown);
      const all = { ...saved, [subject]: { count: shown.length, analysis } };
      setSaved(all);
      storeSaved(all);
    } catch (err) {
      setError(err instanceof AIRequestError ? err.message : t('mb.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-10 text-[#8A9E92]">
        <p className="text-sm font-bold text-[#1C2B22]">{t('pf.noMistakes')}</p>
        <p className="text-xs mt-1">{t('pf.noMistakesSub')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subject filter */}
      <div className="flex flex-wrap gap-1.5">
        {[['', mistakes.length] as const, ...subjects].map(([s, n]) => (
          <button
            key={s || '__all'}
            type="button"
            onClick={() => {
              setSubject(s);
              setError('');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              subject === s ? 'bg-[#2F8F5B] text-white border-[#2F8F5B]' : 'bg-white text-[#607367] border-[#E2EFE7] hover:border-[#2F8F5B]/40'
            }`}
          >
            {s || t('mb.all')} · {n}
          </button>
        ))}
      </div>

      {/* AI analysis of one subject's mistakes */}
      {!subject ? (
        <p className="text-[11px] text-[#8A9E92]">{t('mb.pickSubject')}</p>
      ) : (
        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#92400E]">
              <Sparkles className="w-4 h-4" /> {t('mb.analysisTitle', { subject })}
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={busy}
              className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 flex-shrink-0"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {busy ? t('mb.analyzing') : current ? t('mb.reanalyze') : t('mb.analyze')}
            </button>
          </div>
          {error && <FriendlyNotice message={error} />}
          {!current && !busy && <p className="text-xs text-[#92400E]">{t('mb.analyzeHint', { n: shown.length })}</p>}
          {current && (
            <div className="space-y-3">
              {current.count !== shown.length && <p className="text-[11px] text-[#B45309]">{t('mb.stale')}</p>}
              {current.analysis.summary && <p className="text-xs text-[#1C2B22] leading-relaxed">{current.analysis.summary}</p>}
              <div className="space-y-2">
                {current.analysis.patterns.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white border border-[#FDE68A] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1C2B22]">{i + 1}. {p.title}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex-shrink-0">{t('mb.times', { n: p.count })}</span>
                    </div>
                    {p.why && <p className="text-[11px] text-[#607367]">{p.why}</p>}
                    {p.remember && (
                      <p className="text-[11px] text-[#2F8F5B] font-semibold">📌 {p.remember}</p>
                    )}
                  </div>
                ))}
              </div>
              {current.analysis.rememberList.length > 0 && (
                <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#C8E3D3]">
                  <div className="text-xs font-extrabold text-[#2F8F5B] mb-1">{t('mb.rememberList')}</div>
                  <ul className="space-y-1 text-[11px] text-[#1C2B22] list-disc pl-4">
                    {current.analysis.rememberList.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* The mistakes, short first; "view more" shows everything */}
      <div className="space-y-3">
        {shown.map((m) => {
          const isOpen = open.has(m.id);
          const q = m.question;
          return (
            <div key={m.id} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#2F8F5B] flex-shrink-0">{m.subject}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex-shrink-0">
                  {t('mb.times', { n: m.wrongCount })}
                </span>
              </div>
              <h4 className={`text-sm font-bold text-[#1C2B22] ${isOpen ? '' : 'line-clamp-2'}`}>{q.question}</h4>
              <p className="text-[11px] text-[#8A9E92] flex items-center gap-1 min-w-0">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{sourceText(m)}</span>
              </p>

              {isOpen && (
                <div className="space-y-2 pt-1">
                  {q.image && <QuestionPicture src={q.image} source={q.imageSource} compact />}
                  {q.userAnswer && <p className="text-xs text-rose-600">{t('pf.yourAnswer', { answer: q.userAnswer })}</p>}
                  <AnswerPhoto src={q.userAnswerImage} />
                  <p className="text-xs text-[#2F8F5B] font-semibold">{t('pf.correct', { answer: q.correctAnswer })}</p>
                  <DiagramAnswer diagram={q.diagramAnswer} />
                  {q.explanation && <p className="text-xs text-[#607367] leading-relaxed">{q.explanation}</p>}
                  {q.mustRememberRule && (
                    <p className="text-xs p-2.5 rounded-xl bg-[#EBF5F0] border border-[#C8E3D3] text-[#1C2B22]">
                      <span className="font-bold text-[#2F8F5B]">{t('result.remember')}</span> {q.mustRememberRule}
                    </p>
                  )}
                  {q.examTrapAlert && (
                    <p className="text-xs p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[#92400E]">{q.examTrapAlert}</p>
                  )}
                  <p className="text-[11px] text-[#8A9E92]">
                    {t('mb.where', { file: m.fileName, ref: q.sourceReference || q.similarOriginalQuestion || '—' })}
                    {' · '}
                    {t('mb.last', { when: fmt.relative(m.lastWrongAt) })}
                    {q.topic ? ` · ${q.topic}` : ''}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="text-xs font-bold text-[#2F8F5B] inline-flex items-center gap-1 hover:underline"
              >
                {isOpen ? (
                  <>
                    {t('mb.less')} <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    {t('mb.more')} <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
