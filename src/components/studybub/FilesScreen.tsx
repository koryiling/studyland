'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  BookOpen, 
  Eye, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { StudyFile, FileType } from '@/types/studybub';
import { playChimeSound } from '@/lib/utils';

interface FilesScreenProps {
  files: StudyFile[];
  onUploadClick: () => void;
  onGenerateQuiz: (file: StudyFile) => void;
  onDeleteFile: (fileId: string) => void;
}

export function FilesScreen({
  files,
  onUploadClick,
  onGenerateQuiz,
  onDeleteFile
}: FilesScreenProps) {
  const [filter, setFilter] = useState<'All' | 'pdf' | 'pptx' | 'docx'>('All');
  const [previewFile, setPreviewFile] = useState<StudyFile | null>(null);

  const filteredFiles = files.filter(f => {
    if (filter === 'All') return true;
    return f.type === filter;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-[#1C2B22]">
          My Files
        </h1>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Filter Tabs (All, PDF, PPTX, DOCX) - Screen 8 in Mockup */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['All', 'pdf', 'pptx', 'docx'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-wider ${
              filter === tab
                ? 'bg-[#2F8F5B] text-white shadow-sm'
                : 'bg-white border border-[#E2EFE7] text-[#607367] hover:bg-[#EBF5F0]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-white border border-[#E2EFE7] p-8 text-[#8A9E92] space-y-3">
            <FileText className="w-10 h-10 text-[#C8E3D3] mx-auto" />
            <p className="text-sm font-bold text-[#1C2B22]">No files in this category</p>
            <button
              onClick={onUploadClick}
              className="text-xs font-bold text-[#2F8F5B] hover:underline"
            >
              Upload PDF, PPTX or DOCX now &rarr;
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
                  <h3 className="text-sm md:text-base font-bold text-[#1C2B22] truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#8A9E92] mt-0.5">
                    <span>{file.subject}</span>
                    <span>•</span>
                    <span>{file.uploadedAt}</span>
                    <span>•</span>
                    <span className="text-[#2F8F5B] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-2 rounded-xl bg-[#F4F9F5] hover:bg-[#EBF5F0] text-[#607367] hover:text-[#1C2B22] text-xs font-semibold transition-colors"
                  title="Preview extracted text"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onGenerateQuiz(file)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-sm shadow-[#2F8F5B]/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Quiz with AI</span>
                </button>

                <button
                  onClick={() => {
                    onDeleteFile(file.id);
                    playChimeSound('ping');
                  }}
                  className="p-2 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Delete file"
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
              <div>
                <h3 className="font-bold text-[#1C2B22] text-base truncate max-w-sm">
                  {previewFile.name}
                </h3>
                <span className="text-xs text-[#8A9E92]">Extracted Text from Document</span>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs md:text-sm text-[#1C2B22] leading-relaxed whitespace-pre-wrap font-sans">
              {previewFile.textContent}
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
                <span>Generate Quiz from This</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
