'use client';

import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Loader2, Trash2, NotebookPen } from 'lucide-react';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { StudyFile, StudyNote, NoteLanguage, NoteDetail } from '@/types/studybub';
import { generateNotes, AIRequestError, NotesProgress } from '@/lib/studybub-ai';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { formatRelative } from '@/lib/dates';
import { playChimeSound } from '@/lib/utils';

export const LANGUAGE_LABELS: Record<NoteLanguage, string> = {
  zh: '简体中文',
  en: 'English',
  ms: 'Bahasa Melayu',
  'zh-en': '中英双语',
};

export const DETAIL_LABELS: Record<NoteDetail, { label: string; hint: string }> = {
  simple: { label: 'Simple 简易', hint: '重点、定义和关键词，方便快速复习' },
  detailed: { label: 'Detailed 详细', hint: '完整解释、步骤、例子和考试重点' },
};

interface NotesViewProps {
  file: StudyFile;
  notes: StudyNote[]; // saved notes for this file, newest first
  onBack: () => void;
  onSaveNote: (note: StudyNote) => void;
  onDeleteNote: (noteId: string) => void;
  onGenerateQuiz: (file: StudyFile) => void;
}

export function NotesView({ file, notes, onBack, onSaveNote, onDeleteNote, onGenerateQuiz }: NotesViewProps) {
  const [language, setLanguage] = useState<NoteLanguage>(notes[0]?.language || 'zh');
  const [detail, setDetail] = useState<NoteDetail>(notes[0]?.detail || 'simple');
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id || null);
  const [progress, setProgress] = useState<NotesProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isGenerating = progress !== null;
  const isUnreadable = Boolean(file.extractionWarning);
  const noteId = `note-${file.id}-${language}-${detail}`;
  const existing = notes.find((n) => n.id === noteId);
  const selected = notes.find((n) => n.id === selectedId) || notes[0];

  const handleGenerate = async () => {
    setErrorMsg('');
    setProgress({ stage: 'reading', current: 1, total: 1 });
    try {
      const result = await generateNotes({
        documentText: file.textContent,
        fileName: file.name,
        subject: file.subject,
        language,
        detail,
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
      setErrorMsg(err instanceof AIRequestError ? err.message : '这次没能写出笔记，请再试一次。');
    } finally {
      setProgress(null);
    }
  };

  const progressText = !progress
    ? ''
    : progress.stage === 'merging'
    ? '正在把各部分整理成完整笔记…'
    : progress.total > 1
    ? `AI 正在阅读第 ${progress.current} / ${progress.total} 部分…`
    : 'AI 正在阅读资料并整理笔记…';

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">AI Notes</h1>
          <p className="text-xs text-[#8A9E92] truncate">{file.name} · {file.subject}</p>
        </div>
      </div>

      {isUnreadable && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">{file.extractionWarning}</div>
      )}

      {/* Generate settings */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">Language 语言</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(LANGUAGE_LABELS) as NoteLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                disabled={isGenerating}
                onClick={() => setLanguage(lang)}
                className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  language === lang ? 'bg-[#2F8F5B] text-white shadow-sm' : 'bg-[#F4F9F5] text-[#607367] hover:bg-[#EBF5F0]'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">Detail 详细程度</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DETAIL_LABELS) as NoteDetail[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={isGenerating}
                onClick={() => setDetail(d)}
                className={`p-3 rounded-2xl text-left transition-all border ${
                  detail === d ? 'bg-[#EBF5F0] border-[#2F8F5B]' : 'bg-[#F4F9F5] border-[#E2EFE7] hover:bg-[#EBF5F0]'
                }`}
              >
                <div className="text-xs font-bold text-[#1C2B22]">{DETAIL_LABELS[d].label}</div>
                <div className="text-[11px] text-[#8A9E92] mt-0.5">{DETAIL_LABELS[d].hint}</div>
              </button>
            ))}
          </div>
        </div>

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
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{existing ? '重新生成这份笔记' : '生成 AI 笔记'}</span>
            </>
          )}
        </button>
        {isGenerating && (
          <p className="text-[11px] text-center text-[#8A9E92]">长文件需要多一点时间，可以先去做别的，笔记生成后会自动保存。</p>
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
                  {LANGUAGE_LABELS[n.language]} · {DETAIL_LABELS[n.detail].label}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 md:p-7 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <NotebookPen className="w-4 h-4 text-[#2F8F5B] flex-shrink-0" />
                <span className="text-xs font-bold text-[#1C2B22] truncate">
                  {LANGUAGE_LABELS[selected.language]} · {DETAIL_LABELS[selected.detail].label}
                </span>
                <span className="text-[11px] text-[#8A9E92] whitespace-nowrap">{formatRelative(selected.createdAt)}</span>
              </div>
              <button
                onClick={() => {
                  if (!confirm('确定要删除这份笔记吗？')) return;
                  onDeleteNote(selected.id);
                  setSelectedId(null);
                }}
                className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {selected.sectionsRead < selected.sectionsTotal && (
              <p className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                这份资料很长，这份笔记只涵盖了前 {selected.sectionsRead} / {selected.sectionsTotal} 部分。
              </p>
            )}

            <MarkdownView content={selected.content} />

            <p className="text-[11px] text-[#8A9E92] pt-2 border-t border-[#E2EFE7]">
              笔记由 AI 根据你的资料整理，括号里的页码可以帮你回到原资料核对。
            </p>
          </div>

          <button
            onClick={() => onGenerateQuiz(file)}
            className="w-full py-3.5 px-5 rounded-2xl bg-white border border-[#2F8F5B] text-[#2F8F5B] hover:bg-[#EBF5F0] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Quiz 用这份资料出题</span>
          </button>
        </div>
      )}
    </div>
  );
}
