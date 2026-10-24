'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle2,
  Award,
  Loader2,
  Zap,
  Layers,
  UploadCloud,
} from 'lucide-react';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { useEstimatedProgress, ProgressBar } from '@/components/ui/AIProgress';
import { AIProviderPicker, useAIProvider } from '@/components/ui/AIProviderPicker';
import { StudyFile, QuizConfig, QuizQuestion, QuizQuestionType, PastYearAnalysis, SubjectAnalysis } from '@/types/studybub';
import {
  generateQuizFromMaterial,
  analyzePastYearPaper,
  analyzeSubjectPapers,
  combinePapers,
  AIRequestError,
} from '@/lib/studybub-ai';
import { playChimeSound } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export function subjectAnalysisId(subject: string): string {
  return `subject-${subject.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

interface PastYearAnalysisViewProps {
  file: StudyFile;
  subjectPapers: StudyFile[]; // every past year paper of this subject, including `file`
  subjectAnalysis?: SubjectAnalysis;
  onBack: () => void;
  onLoadText: (file: StudyFile) => Promise<StudyFile>;
  onUpdateFile: (file: StudyFile) => void;
  onSaveSubjectAnalysis: (analysis: SubjectAnalysis) => void;
  onStartExamDrill: (questions: QuizQuestion[], config: QuizConfig) => void;
  onReupload: () => void;
  onDoPaper: (file: StudyFile) => void;
  initialScope?: 'paper' | 'subject';
}

const DRILL_CONTEXT_CHARS = 40_000;
// More papers than this leaves too little of each one for the AI to read
export const MAX_SUBJECT_PAPERS = 5;

export function PastYearAnalysisView({
  file,
  subjectPapers,
  subjectAnalysis,
  onBack,
  onLoadText,
  onUpdateFile,
  onSaveSubjectAnalysis,
  onStartExamDrill,
  onReupload,
  onDoPaper,
  initialScope,
}: PastYearAnalysisViewProps) {
  const { t } = useI18n();
  // Oldest first (file names usually carry the year), so the AI sees how the papers change over time
  const papers = (subjectPapers.some((p) => p.id === file.id) ? subjectPapers : [file, ...subjectPapers])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const readable = papers.filter((p) => !p.extractionWarning);
  const hasSet = papers.length > 1;
  const [scope, setScope] = useState<'paper' | 'subject'>(
    hasSet && (initialScope === 'subject' || (initialScope !== 'paper' && subjectAnalysis)) ? 'subject' : 'paper'
  );
  // Which papers to analyse together: the last analysis' papers, otherwise the newest few
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const previous = (subjectAnalysis?.fileIds || []).filter((id) => readable.some((p) => p.id === id));
    return previous.length ? previous : readable.slice(-MAX_SUBJECT_PAPERS).map((p) => p.id);
  });
  const chosen = readable.filter((p) => selectedIds.includes(p.id));
  const togglePaper = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_SUBJECT_PAPERS ? prev : [...prev, id]
    );
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionType, setQuestionType] = useState<QuizQuestionType>('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [runId, setRunId] = useState(0);
  const [provider, setProvider, providerOptions] = useAIProvider();
  const isBusy = isAnalyzing || isGenerating;
  const isSubject = scope === 'subject' && hasSet;
  const percent = useEstimatedProgress(isBusy ? runId : null, {
    index: 0,
    count: 1,
    expectedMs: isAnalyzing ? (isSubject ? 55_000 : 40_000) : 35_000 + Math.ceil(questionCount / 5) * 3_000,
  });

  const analysis: PastYearAnalysis | undefined = isSubject ? subjectAnalysis?.analysis : file.pastYearAnalysis;
  const subjectStale =
    isSubject &&
    subjectAnalysis !== undefined &&
    [...subjectAnalysis.fileIds].sort().join() !== chosen.map((p) => p.id).sort().join();
  const isUnreadable = isSubject ? chosen.length === 0 : Boolean(file.extractionWarning);

  // Texts of all readable papers in the set (the file list doesn't include them)
  const loadSet = async () => {
    try {
      return await Promise.all(chosen.map(onLoadText));
    } catch {
      throw new AIRequestError(t('py.loadFailed'), 'NETWORK');
    }
  };

  const handleAnalyze = async () => {
    setRunId((r) => r + 1);
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      if (isSubject) {
        const full = await loadSet();
        const result = await analyzeSubjectPapers(full.map((p) => ({ name: p.name, text: p.textContent })), file.subject, provider);
        onSaveSubjectAnalysis({
          id: subjectAnalysisId(file.subject),
          subject: file.subject,
          fileIds: full.map((p) => p.id),
          fileNames: full.map((p) => p.name),
          analysis: result,
        });
      } else {
        const result = await analyzePastYearPaper(file.textContent, file.name, file.subject, provider);
        onUpdateFile({ ...file, pastYearAnalysis: result });
      }
      playChimeSound('success');
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : t('py.analyzeFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartSimilarDrill = async () => {
    setRunId((r) => r + 1);
    setIsGenerating(true);
    setErrorMsg('');
    playChimeSound('ping');

    const config: QuizConfig = isSubject
      ? {
          fileId: subjectAnalysisId(file.subject),
          fileName: t('py.subjectSetName', { subject: file.subject, n: chosen.length }),
          subject: file.subject,
          category: 'past_year',
          questionType,
          difficulty: 'Normal',
          questionCount,
        }
      : {
          fileId: file.id,
          fileName: file.name,
          subject: file.subject,
          category: 'past_year',
          questionType,
          difficulty: 'Normal',
          questionCount,
        };

    try {
      const text = isSubject
        ? combinePapers((await loadSet()).map((p) => ({ name: p.name, text: p.textContent })), DRILL_CONTEXT_CHARS)
        : file.textContent;
      const { questions } = await generateQuizFromMaterial(config, text, provider);
      playChimeSound('success');
      onStartExamDrill(questions, config);
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : t('py.drillFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeLabel = isSubject ? t('py.analyzeSubject', { n: chosen.length }) : t('py.analyze');

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">

      {/* Top Bar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">{t('py.title')}</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex-shrink-0">
              {t('py.badge')}
            </span>
          </div>
          <p className="text-xs text-[#8A9E92] mt-0.5">{t('py.sub')}</p>
        </div>
      </div>

      {/* Whole subject or this paper */}
      {hasSet && (
        <div className="p-4 rounded-3xl bg-white border border-[#FDE68A] shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <Layers className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1C2B22]">{t('py.papersInSubject', { subject: file.subject, n: papers.length })}</div>
              <p className="text-[11px] text-[#607367]">
                {t('py.subjectHint')}
                {readable.length < papers.length ? ` ${t('py.unreadablePapers', { n: papers.length - readable.length })}` : ''}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-[#FFFBEB] p-1.5 rounded-2xl border border-[#FDE68A]">
            {(['paper', 'subject'] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setScope(s);
                  setErrorMsg('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  scope === s ? 'bg-[#D97706] text-white shadow-sm' : 'text-[#92400E]'
                }`}
              >
                {s === 'paper' ? t('py.scopePaper') : t('py.scopeSubject', { n: papers.length })}
              </button>
            ))}
          </div>
          {isSubject && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[#92400E]">
                {t('py.choosePapers', { n: chosen.length, max: MAX_SUBJECT_PAPERS })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {papers.map((p) => {
                  const unreadable = Boolean(p.extractionWarning);
                  const on = selectedIds.includes(p.id) && !unreadable;
                  const full = !on && selectedIds.length >= MAX_SUBJECT_PAPERS;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isBusy || unreadable || full}
                      onClick={() => togglePaper(p.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:cursor-not-allowed ${
                        unreadable
                          ? 'border-amber-200 text-amber-700 line-through'
                          : on
                          ? 'border-[#D97706] bg-[#D97706] text-white font-bold'
                          : full
                          ? 'border-[#E2EFE7] text-[#B8C5BD]'
                          : 'border-[#E2EFE7] text-[#607367] hover:border-[#D97706]/50'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Info Card */}
      {!isSubject && (
        <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#1C2B22] truncate">{file.name}</h2>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#8A9E92] mt-0.5">
                <span>{file.subject}</span>
                {analysis && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-[#2F8F5B]">{analysis.examYear || t('py.pastPaper')}</span>
                    {analysis.totalQuestionsDetected > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('py.questionsFound', { n: analysis.totalQuestionsDetected })}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {analysis && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('py.analysed')}</span>
            </div>
          )}
        </div>
      )}

      {!isSubject && !file.extractionWarning && (
        <button
          onClick={() => onDoPaper(file)}
          disabled={isBusy}
          className="w-full p-4 rounded-3xl bg-white border-2 border-[#2F8F5B]/30 hover:border-[#2F8F5B] shadow-sm flex items-center gap-3 text-left transition-colors disabled:opacity-50"
        >
          <span className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-[#1C2B22]">{t('hub.doThisPaper')}</span>
            <span className="block text-[11px] text-[#607367]">{t('hub.doThisPaperSub')}</span>
          </span>
        </button>
      )}

      {!isSubject && file.readByAI && <p className="text-[11px] text-[#607367]">{t('py.scanned')}</p>}

      {!isSubject && file.extractionWarning && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
          <p>{file.extractionWarning}</p>
          {file.type === 'pdf' && (
            <button
              onClick={onReupload}
              className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold inline-flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" /> {t('py.reupload')}
            </button>
          )}
        </div>
      )}

      <div className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm">
        <AIProviderPicker value={provider} options={providerOptions} onChange={setProvider} disabled={isBusy} />
      </div>

      {errorMsg && <FriendlyNotice message={errorMsg} />}

      {subjectStale && <FriendlyNotice message={t('py.staleSubject')} />}

      {!analysis && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm text-center space-y-3">
          <p className="text-sm text-[#607367]">
            {isSubject ? t('py.notAnalysedSubject', { n: chosen.length }) : t('py.notAnalysed')}
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isBusy || isUnreadable}
            className="px-5 py-2.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            <span>{isAnalyzing ? t('py.analyzing', { pct: percent }) : analyzeLabel}</span>
          </button>
          {isAnalyzing && (
            <div className="max-w-sm mx-auto pt-1">
              <ProgressBar percent={percent} label={t('common.approxProgress')} color="#D97706" />
            </div>
          )}
        </div>
      )}

      {analysis && (
        <>
          <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B]">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">{t('py.topics')}</h3>
              {isSubject && analysis.examYear && <span className="text-[11px] text-[#8A9E92] truncate">· {analysis.examYear}</span>}
            </div>

            <div className="space-y-3">
              {analysis.highFrequencyTopics.map((topicItem, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1C2B22]">{idx + 1}. {topicItem.topic}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#2F8F5B] flex-shrink-0">{topicItem.weight}</span>
                  </div>
                  <p className="text-xs text-[#607367] leading-relaxed">{topicItem.description}</p>
                  {topicItem.examples && topicItem.examples.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-[#D97706]">{t('py.examples')}</span>
                      {topicItem.examples.map((ex, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-[#FDE68A] text-xs text-[#1C2B22] leading-relaxed">
                          {ex.source && <span className="font-bold text-[#92400E] mr-1">[{ex.source}]</span>}
                          {ex.question}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">{t('py.traps')}</h3>
              </div>
              <ul className="space-y-2 text-xs text-[#607367]">
                {analysis.commonExamTraps.map((trap, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{trap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#2F8F5B]">
                <Award className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">{t('py.tips')}</h3>
              </div>
              <ul className="space-y-2 text-xs text-[#607367]">
                {analysis.scoringStrategyTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#EBF5F0]/60 p-2.5 rounded-xl border border-[#DCEDE4]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F8F5B] mt-1.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={handleAnalyze}
              disabled={isBusy || isUnreadable}
              className="text-xs font-semibold text-[#8A9E92] hover:text-[#2F8F5B] disabled:opacity-50"
            >
              {isAnalyzing ? t('py.reanalyzing', { pct: percent }) : t('py.reanalyze')}
            </button>
          </div>
        </>
      )}

      {/* Similar-question drill */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border-2 border-[#2F8F5B]/30 shadow-md space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2F8F5B]" />
            <h3 className="text-lg font-bold text-[#1C2B22]">{t('py.drillTitle')}</h3>
          </div>
          <p className="text-xs text-[#8A9E92] mt-1">
            {isSubject ? t('py.drillSubSubject', { n: chosen.length }) : t('py.drillSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider mb-2">{t('py.drillType')}</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuizQuestionType)}
              className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs font-bold text-[#1C2B22]"
            >
              <option value="mixed">{t('quiz.type.mixed')}</option>
              <option value="mcq">{t('quiz.type.mcq')}</option>
              <option value="short">{t('quiz.type.short')}</option>
              <option value="tf">{t('quiz.type.tf')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider mb-2">{t('py.drillCount')}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    questionCount === num ? 'bg-[#2F8F5B] text-white shadow-sm' : 'bg-[#F4F9F5] text-[#607367] hover:bg-[#EBF5F0]'
                  }`}
                >
                  {t('py.drillCountN', { n: num })}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleStartSimilarDrill}
            disabled={isBusy || isUnreadable}
            className="w-full py-4 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-extrabold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('py.drillGenerating')}</span>
                <span className="tabular-nums">{percent}%</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>{t('py.drillStart', { n: questionCount })}</span>
              </>
            )}
          </button>
          {isGenerating && (
            <div className="pt-3">
              <ProgressBar percent={percent} label={t('common.approxProgress')} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
