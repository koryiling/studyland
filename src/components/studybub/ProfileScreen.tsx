'use client';

import React, { useState } from 'react';
import {
  Award,
  History,
  BookMarked,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronRight,
  KeyRound,
  LogOut,
  ShieldCheck,
  X
} from 'lucide-react';
import Link from 'next/link';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { AISettingsPanel } from '@/components/studybub/AISettingsPanel';
import { MistakeItem, QuizResult } from '@/types/studybub';
import { formatDuration, formatRelative } from '@/lib/dates';

interface ProfileStats {
  streakDays: number;
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  accuracyRate: number | null;
}

interface ProfileScreenProps {
  email: string;
  isAdmin: boolean;
  stats: ProfileStats;
  mistakes: MistakeItem[];
  quizHistory: QuizResult[];
  onChangePassword: () => void;
  onSignOut: () => void;
}

type ModalId = 'progress' | 'history' | 'mistakes' | 'settings' | 'help';

function Modal({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E2EFE7]">
          <div>
            <h3 className="text-base font-bold text-[#1C2B22]">{title}</h3>
            {subtitle && <p className="text-xs text-[#8A9E92]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProfileScreen({ email, isAdmin, stats, mistakes, quizHistory, onChangePassword, onSignOut }: ProfileScreenProps) {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const close = () => setActiveModal(null);

  const menu: Array<{ id: ModalId; label: string; sub: string; icon: React.ElementType; color: string }> = [
    { id: 'progress', label: 'My Progress', sub: 'Accuracy & questions answered', icon: Award, color: 'bg-[#EBF5F0] text-[#2F8F5B]' },
    { id: 'history', label: 'My Quiz History', sub: `${quizHistory.length} completed sessions`, icon: History, color: 'bg-[#E0F2FE] text-[#0284C7]' },
    { id: 'mistakes', label: 'Mistake Notebook (错题本)', sub: `${mistakes.length} questions to review`, icon: BookMarked, color: 'bg-[#FEF3C7] text-[#D97706]' },
    { id: 'settings', label: 'AI Settings (AI 设置)', sub: 'Built-in AI or your own API key', icon: SettingsIcon, color: 'bg-[#F3E8FF] text-[#9333EA]' },
    { id: 'help', label: 'Help & Feedback', sub: 'How to learn best with Studyland', icon: HelpCircle, color: 'bg-[#F4F9F5] text-[#607367]' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">

      {/* Profile Header */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] border border-[#DCEDE4] flex items-center justify-center flex-shrink-0 shadow-inner">
          <StudyBubMascot mood="icon" size={50} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">Studyland</h1>
          <p className="text-xs text-[#607367] truncate">{email}</p>
          <p className="text-xs md:text-sm text-[#2F8F5B] font-semibold mt-0.5">
            {stats.streakDays > 0 ? `🔥 ${stats.streakDays}-day streak — keep going!` : 'Keep going! 🌿'}
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="p-3 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModal(item.id)}
              className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#1C2B22]">{item.label}</span>
                  <p className="text-[11px] text-[#8A9E92]">{item.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
            </button>
          );
        })}
      </div>

      {/* Account */}
      <div className="p-3 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-1">
        <button
          onClick={onChangePassword}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F4F9F5] text-[#607367] flex items-center justify-center">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-sm font-bold text-[#1C2B22]">修改密码</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>
        {isAdmin && (
          <Link
            href="/admin"
            className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#1C2B22]">管理后台</span>
                <p className="text-[11px] text-[#8A9E92]">管理用户、帮用户重设密码</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
        <button
          onClick={() => {
            if (confirm('确定要退出登录吗？')) onSignOut();
          }}
          className="w-full p-4 rounded-2xl hover:bg-rose-50 transition-colors flex items-center gap-3.5 text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <LogOut className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-sm font-bold text-rose-600">退出登录</span>
        </button>
      </div>

      <p className="text-[11px] text-center text-[#8A9E92] px-4">
        你的资料和学习记录保存在你的 Studyland 账号里，换设备登录也能看到。AI 设置（包括你自己的 API Key）只保存在这台设备上。
      </p>

      {activeModal === 'progress' && (
        <Modal title="My Learning Progress" onClose={close}>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Accuracy Rate', value: stats.accuracyRate === null ? '—' : `${stats.accuracyRate}%`, color: 'text-[#2F8F5B]' },
              { label: 'Questions Answered', value: stats.totalQuestionsAnswered, color: 'text-[#1C2B22]' },
              { label: 'Quizzes Completed', value: stats.quizzesCompleted, color: 'text-[#1C2B22]' },
              { label: 'Study Streak', value: `🔥 ${stats.streakDays}d`, color: 'text-[#D97706]' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">{s.label}</span>
                <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {stats.quizzesCompleted === 0 && (
            <p className="text-xs text-center text-[#8A9E92] mt-4">Complete your first quiz to see your progress here.</p>
          )}
        </Modal>
      )}

      {activeModal === 'history' && (
        <Modal title="My Quiz History" subtitle={`${quizHistory.length} completed sessions`} onClose={close}>
          {quizHistory.length === 0 ? (
            <p className="text-center py-10 text-xs text-[#8A9E92]">No quizzes completed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {quizHistory.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1C2B22] truncate">{r.fileName}</div>
                    <div className="text-[11px] text-[#8A9E92]">
                      {r.subject} · {formatRelative(r.completedAt)} · {formatDuration(r.durationSeconds)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-[#2F8F5B]">{r.percentage}%</div>
                    <div className="text-[11px] text-[#8A9E92]">{r.correctCount}/{r.totalQuestions}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {activeModal === 'mistakes' && (
        <Modal title="Mistake Notebook (错题本)" subtitle={`${mistakes.length} questions to master`} onClose={close}>
          {mistakes.length === 0 ? (
            <div className="text-center py-10 text-[#8A9E92]">
              <p className="text-sm font-bold text-[#1C2B22]">No mistakes saved yet!</p>
              <p className="text-xs mt-1">When you get questions wrong during a quiz, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mistakes.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#2F8F5B]">{m.subject}</span>
                    <span className="text-[#8A9E92] truncate">{m.fileName}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1C2B22]">{m.question.question}</h4>
                  {m.question.userAnswer && (
                    <p className="text-xs text-rose-600">Your answer: {m.question.userAnswer}</p>
                  )}
                  <p className="text-xs text-[#2F8F5B] font-semibold">Correct: {m.question.correctAnswer}</p>
                  <p className="text-xs text-[#607367] leading-relaxed">{m.question.explanation}</p>
                  <p className="text-[11px] text-[#8A9E92]">
                    Wrong {m.wrongCount}× · last {formatRelative(m.lastWrongAt)}
                    {m.question.sourceReference ? ` · ${m.question.sourceReference}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {activeModal === 'settings' && (
        <Modal title="AI Settings (AI 设置)" subtitle="选择 Studyland 使用哪个 AI" onClose={close}>
          <AISettingsPanel onClose={close} />
        </Modal>
      )}

      {activeModal === 'help' && (
        <Modal title="How to Learn with Studyland" onClose={close}>
          <div className="text-xs text-[#1C2B22] leading-relaxed space-y-2.5">
            <p>1. <strong>Upload Materials:</strong> Upload your slides (.pptx), notes (.pdf) or study guides (.docx). Scanned PDFs (images only) can&apos;t be read yet.</p>
            <p>2. <strong>AI Notes:</strong> Open a file and pick a language and Simple or Detailed notes. Notes cite the page they came from so you can check the original.</p>
            <p>3. <strong>Generate Quiz:</strong> Choose question types (Multiple Choice, True/False, or Short Answer) and difficulty. Questions are written from your own material.</p>
            <p>4. <strong>Immediate Feedback:</strong> Every answer comes with an explanation and the page or slide it came from.</p>
            <p>5. <strong>Mistake Notebook:</strong> Any question you miss is saved automatically so you can review it later.</p>
            <p>6. <strong>AI Settings:</strong> Studyland uses a free built-in AI by default. You can also use your own Gemini, OpenAI or DeepSeek key — see Profile → AI Settings for a step-by-step guide.</p>
          </div>
        </Modal>
      )}

    </div>
  );
}
