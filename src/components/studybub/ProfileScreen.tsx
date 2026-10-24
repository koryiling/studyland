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
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { MistakeItem, QuizResult } from '@/types/studybub';
import { useFormat, useI18n } from '@/lib/i18n';
import { MistakeNotebook } from '@/components/studybub/MistakeNotebook';
import type { Lang } from '@/i18n';

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
  onLanguageChange?: (lang: Lang) => void;
}

// Help text may contain <b>…</b> for the bold lead-in; render that without raw HTML
function withBold(text: string) {
  return text.split(/(<b>.*?<\/b>)/).map((part, i) =>
    part.startsWith('<b>') ? <strong key={i}>{part.slice(3, -4)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

type ModalId = 'progress' | 'history' | 'mistakes' | 'settings' | 'help';

function Modal({ title, subtitle, onClose, children, closeLabel, wide }: {
  closeLabel: string;
  wide?: boolean;
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
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] flex flex-col rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E2EFE7]">
          <div>
            <h3 className="text-base font-bold text-[#1C2B22]">{title}</h3>
            {subtitle && <p className="text-xs text-[#8A9E92]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#EBF5F0] text-[#607367]" title={closeLabel}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProfileScreen({ email, isAdmin, stats, mistakes, quizHistory, onChangePassword, onSignOut, onLanguageChange }: ProfileScreenProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const close = () => setActiveModal(null);
  const closeLabel = t('common.close');

  const menu: Array<{ id: ModalId; label: string; sub: string; icon: React.ElementType; color: string }> = [
    { id: 'progress', label: t('pf.progress'), sub: t('pf.progressSub'), icon: Award, color: 'bg-[#EBF5F0] text-[#2F8F5B]' },
    { id: 'history', label: t('pf.history'), sub: t('pf.historySub', { n: quizHistory.length }), icon: History, color: 'bg-[#E0F2FE] text-[#0284C7]' },
    { id: 'mistakes', label: t('pf.mistakes'), sub: t('pf.mistakesSub', { n: mistakes.length }), icon: BookMarked, color: 'bg-[#FEF3C7] text-[#D97706]' },
    { id: 'settings', label: t('pf.settings'), sub: t('pf.settingsSub'), icon: SettingsIcon, color: 'bg-[#F3E8FF] text-[#9333EA]' },
    { id: 'help', label: t('pf.help'), sub: t('pf.helpSub'), icon: HelpCircle, color: 'bg-[#F4F9F5] text-[#607367]' },
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
            {stats.streakDays > 0 ? t('pf.streakOn', { n: stats.streakDays }) : t('pf.streakOff')}
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

      {/* Language */}
      <div className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm">
        <LanguagePicker onChange={onLanguageChange} />
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
            <span className="text-sm font-bold text-[#1C2B22]">{t('pf.changePassword')}</span>
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
                <span className="text-sm font-bold text-[#1C2B22]">{t('pf.admin')}</span>
                <p className="text-[11px] text-[#8A9E92]">{t('pf.adminSub')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
        <button
          onClick={() => {
            if (confirm(t('pf.confirmSignOut'))) onSignOut();
          }}
          className="w-full p-4 rounded-2xl hover:bg-rose-50 transition-colors flex items-center gap-3.5 text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <LogOut className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-sm font-bold text-rose-600">{t('pf.signOut')}</span>
        </button>
      </div>

      <p className="text-[11px] text-center text-[#8A9E92] px-4">
        {t('pf.footer')}
      </p>

      {activeModal === 'progress' && (
        <Modal title={t('pf.progressTitle')} onClose={close} closeLabel={closeLabel}>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: t('pf.accuracy'), value: stats.accuracyRate === null ? '—' : `${stats.accuracyRate}%`, color: 'text-[#2F8F5B]' },
              { label: t('pf.answered'), value: stats.totalQuestionsAnswered, color: 'text-[#1C2B22]' },
              { label: t('pf.completed'), value: stats.quizzesCompleted, color: 'text-[#1C2B22]' },
              { label: t('pf.streak'), value: t('pf.streakValue', { n: stats.streakDays }), color: 'text-[#D97706]' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">{s.label}</span>
                <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {stats.quizzesCompleted === 0 && (
            <p className="text-xs text-center text-[#8A9E92] mt-4">{t('pf.firstQuiz')}</p>
          )}
        </Modal>
      )}

      {activeModal === 'history' && (
        <Modal title={t('pf.history')} subtitle={t('pf.historySub', { n: quizHistory.length })} onClose={close} closeLabel={closeLabel}>
          {quizHistory.length === 0 ? (
            <p className="text-center py-10 text-xs text-[#8A9E92]">{t('pf.noQuizzes')}</p>
          ) : (
            <div className="space-y-2.5">
              {quizHistory.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1C2B22] truncate">{r.fileName}</div>
                    <div className="text-[11px] text-[#8A9E92]">
                      {r.subject} · {fmt.relative(r.completedAt)} · {fmt.duration(r.durationSeconds)}
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
        <Modal wide title={t('pf.mistakes')} subtitle={t('pf.mistakesTitleSub', { n: mistakes.length })} onClose={close} closeLabel={closeLabel}>
          <MistakeNotebook mistakes={mistakes} />
        </Modal>
      )}

      {activeModal === 'settings' && (
        <Modal title={t('pf.settings')} subtitle={t('pf.settingsSubtitle')} onClose={close} closeLabel={closeLabel}>
          <AISettingsPanel onClose={close} />
        </Modal>
      )}

      {activeModal === 'help' && (
        <Modal title={t('pf.helpTitle')} onClose={close} closeLabel={closeLabel}>
          <div className="text-xs text-[#1C2B22] leading-relaxed space-y-2.5">
            {(['pf.help1', 'pf.help2', 'pf.help3', 'pf.help4', 'pf.help5', 'pf.help6'] as const).map((key, i) => (
              <p key={key}>{i + 1}. {withBold(t(key))}</p>
            ))}
          </div>
        </Modal>
      )}

    </div>
  );
}
