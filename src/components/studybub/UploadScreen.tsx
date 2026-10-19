'use client';

import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  UploadCloud, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { StudyFile } from '@/types/studybub';
import { extractTextFromFile, detectFileType, detectSubject } from '@/lib/extractor';
import { playChimeSound } from '@/lib/utils';

interface UploadScreenProps {
  files: StudyFile[];
  onBack: () => void;
  onFileReadyForQuiz: (file: StudyFile) => void;
  onAddFile: (file: StudyFile) => void;
}

export function UploadScreen({
  files,
  onBack,
  onFileReadyForQuiz,
  onAddFile
}: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{
    name: string;
    size: string;
    status: 'uploading' | 'reading' | 'ready';
    progress: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg('');
    const fileName = file.name;
    const fileType = detectFileType(fileName);
    const subject = detectSubject(fileName);
    const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    setUploadingFile({
      name: fileName,
      size: sizeFormatted,
      status: 'uploading',
      progress: 30
    });

    try {
      // Simulate reading progress
      setTimeout(() => {
        setUploadingFile(prev => prev ? { ...prev, status: 'reading', progress: 70 } : null);
      }, 500);

      // Extract text from PDF, PPTX, DOCX, or TXT
      const textContent = await extractTextFromFile(file);

      const newStudyFile: StudyFile = {
        id: `file-${Date.now()}`,
        name: fileName,
        size: sizeFormatted,
        type: fileType,
        subject,
        status: 'ready',
        progress: 100,
        uploadedAt: 'Just now',
        textContent,
        questionCount: 10,
        summary: `Document processed: ${textContent.slice(0, 150)}...`
      };

      setUploadingFile({
        name: fileName,
        size: sizeFormatted,
        status: 'ready',
        progress: 100
      });

      playChimeSound('success');
      onAddFile(newStudyFile);

      // Open generate quiz directly after brief pause
      setTimeout(() => {
        onFileReadyForQuiz(newStudyFile);
      }, 600);

    } catch (err: any) {
      setErrorMsg('Failed to process file. Please try another file.');
      setUploadingFile(null);
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
          accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
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
            Supports PDF, PPTX, DOCX
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
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI is reading...
                </>
              )}
            </span>
          </div>

          <div className="w-full bg-[#EBF5F0] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#2F8F5B] h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadingFile.progress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recent Uploads Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
          Recent Uploads
        </h2>

        <div className="space-y-2.5">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => onFileReadyForQuiz(file)}
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
                    {file.subject} · {file.size}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2F8F5B]" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
