'use client';

import React from 'react';
import { 
  ArrowUpCircle, 
  Sparkles, 
  FolderClosed, 
  ChevronRight, 
  FileText, 
  BookOpen, 
  Clock 
} from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { StudyFile, StudyTask } from '@/types/studybub';

interface HomeScreenProps {
  files: StudyFile[];
  tasks: StudyTask[];
  onUploadClick: () => void;
  onCreateQuizClick: () => void;
  onMyFilesClick: () => void;
  onPlanClick: () => void;
  onSelectFile: (file: StudyFile) => void;
}

export function HomeScreen({
  files,
  tasks,
  onUploadClick,
  onCreateQuizClick,
  onMyFilesClick,
  onPlanClick,
  onSelectFile
}: HomeScreenProps) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length || 5;
  const progressPct = Math.round((completedTasks / totalTasks) * 100);

  const recentFiles = files.slice(0, 3);
  const activeContinueFile = files[0];

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Header Greeting */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C2B22] tracking-tight">
              Hi! 👋
            </h1>
          </div>
          <p className="text-sm md:text-base text-[#607367] font-medium mt-0.5">
            Let&apos;s make progress today!
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] border border-[#DCEDE4] flex items-center justify-center shadow-sm">
          <StudyBubMascot mood="icon" size={40} />
        </div>
      </div>

      {/* Today's Plan Card */}
      <div 
        onClick={onPlanClick}
        className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#1C2B22]">Today&apos;s Plan</span>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="text-xs text-[#607367] font-semibold mb-3">
          {completedTasks} / {totalTasks} quizzes completed
        </div>
        <div className="w-full bg-[#EBF5F0] h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#2F8F5B] h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Three Action Buttons (Upload Materials, Create Quiz, My Files) */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {/* Upload Materials */}
        <button
          onClick={onUploadClick}
          className="p-4 rounded-3xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowUpCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-[#1C2B22]">Upload</div>
            <div className="text-[10px] md:text-xs text-[#8A9E92] font-medium">Study Materials</div>
          </div>
        </button>

        {/* Create Quiz with AI */}
        <button
          onClick={onCreateQuizClick}
          className="p-4 rounded-3xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-[#1C2B22]">Create Quiz</div>
            <div className="text-[10px] md:text-xs text-[#8A9E92] font-medium">with AI</div>
          </div>
        </button>

        {/* My Files */}
        <button
          onClick={onMyFilesClick}
          className="p-4 rounded-3xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center group-hover:scale-110 transition-transform">
            <FolderClosed className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-[#1C2B22]">My Files</div>
            <div className="text-[10px] md:text-xs text-[#8A9E92] font-medium">View Your Files</div>
          </div>
        </button>
      </div>

      {/* Continue Learning */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
          Continue Learning
        </h2>

        {activeContinueFile ? (
          <div 
            onClick={() => onSelectFile(activeContinueFile)}
            className="p-4 md:p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1C2B22] truncate group-hover:text-[#2F8F5B] transition-colors">
                  Chapter 3 – Cell Biology
                </h3>
                <p className="text-xs text-[#607367] mt-0.5">
                  {activeContinueFile.subject} · {activeContinueFile.questionCount || 10} questions
                </p>
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-sm shadow-[#2F8F5B]/20 transition-all flex-shrink-0"
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>

      {/* Recent Files */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
            Recent Files
          </h2>
          <button
            onClick={onMyFilesClick}
            className="text-xs font-semibold text-[#2F8F5B] hover:underline"
          >
            View all &gt;
          </button>
        </div>

        <div className="space-y-2.5">
          {recentFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onSelectFile(file)}
              className="p-3.5 rounded-2xl bg-white border border-[#E2EFE7] hover:border-[#2F8F5B] shadow-sm flex items-center justify-between gap-3 cursor-pointer transition-all group"
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
                  <div className="text-xs md:text-sm font-bold text-[#1C2B22] truncate group-hover:text-[#2F8F5B] transition-colors">
                    {file.name}
                  </div>
                  <div className="text-[11px] text-[#8A9E92]">
                    {file.subject} · {file.uploadedAt}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
