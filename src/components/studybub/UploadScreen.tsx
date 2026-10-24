'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { StudyFile, FileCategory } from '@/types/studybub';
import {
  extractTextFromFile,
  detectFileType,
  detectSubject,
  detectCategory,
  matchCourse,
  ExtractionError,
  ACCEPTED_EXTENSIONS,
  isScannedPdf,
  renderPdfPages,
  MAX_SCANNED_PAGES,
} from '@/lib/extractor';
import { readScannedPages, AIRequestError } from '@/lib/studybub-ai';
import { MIN_USEFUL_CHARS } from '@/lib/doc-text';
import { newId } from '@/lib/studybub-storage';
import { formatBytes } from '@/lib/dates';
import { playChimeSound } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface UploadScreenProps {
  files: StudyFile[];
  courses: Array<{ name: string; code?: string }>; // this semester's subjects, offered first
  initialCategory?: FileCategory;
  onBack: () => void;
  onFileReady: (file: StudyFile) => void;
  onFileReadyForPastYear?: (file: StudyFile) => void;
  onAddFile: (file: StudyFile) => void;
}

const AUTO = '__auto';
const NEW = '__new';

export function UploadScreen({
  files,
  courses,
  initialCategory = 'notes',
  onBack,
  onFileReady,
  onFileReadyForPastYear,
  onAddFile
}: UploadScreenProps) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>(initialCategory);
  const [subjectChoice, setSubjectChoice] = useState(AUTO);
  const [newSubject, setNewSubject] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{
    name: string;
    size: string;
    status: 'reading' | 'scanning' | 'ready';
    percent?: number; // only while an AI reads a scanned PDF
    note?: string;
    readByAI?: boolean;
  } | null>(null);
  const [scanNote, setScanNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningFile, setWarningFile] = useState<StudyFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // This semester's subjects first, then subjects already used for other files
  const subjectOptions = Array.from(
    new Set([...courses.map((c) => c.name), ...files.map((f) => f.subject).filter((s) => s && s !== 'General')])
  );

  const subjectFor = (fileName: string) => {
    if (subjectChoice === NEW && newSubject.trim()) return newSubject.trim();
    if (subjectChoice !== AUTO && subjectChoice !== NEW) return subjectChoice;
    return matchCourse(fileName, courses) || detectSubject(fileName);
  };

  const processFile = async (file: File) => {
    if (uploadingFile?.status === 'reading' || uploadingFile?.status === 'scanning') return;
    setErrorMsg('');
    setWarningFile(null);
    setScanNote('');
    const fileName = file.name;
    const autoCategory = detectCategory(fileName);
    const finalCategory = autoCategory === 'past_year' ? 'past_year' : selectedCategory;

    setUploadingFile({ name: fileName, size: formatBytes(file.size), status: 'reading' });

    try {
      const extracted = await extractTextFromFile(file);
      let text = extracted.text;
      let pageCount = extracted.pageCount;
      let warning: string | undefined = extracted.warning ? t(extracted.warning) : undefined;
      let readByAI = false;

      // Scanned PDF (each page is a photo): let the AI read the page images
      if (isScannedPdf(fileName, extracted)) {
        const show = (percent: number, note: string) =>
          setUploadingFile((prev) => (prev ? { ...prev, status: 'scanning', percent, note } : null));
        try {
          show(0, t('upload.scanRender'));
          const { images, totalPages } = await renderPdfPages(file, (done, total) =>
            show(Math.round((done / total) * 15), t('upload.scanRenderPage', { done, total }))
          );
          const read = await readScannedPages(images, (done, total) =>
            show(15 + Math.round((done / total) * 85), t('upload.scanReading', { done, total }))
          );
          if (read.replace(/\[Page \d+\]/g, '').trim().length >= MIN_USEFUL_CHARS) {
            text = read;
            pageCount = totalPages;
            warning = undefined;
            readByAI = true;
            if (totalPages > MAX_SCANNED_PAGES) setScanNote(t('upload.scanTooLong', { total: totalPages, max: MAX_SCANNED_PAGES }));
          } else {
            warning = t('upload.scanNothing');
          }
        } catch (err) {
          warning = t('upload.scanFailed', { reason: err instanceof AIRequestError ? err.message : t('upload.scanFailedReason') });
        }
      }

      const newStudyFile: StudyFile = {
        id: newId('file'),
        name: fileName,
        sizeBytes: file.size,
        type: detectFileType(fileName),
        subject: subjectFor(fileName),
        category: finalCategory,
        createdAt: new Date().toISOString(),
        textContent: text,
        pageCount,
        extractionWarning: warning,
        readByAI: readByAI || undefined,
      };

      onAddFile(newStudyFile);
      setUploadingFile((prev) => (prev ? { ...prev, status: 'ready', readByAI } : null));

      // Keep the student here if the file can't be used for AI, so they see why
      if (warning) {
        setWarningFile(newStudyFile);
        return;
      }

      playChimeSound('success');
      // Give the student a moment to see that the scanned pages were read by AI
      setTimeout(() => {
        if (finalCategory === 'past_year' && onFileReadyForPastYear) {
          onFileReadyForPastYear(newStudyFile);
        } else {
          onFileReady(newStudyFile);
        }
      }, readByAI ? 1800 : 600);
    } catch (err) {
      setErrorMsg(err instanceof ExtractionError ? t(err.key) : t('upload.failed'));
      setUploadingFile(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const openFile = (file: StudyFile) =>
    file.category === 'past_year' && onFileReadyForPastYear ? onFileReadyForPastYear(file) : onFileReady(file);

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">

      {/* Header with Back Arrow */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">
          {t('upload.title')}
        </h1>
      </div>

      {/* Material Type Category Selector */}
      <div className="grid grid-cols-2 gap-2 bg-[#EBF5F0]/60 p-1.5 rounded-2xl border border-[#DCEDE4]">
        <button
          type="button"
          onClick={() => setSelectedCategory('notes')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            selectedCategory === 'notes'
              ? 'bg-[#2F8F5B] text-white shadow-sm'
              : 'text-[#607367] hover:text-[#1C2B22]'
          }`}
        >
          <span>{t('upload.notes')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('past_year')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            selectedCategory === 'past_year'
              ? 'bg-[#D97706] text-white shadow-sm'
              : 'text-[#607367] hover:text-[#1C2B22]'
          }`}
        >
          <span>{t('upload.pastYear')}</span>
        </button>
      </div>

      {/* Subject */}
      <div className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-2">
        <label htmlFor="upload-subject" className="flex items-center gap-1.5 text-xs font-bold text-[#1C2B22]">
          <BookOpen className="w-4 h-4 text-[#2F8F5B]" /> {t('upload.subject')}
        </label>
        <select
          id="upload-subject"
          value={subjectChoice}
          onChange={(e) => setSubjectChoice(e.target.value)}
          className="w-full min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm font-semibold text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
        >
          <option value={AUTO}>{t('upload.subjectAuto')}</option>
          {subjectOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value={NEW}>{t('upload.subjectNew')}</option>
        </select>
        {subjectChoice === NEW && (
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder={t('upload.subjectNewPlaceholder')}
            className="w-full min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
          />
        )}
        {selectedCategory === 'past_year' && <p className="text-[11px] text-[#8A9E92]">{t('upload.subjectHint')}</p>}
      </div>

      {/* Drag & Drop Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 md:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-[#2F8F5B] bg-[#EBF5F0]'
            : 'border-[#C8E3D3] bg-white hover:border-[#2F8F5B] hover:bg-[#FAFCF9]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) processFile(selectedFile);
          }}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center shadow-sm">
          <UploadCloud className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#1C2B22]">{t('upload.tap')}</h3>
          <p className="text-xs text-[#8A9E92] mt-0.5">{t('upload.supports')}</p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FEE2E2] text-[#DC2626]">PDF</span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FFEDD5] text-[#EA580C]">PPTX</span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#DBEAFE] text-[#2563EB]">DOCX</span>
        </div>
      </div>

      {/* Uploading Status Progress */}
      {uploadingFile && (
        <div className="p-4 rounded-3xl bg-white border border-[#2F8F5B] shadow-sm space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-bold text-[#1C2B22] truncate min-w-0">{uploadingFile.name}</span>
            <span className="text-[#2F8F5B] font-semibold flex items-center gap-1 flex-shrink-0">
              {uploadingFile.status === 'ready' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('upload.ready')}
                </>
              ) : uploadingFile.status === 'scanning' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadingFile.percent ?? 0}%
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('upload.reading')}
                </>
              )}
            </span>
          </div>

          <div className="w-full bg-[#EBF5F0] h-2 rounded-full overflow-hidden">
            <div
              className={`bg-[#2F8F5B] h-full rounded-full transition-all duration-300 ${
                uploadingFile.status === 'ready' ? 'w-full' : uploadingFile.status === 'scanning' ? '' : 'w-1/2 animate-pulse'
              }`}
              style={uploadingFile.status === 'scanning' ? { width: `${Math.max(3, uploadingFile.percent ?? 0)}%` } : undefined}
            />
          </div>
          {uploadingFile.note && uploadingFile.status === 'scanning' && (
            <p className="text-[11px] text-[#607367]">{uploadingFile.note}</p>
          )}
          {uploadingFile.status === 'ready' && uploadingFile.readByAI && (
            <p className="text-[11px] text-[#607367]">
              {t('upload.scanDone')} {scanNote}
            </p>
          )}
        </div>
      )}

      {warningFile && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t('upload.savedWithWarning', { warning: warningFile.extractionWarning || '' })}</span>
        </div>
      )}

      {errorMsg && <FriendlyNotice message={errorMsg} />}

      {/* Recent Uploads Section */}
      {files.length > 0 && <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">{t('upload.recent')}</h2>

        <div className="space-y-2.5">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => openFile(file)}
              className="p-3.5 rounded-2xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] shadow-sm flex items-center justify-between gap-3 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  file.type === 'pdf'
                    ? 'bg-[#FEE2E2] text-[#DC2626]'
                    : file.type === 'pptx'
                    ? 'bg-[#FFEDD5] text-[#EA580C]'
                    : 'bg-[#DBEAFE] text-[#2563EB]'
                }`}>
                  {file.type.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold text-[#1C2B22] truncate">{file.name}</div>
                  <div className="text-[11px] text-[#8A9E92]">{file.subject} · {formatBytes(file.sizeBytes)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {file.extractionWarning ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#2F8F5B]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>}

    </div>
  );
}
