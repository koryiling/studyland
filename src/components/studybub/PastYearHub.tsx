'use client';

import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, UploadCloud, Layers } from 'lucide-react';
import { StudyFile, SubjectAnalysis } from '@/types/studybub';
import { subjectAnalysisId } from '@/components/studybub/PastYearAnalysisView';
import { useI18n } from '@/lib/i18n';

interface PastYearHubProps {
  files: StudyFile[];
  courses: string[]; // this semester's subjects
  analyses: SubjectAnalysis[];
  onBack: () => void;
  onOpenSubject: (subject: string) => void;
  onUpload: (subject?: string) => void;
}

// Past year analysis starts here: pick a subject, then analyse its papers together
export function PastYearHub({ files, courses, analyses, onBack, onOpenSubject, onUpload }: PastYearHubProps) {
  const { t } = useI18n();
  const papersBySubject = new Map<string, StudyFile[]>();
  for (const f of files) {
    if (f.category !== 'past_year') continue;
    papersBySubject.set(f.subject, [...(papersBySubject.get(f.subject) || []), f]);
  }
  const withPapers = [...papersBySubject.entries()].sort((a, b) => b[1].length - a[1].length);
  const withoutPapers = courses.filter((c) => !papersBySubject.has(c));

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">{t('hub.title')}</h1>
          <p className="text-xs text-[#8A9E92] mt-0.5">{t('hub.sub')}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-2">
        {(['hub.step1', 'hub.step2', 'hub.step3'] as const).map((key, i) => (
          <div key={key} className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-[#D97706] text-white text-xs font-black flex items-center justify-center">{i + 1}</div>
            <p className="text-[11px] md:text-xs font-bold text-[#92400E] mt-1.5 leading-snug">{t(key)}</p>
          </div>
        ))}
      </div>

      {withPapers.length === 0 && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] text-center space-y-3">
          <p className="text-sm text-[#607367]">{t('hub.empty')}</p>
          <button
            onClick={() => onUpload()}
            className="px-5 py-2.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-bold inline-flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" /> {t('hub.upload')}
          </button>
        </div>
      )}

      {withPapers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1C2B22]">{t('hub.pick')}</h2>
          {withPapers.map(([subject, papers]) => {
            const analysis = analyses.find((a) => a.id === subjectAnalysisId(subject));
            const few = papers.length < 3;
            return (
              <div key={subject} className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
                <button type="button" onClick={() => onOpenSubject(subject)} className="w-full flex items-center gap-3 text-left group">
                  <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#1C2B22] truncate">{subject}</div>
                    <div className="text-[11px] text-[#8A9E92] flex flex-wrap gap-x-2">
                      <span>{t('hub.papers', { n: papers.length })}</span>
                      {analysis ? (
                        <span className="text-[#2F8F5B] font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> {t('hub.analysed', { n: analysis.fileIds.length })}
                        </span>
                      ) : (
                        <span>{t('hub.notAnalysed')}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#D97706] group-hover:translate-x-1 transition-transform" />
                </button>
                {few && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                    <span className="text-[11px] text-[#92400E]">{t('hub.addMore')}</span>
                    <button
                      type="button"
                      onClick={() => onUpload(subject)}
                      className="text-[11px] font-bold text-[#D97706] inline-flex items-center gap-1 flex-shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> {t('hub.uploadMore')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => onUpload()}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[#FDE68A] text-[#D97706] text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#FFFBEB]"
          >
            <UploadCloud className="w-4 h-4" /> {t('hub.upload')}
          </button>
        </div>
      )}

      {withoutPapers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[#8A9E92]">{t('hub.noPapersYet')}</h2>
          <div className="flex flex-wrap gap-2">
            {withoutPapers.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpload(c)}
                className="px-3 py-1.5 rounded-full bg-white border border-[#E2EFE7] text-xs text-[#607367] inline-flex items-center gap-1 hover:border-[#D97706]/50"
              >
                <UploadCloud className="w-3.5 h-3.5" /> {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
