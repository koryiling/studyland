'use client';

import React from 'react';
import { 
  ArrowUpCircle, 
  Sparkles, 
  FolderClosed, 
  ChevronRight,
  FileText,
  Timer,
  PencilLine
} from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { StudyEvent, StudyFile, StudyTask } from '@/types/studybub';
import { daysUntil, formatDayLabel, formatRelative, todayKey } from '@/lib/dates';

interface HomeScreenProps {
  files: StudyFile[];
  tasks: StudyTask[];
  events: StudyEvent[];
  onStartTask: (task: StudyTask) => void;
  onUploadClick: () => void;
  onCreateQuizClick: () => void;
  onPastYearClick: () => void;
  onMyFilesClick: () => void;
  onPlanClick: () => void;
  onSelectFile: (file: StudyFile) => void;
}

export function HomeScreen({
  files,
  tasks,
  events,
  onStartTask,
  onUploadClick,
  onCreateQuizClick,
  onPastYearClick,
  onMyFilesClick,
  onPlanClick,
  onSelectFile
}: HomeScreenProps) {
  const today = todayKey();
  const todayTasks = tasks.filter(t => t.date === today);
  const completedTasks = todayTasks.filter(t => t.completed).length;
  const totalTasks = todayTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const nextExam = events
    .filter((e) => e.date >= today && ['final', 'midterm', 'quiz', 'test'].includes(e.kind))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

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

      {/* Next exam countdown */}
      {nextExam && (
        <div
          onClick={onPlanClick}
          className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-rose-600">下一个考试</div>
            <div className="text-sm font-extrabold text-[#1C2B22] truncate">{nextExam.title}</div>
            <div className="text-[11px] text-[#8A9E92]">{formatDayLabel(nextExam.date)}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-extrabold text-rose-600 leading-none">{daysUntil(today, nextExam.date)}</div>
            <div className="text-[10px] font-bold text-rose-600">{daysUntil(today, nextExam.date) === 0 ? '就是今天！' : '天后'}</div>
          </div>
        </div>
      )}

      {/* Today's Plan Card */}
      <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
        <div onClick={onPlanClick} className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm font-bold text-[#1C2B22]">Today&apos;s Plan 今天要做的</span>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="text-xs text-[#607367] font-semibold">
          {totalTasks > 0
            ? completedTasks === totalTasks
              ? `今天的 ${totalTasks} 个任务都完成了，太棒了 🎉`
              : `${completedTasks} / ${totalTasks} 完成`
            : 'No tasks planned for today yet'}
        </div>
        <div className="w-full bg-[#EBF5F0] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#2F8F5B] h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {todayTasks.filter((t) => !t.completed).slice(0, 3).map((task) => {
          const kind = task.kind || 'study';
          return (
            <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1C2B22] truncate">{task.title}</div>
                <div className="text-[11px] text-[#8A9E92]">
                  {kind === 'study' ? '📖 学习' : '✏️ 做题'} · {task.subject}
                  {kind === 'study' && task.minutes ? ` · ${task.minutes} 分钟` : ''}
                </div>
              </div>
              <button
                onClick={() => onStartTask(task)}
                className="px-3 py-1.5 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold flex items-center gap-1 flex-shrink-0"
              >
                {kind === 'study' ? <Timer className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                开始
              </button>
            </div>
          );
        })}
        {totalTasks === 0 && (
          <button onClick={onPlanClick} className="w-full py-2.5 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold">
            去 Study Plan 排今天的计划
          </button>
        )}
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

      {/* NEW: Pass Year Exam Simulation Card (历年题刷题专区) */}
      <div 
        onClick={onPastYearClick}
        className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-[#FEF3C7] via-[#FFFBEB] to-white border border-[#FDE68A] shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F59E0B]/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-extrabold text-[#92400E]">
                  Past Year 历年试题考点仿练
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D97706] text-white">
                  高仿预测卷
                </span>
              </div>
              <p className="text-xs text-[#78350F] mt-1 leading-relaxed max-w-lg">
                上传历年考卷（PDF/Word），AI 深度透视出题规律，生成同款高仿题同步做，错题详细指明“应该记住什么”！
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <span>开始真题仿练</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
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
                  {activeContinueFile.name}
                </h3>
                <p className="text-xs text-[#607367] mt-0.5">
                  {activeContinueFile.subject} · {formatRelative(activeContinueFile.createdAt)}
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
        ) : (
          <button
            onClick={onUploadClick}
            className="w-full p-6 rounded-3xl bg-white border-2 border-dashed border-[#C8E3D3] hover:border-[#2F8F5B] text-center space-y-1 transition-all"
          >
            <div className="text-sm font-bold text-[#1C2B22]">Upload your first study material</div>
            <div className="text-xs text-[#8A9E92]">PDF, PPTX or DOCX — Studyland will read it and quiz you on it.</div>
          </button>
        )}
      </div>

      {/* Recent Files */}
      {recentFiles.length > 0 && <div className="space-y-3">
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
                    {file.subject} · {formatRelative(file.createdAt)}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>}

    </div>
  );
}

