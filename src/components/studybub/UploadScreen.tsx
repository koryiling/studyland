'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { StudyFile, FileCategory } from '@/types/studybub';
import {
  extractTextFromFile,
  detectFileType,
  detectSubject,
  detectCategory,
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

interface UploadScreenProps {
  files: StudyFile[];
  onBack: () => void;
  onFileReady: (file: StudyFile) => void;
  onFileReadyForPastYear?: (file: StudyFile) => void;
  onAddFile: (file: StudyFile) => void;
}

export function UploadScreen({
  files,
  onBack,
  onFileReady,
  onFileReadyForPastYear,
  onAddFile
}: UploadScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('notes');
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

  const processFile = async (file: File) => {
    if (uploadingFile?.status === 'reading') return;
    setErrorMsg('');
    setWarningFile(null);
    setScanNote('');
    const fileName = file.name;
    const autoCategory = detectCategory(fileName);
    const finalCategory = autoCategory === 'past_year' ? 'past_year' : selectedCategory;

    setUploadingFile({ name: fileName, size: formatBytes(file.size), status: 'reading' });

    try {
      let extracted = await extractTextFromFile(file);
      let readByAI = false;

      // Scanned PDF (each page is a photo): let the AI read the page images
      if (isScannedPdf(fileName, extracted)) {
        const show = (percent: number, note: string) =>
          setUploadingFile((prev) => (prev ? { ...prev, status: 'scanning', percent, note } : null));
        try {
          show(0, '这是扫描版 PDF，正在把每一页转成图片…');
          const { images, totalPages } = await renderPdfPages(file, (done, total) =>
            show(Math.round((done / total) * 15), `这是扫描版 PDF，正在准备第 ${done} / ${total} 页…`)
          );
          const text = await readScannedPages(images, (done, total) =>
            show(15 + Math.round((done / total) * 85), `AI 正在读取扫描内容（${done} / ${total} 页）…`)
          );
          if (text.replace(/[Page d+]/g, '').trim().length >= MIN_USEFUL_CHARS) {
            extracted = { text, pageCount: totalPages };
            readByAI = true;
            if (totalPages > MAX_SCANNED_PAGES) {
              setScanNote(`这份文件有 ${totalPages} 页，AI 读取了前 ${MAX_SCANNED_PAGES} 页。`);
            }
          } else {
            extracted = { ...extracted, warning: 'AI 也没能从这些图片里读到文字，可能是空白页或照片太模糊。可以换一份清楚一点的文件再试。' };
          }
        } catch (err) {
          extracted = {
            ...extracted,
            warning: `这是扫描版 PDF，AI 这次没能读完里面的文字（${err instanceof AIRequestError ? err.message : '请再试一次'}）。可以稍后重新上传。`,
          };
        }
      }

      const newStudyFile: StudyFile = {
        id: newId('file'),
        name: fileName,
        sizeBytes: file.size,
        type: detectFileType(fileName),
        subject: detectSubject(fileName),
        category: finalCategory,
        createdAt: new Date().toISOString(),
        textContent: extracted.text,
        pageCount: extracted.pageCount,
        extractionWarning: extracted.warning,
        readByAI: readByAI || undefined,
      };

      onAddFile(newStudyFile);
      setUploadingFile((prev) => (prev ? { ...prev, status: 'ready', readByAI } : null));

      // Keep the student here if the file can't be used for AI, so they see why
      if (extracted.warning) {
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
      setErrorMsg(err instanceof ExtractionError ? err.message : '处理文件失败，请换一个文件再试。');
      setUploadingFile(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">
          Upload Materials
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
          <span>📖 课件笔记 (Lecture Notes)</span>
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
          <span>🎯 历年考卷 (Past Year Exam)</span>
        </button>
      </div>

      {/* Drag & Drop Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center shadow-sm">
          <UploadCloud className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#1C2B22]">
            Tap to upload or drag and drop
          </h3>
          <p className="text-xs text-[#8A9E92] mt-0.5">
            Supports PDF, PPTX, DOCX, TXT · up to 25 MB
          </p>
        </div>

        {/* File Badges */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FEE2E2] text-[#DC2626]">
            PDF
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#FFEDD5] text-[#EA580C]">
            PPTX
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#DBEAFE] text-[#2563EB]">
            DOCX
          </span>
        </div>
      </div>

      {/* Uploading Status Progress */}
      {uploadingFile && (
        <div className="p-4 rounded-3xl bg-white border border-[#2F8F5B] shadow-sm space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1C2B22] truncate max-w-[200px]">
              {uploadingFile.name}
            </span>
            <span className="text-[#2F8F5B] font-semibold flex items-center gap-1">
              {uploadingFile.status === 'ready' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready!
                </>
              ) : uploadingFile.status === 'scanning' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadingFile.percent ?? 0}%
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading file...
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
          {uploadingFile.status === 'ready' && readByAINote(uploadingFile, scanNote)}
        </div>
      )}

      {warningFile && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{warningFile.extractionWarning} 文件已保存，你可以在 My Files 中预览读取到的内容。</span>
        </div>
      )}

      {errorMsg && (
        <FriendlyNotice message={errorMsg} />
      )}

      {/* Recent Uploads Section */}
      {files.length > 0 && <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
          Recent Uploads
        </h2>

        <div className="space-y-2.5">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => onFileReady(file)}
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
                  <div className="text-xs md:text-sm font-bold text-[#1C2B22] truncate">
                    {file.name}
                  </div>
                  <div className="text-[11px] text-[#8A9E92]">
                    {file.subject} · {formatBytes(file.sizeBytes)}
                  </div>
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


function readByAINote(file: { readByAI?: boolean }, scanNote: string) {
  if (!file.readByAI) return null;
  return (
    <p className="text-[11px] text-[#607367]">
      📷 扫描版 PDF：文字是 AI 从图片读出来的，可能有少量错字，可以在 My Files 预览核对。{scanNote}
    </p>
  );
}
