'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Eye,
  CheckCircle2,
  AlertTriangle,
  NotebookPen,
  X
} from 'lucide-react';
import { StudyFile } from '@/types/studybub';
import { formatBytes } from '@/lib/dates';
import { playChimeSound } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';

type FileFilter = 'All' | 'past_year' | 'pdf' | 'pptx' | 'docx';

interface FilesScreenProps {
  files: StudyFile[];
  subjects: string[]; // this semester's subjects, offered when moving a file
  onUploadClick: () => void;
  onGenerateQuiz: (file: StudyFile) => void;
  onOpenNotes: (file: StudyFile) => void;
  onSelectPastYearFile?: (file: StudyFile) => void;
  onLoadText: (file: StudyFile) => Promise<StudyFile>;
  onUpdateFile: (file: StudyFile) => void;
  onDeleteFile: (fileId: string) => void;
}

const ALL_SUBJECTS = '__all';
const NEW_SUBJECT = '__new';

export function FilesScreen({
  files,
  subjects,
  onUploadClick,
  onGenerateQuiz,
  onOpenNotes,
  onSelectPastYearFile,
  onLoadText,
  onUpdateFile,
  onDeleteFile
}: FilesScreenProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [filter, setFilter] = useState<FileFilter>('All');
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS);
  const [previewFile, setPreviewFile] = useState<StudyFile | null>(null);

  // Subjects that have files, most files first
  const counts = new Map<string, number>();
  files.forEach((f) => counts.set(f.subject, (counts.get(f.subject) || 0) + 1));
  const fileSubjects = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const subjectChoices = Array.from(new Set([...subjects, ...fileSubjects]));

  const filteredFiles = files.filter((f) => {
    if (subjectFilter !== ALL_SUBJECTS && f.subject !== subjectFilter) return false;
    if (filter === 'All') return true;
    if (filter === 'past_year') return f.category === 'past_year';
    return f.type === filter;
  });

  const chip = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
      active ? 'bg-[#2F8F5B] text-white shadow-sm' : 'bg-white border border-[#E2EFE7] text-[#607367] hover:bg-[#EBF5F0]'
    }`;

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-[#1C2B22]">{t('files.title')}</h1>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('files.upload')}</span>
        </button>
      </div>

      {/* Subject filter */}
      {fileSubjects.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSubjectFilter(ALL_SUBJECTS)} className={chip(subjectFilter === ALL_SUBJECTS)}>
            {t('files.allSubjects')}
          </button>
          {fileSubjects.map((s) => (
            <button key={s} onClick={() => setSubjectFilter(s)} className={chip(subjectFilter === s)}>
              {s} <span className="opacity-70">· {counts.get(s)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { id: 'All', label: t('files.filter.all') },
          { id: 'past_year', label: t('files.filter.pastYear') },
          { id: 'pdf', label: 'PDF' },
          { id: 'pptx', label: 'PPTX' },
          { id: 'docx', label: 'DOCX' },
        ] as Array<{ id: FileFilter; label: string }>).map((tab) => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} className={chip(filter === tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-white border border-[#E2EFE7] p-8 text-[#8A9E92] space-y-3">
            <FileText className="w-10 h-10 text-[#C8E3D3] mx-auto" />
            <p className="text-sm font-bold text-[#1C2B22]">{files.length === 0 ? t('files.empty') : t('files.emptyFilter')}</p>
            <button onClick={onUploadClick} className="text-xs font-bold text-[#2F8F5B] hover:underline">
              {t('files.uploadNow')}
            </button>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-4 md:p-5 rounded-3xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  file.type === 'pdf'
                    ? 'bg-[#FEE2E2] text-[#DC2626]'
                    : file.type === 'pptx'
                    ? 'bg-[#FFEDD5] text-[#EA580C]'
                    : 'bg-[#DBEAFE] text-[#2563EB]'
                }`}>
                  {file.type.toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-bold text-[#1C2B22] truncate">{file.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8A9E92] mt-0.5">
                    {/* The subject can be changed right here */}
                    <select
                      value={file.subject}
                      onChange={(e) => {
                        const next = e.target.value === NEW_SUBJECT ? window.prompt(t('upload.subjectNewPlaceholder'))?.trim() : e.target.value;
                        if (next && next !== file.subject) onUpdateFile({ ...file, subject: next });
                      }}
                      aria-label={t('files.subjectLabel')}
                      className="max-w-[160px] truncate px-2 py-0.5 rounded-lg bg-[#EBF5F0] text-[#2F8F5B] font-bold border-0 focus:outline-none cursor-pointer"
                    >
                      {Array.from(new Set([file.subject, ...subjectChoices, 'General'])).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value={NEW_SUBJECT}>{t('upload.subjectNew')}</option>
                    </select>
                    <span>{fmt.relative(file.createdAt)}</span>
                    <span>•</span>
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>•</span>
                    {file.extractionWarning ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1" title={file.extractionWarning}>
                        <AlertTriangle className="w-3.5 h-3.5" /> {t('files.noText')}
                      </span>
                    ) : (
                      <span className="text-[#2F8F5B] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {file.readByAI ? t('files.scanned') : t('files.ready')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  onClick={() => {
                    onLoadText(file)
                      .then(setPreviewFile)
                      .catch(() => alert(t('common.openFileFailed')));
                  }}
                  className="p-2 rounded-xl bg-[#F4F9F5] hover:bg-[#EBF5F0] text-[#607367] hover:text-[#1C2B22] text-xs font-semibold transition-colors"
                  title={t('files.preview')}
                  data-testid="preview-file"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {file.category === 'past_year' && onSelectPastYearFile && (
                  <button
                    onClick={() => onSelectPastYearFile(file)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold shadow-sm shadow-[#F59E0B]/20 transition-all"
                  >
                    <span>🎯</span>
                    <span>{t('files.analyze')}</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenNotes(file)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EBF5F0] hover:bg-[#DCEDE4] text-[#2F8F5B] text-xs font-bold transition-all"
                >
                  <NotebookPen className="w-3.5 h-3.5" />
                  <span>{t('files.notes')}</span>
                </button>

                <button
                  onClick={() => onGenerateQuiz(file)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-sm shadow-[#2F8F5B]/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('files.quiz')}</span>
                </button>

                <button
                  onClick={() => {
                    if (!confirm(t('files.confirmDelete', { name: file.name }))) return;
                    onDeleteFile(file.id);
                    playChimeSound('ping');
                  }}
                  className="p-2 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title={t('files.deleteTitle')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Text Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E2EFE7]">
              <div className="min-w-0">
                <h3 className="font-bold text-[#1C2B22] text-base truncate">{previewFile.name}</h3>
                <span className="text-xs text-[#8A9E92]" data-testid="preview-title">{t('files.previewSub')}</span>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]" title={t('common.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs md:text-sm text-[#1C2B22] leading-relaxed whitespace-pre-wrap font-sans">
              {previewFile.extractionWarning && (
                <p className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  {previewFile.extractionWarning}
                </p>
              )}
              {previewFile.textContent || t('files.noTextFound')}
            </div>

            <div className="p-4 border-t border-[#E2EFE7] flex justify-end gap-2 bg-[#FAFCF9]">
              <button
                onClick={() => {
                  const target = previewFile;
                  setPreviewFile(null);
                  onGenerateQuiz(target);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F8F5B] text-white text-xs font-bold shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('files.quizFromThis')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
