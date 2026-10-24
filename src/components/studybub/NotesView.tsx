'use client';

import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Loader2, Trash2, NotebookPen, FileDown, FileText } from 'lucide-react';
import { exportNoteAsPdf, exportNoteAsWord } from '@/lib/note-export';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { StudyFile, StudyNote, NoteLanguage, NoteDetail } from '@/types/studybub';
import { generateNotes, AIRequestError, NotesProgress } from '@/lib/studybub-ai';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { useEstimatedProgress, ProgressBar } from '@/components/ui/AIProgress';
import { AIProviderPicker, useAIProvider } from '@/components/ui/AIProviderPicker';
import { playChimeSound } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';
import type { Lang, TFn } from '@/i18n';

const NOTE_LANGUAGES: NoteLanguage[] = ['en', 'zh', 'ms', 'zh-en'];

// Language names are shown in their own language, except the bilingual option
export function noteLanguageLabel(lang: NoteLanguage, t: TFn): string {
  return { zh: '简体中文', en: 'English', ms: 'Bahasa Melayu', 'zh-en': t('notes.lang.bilingual') }[lang];
}

export function noteDetailLabel(detail: NoteDetail, t: TFn): string {
  return t(detail === 'simple' ? 'notes.simple' : 'notes.detailed');
}

const DEFAULT_NOTE_LANGUAGE: Record<Lang, NoteLanguage> = { en: 'en', zh: 'zh', ms: 'ms' };

interface NotesViewProps {
  file: StudyFile;
  notes: StudyNote[]; // saved notes for this file, newest first
  onBack: () => void;
  onSaveNote: (note: StudyNote) => void;
  onDeleteNote: (noteId: string) => void;
  onGenerateQuiz: (file: StudyFile) => void;
}

export function NotesView({ file, notes, onBack, onSaveNote, onDeleteNote, onGenerateQuiz }: NotesViewProps) {
  const { t, lang } = useI18n();
  const fmt = useFormat();
  // Notes default to the app language
  const [language, setLanguage] = useState<NoteLanguage>(notes[0]?.language || DEFAULT_NOTE_LANGUAGE[lang]);
  const [detail, setDetail] = useState<NoteDetail>(notes[0]?.detail || 'simple');
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id || null);
  const [progress, setProgress] = useState<NotesProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [runId, setRunId] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const isGenerating = progress !== null;
  const [provider, setProvider, providerOptions] = useAIProvider();
  // Steps: one per round of sections read in parallel, plus a merge step when there is more than one section
  const sectionCount = progress?.total ?? 1;
  const parallel = progress?.parallel || 1;
  const rounds = Math.ceil(sectionCount / parallel);
  const percent = useEstimatedProgress(isGenerating ? runId : null, {
    index: progress?.stage === 'merging' ? rounds : Math.floor((progress?.done ?? 0) / parallel),
    count: rounds + (sectionCount > 1 ? 1 : 0),
    expectedMs: detail === 'detailed' ? 40_000 : 28_000,
  });
  const isUnreadable = Boolean(file.extractionWarning);
  const noteId = `note-${file.id}-${language}-${detail}`;
  const existing = notes.find((n) => n.id === noteId);
  const selected = notes.find((n) => n.id === selectedId) || notes[0];

  const handleGenerate = async () => {
    setErrorMsg('');
    setRunId((r) => r + 1);
    setProgress({ stage: 'reading', done: 0, total: 1, parallel: 1 });
    try {
      const result = await generateNotes({
        documentText: file.textContent,
        fileName: file.name,
        subject: file.subject,
        language,
        detail,
        provider,
        onProgress: setProgress,
      });
      onSaveNote({
        id: noteId,
        fileId: file.id,
        fileName: file.name,
        subject: file.subject,
        language,
        detail,
        content: result.content,
        sectionsRead: result.sectionsRead,
        sectionsTotal: result.sectionsTotal,
        createdAt: new Date().toISOString(),
      });
      setSelectedId(noteId);
      playChimeSound('success');
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : t('notes.failed'));
    } finally {
      setProgress(null);
    }
  };

  const handleExportPdf = () => {
    if (!selected) return;
    setExportMsg(exportNoteAsPdf(selected, t) ? '' : t('notes.popupBlocked'));
  };

  const handleExportWord = async () => {
    if (!selected) return;
    setExportMsg('');
    setExporting(true);
    try {
      await exportNoteAsWord(selected, t);
    } catch (err) {
      console.warn('Word export failed', err);
      setExportMsg(t('notes.wordFailed'));
    } finally {
      setExporting(false);
    }
  };

  const progressText = !progress
    ? ''
    : progress.stage === 'merging'
    ? t('notes.merging')
    : progress.total > 1
    ? t('notes.readingParts', { done: progress.done, total: progress.total })
    : t('notes.reading');

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">{t('notes.title')}</h1>
          <p className="text-xs text-[#8A9E92] truncate">{file.name} · {file.subject}</p>
        </div>
      </div>

      {file.readByAI && (
        <p className="text-[11px] text-[#607367]">{t('notes.scanned')}</p>
      )}

      {isUnreadable && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">{file.extractionWarning}</div>
      )}

      {/* Generate settings */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">{t('notes.language')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NOTE_LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isGenerating}
                onClick={() => setLanguage(option)}
                className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  language === option ? 'bg-[#2F8F5B] text-white shadow-sm' : 'bg-[#F4F9F5] text-[#607367] hover:bg-[#EBF5F0]'
                }`}
              >
                {noteLanguageLabel(option, t)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">{t('notes.detail')}</label>
          <div className="grid grid-cols-2 gap-2">
            {(['simple', 'detailed'] as NoteDetail[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={isGenerating}
                onClick={() => setDetail(d)}
                className={`p-3 rounded-2xl text-left transition-all border ${
                  detail === d ? 'bg-[#EBF5F0] border-[#2F8F5B]' : 'bg-[#F4F9F5] border-[#E2EFE7] hover:bg-[#EBF5F0]'
                }`}
              >
                <div className="text-xs font-bold text-[#1C2B22]">{noteDetailLabel(d, t)}</div>
                <div className="text-[11px] text-[#8A9E92] mt-0.5">{t(d === 'simple' ? 'notes.simpleHint' : 'notes.detailedHint')}</div>
              </button>
            ))}
          </div>
        </div>

        <AIProviderPicker value={provider} options={providerOptions} onChange={setProvider} disabled={isGenerating} />

        {errorMsg && (
          <FriendlyNotice message={errorMsg} />
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || isUnreadable}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{progressText}</span>
              <span className="tabular-nums">{percent}%</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{existing ? t('notes.regenerate') : t('notes.generate')}</span>
            </>
          )}
        </button>
        {isGenerating && (
          <div className="space-y-2">
            <ProgressBar percent={percent} label={t('common.approxProgress')} />
            <p className="text-[11px] text-center text-[#8A9E92]">{t('notes.longHint')}</p>
          </div>
        )}
      </div>

      {/* Saved notes */}
      {notes.length > 0 && selected && (
        <div className="space-y-3">
          {notes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    n.id === selected.id ? 'bg-[#2F8F5B] text-white' : 'bg-white border border-[#E2EFE7] text-[#607367] hover:bg-[#EBF5F0]'
                  }`}
                >
                  {noteLanguageLabel(n.language, t)} · {noteDetailLabel(n.detail, t)}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 md:p-7 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <NotebookPen className="w-4 h-4 text-[#2F8F5B] flex-shrink-0" />
                <span className="text-xs font-bold text-[#1C2B22] truncate">
                  {noteLanguageLabel(selected.language, t)} · {noteDetailLabel(selected.detail, t)}
                </span>
                <span className="text-[11px] text-[#8A9E92] whitespace-nowrap">{fmt.relative(selected.createdAt)}</span>
              </div>
              <button
                onClick={() => {
                  if (!confirm(t('notes.confirmDelete'))) return;
                  onDeleteNote(selected.id);
                  setSelectedId(null);
                }}
                className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title={t('notes.deleteTitle')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {selected.sectionsRead < selected.sectionsTotal && (
              <p className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {t('notes.partial', { read: selected.sectionsRead, total: selected.sectionsTotal })}
              </p>
            )}

            <MarkdownView content={selected.content} />

            <p className="text-[11px] text-[#8A9E92] pt-2 border-t border-[#E2EFE7]">
              {t('notes.footer')}
            </p>

            {/* Export */}
            <div className="pt-1 space-y-2">
              <div className="text-xs font-bold text-[#1C2B22] uppercase tracking-wider">{t('notes.export')}</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPdf}
                  className="py-2.5 px-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] hover:bg-[#EBF5F0] text-xs font-bold text-[#1C2B22] flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-4 h-4 text-[#DC2626]" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handleExportWord}
                  disabled={exporting}
                  className="py-2.5 px-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] hover:bg-[#EBF5F0] disabled:opacity-60 text-xs font-bold text-[#1C2B22] flex items-center justify-center gap-1.5"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-[#2563EB]" />}
                  <span>Word (.docx)</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8A9E92] leading-relaxed">
                {t('notes.exportHint')}
              </p>
              {exportMsg && <FriendlyNotice message={exportMsg} />}
            </div>
          </div>

          <button
            onClick={() => onGenerateQuiz(file)}
            className="w-full py-3.5 px-5 rounded-2xl bg-white border border-[#2F8F5B] text-[#2F8F5B] hover:bg-[#EBF5F0] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('notes.quiz')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
