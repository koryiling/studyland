'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Home,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { QuizResult } from '@/types/studybub';
import { playChimeSound } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';
import { QuestionPicture } from '@/components/ui/QuestionPicture';

interface QuizResultViewProps {
  result: QuizResult;
  onBackToHome: () => void;
  onTryAgain: () => void;
  onAddTaskToPlan: (title: string, subject: string, fileId?: string) => void;
}

export function QuizResultView({
  result,
  onBackToHome,
  onTryAgain,
  onAddTaskToPlan
}: QuizResultViewProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const [showReviewMistakes, setShowReviewMistakes] = useState(false);
  const [addedTaskNotice, setAddedTaskNotice] = useState(false);

  const wrongQuestions = result.questions.filter(q => !q.isCorrect);
  const weakTopics = Array.from(new Set(wrongQuestions.map(q => q.topic).filter((t): t is string => Boolean(t))));

  const handleAddFollowupTask = () => {
    onAddTaskToPlan(t('result.followupTitle', { subject: result.subject, n: wrongQuestions.length }), result.subject, result.fileId);
    setAddedTaskNotice(true);
    playChimeSound('success');
    setTimeout(() => setAddedTaskNotice(false), 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Mascot & Celebration Title (Screen 7 in Mockup) */}
      <div className="text-center pt-4 space-y-2">
        <div className="flex justify-center">
          <StudyBubMascot mood="happy" size={130} />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C2B22]">
          {t('result.done')}
        </h1>
        <p className="text-xs md:text-sm text-[#607367]">
          {result.fileName} · {result.subject}
        </p>
      </div>

      {/* Main Score Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-6 text-center">
        
        {/* Score & Circular Percentage Badge */}
        <div className="flex items-center justify-between px-4">
          <div className="text-left">
            <span className="text-xs font-bold text-[#8A9E92] uppercase tracking-wider block">
              {t('result.score')}
            </span>
            <div className="text-3xl md:text-4xl font-black text-[#1C2B22] mt-0.5">
              {result.correctCount} <span className="text-lg text-[#8A9E92] font-semibold">/ {result.totalQuestions}</span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-full border-4 border-[#2F8F5B] bg-[#EBF5F0] flex flex-col items-center justify-center shadow-inner">
            <span className="text-xl font-black text-[#2F8F5B]">
              {result.percentage}%
            </span>
          </div>
        </div>

        {/* Stats Row (Correct, Wrong, Time) */}
        <div className="grid grid-cols-3 gap-2 bg-[#F4F9F5] p-3.5 rounded-2xl border border-[#E2EFE7]">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">{t('result.correct')}</div>
            <div className="text-lg font-bold text-[#2F8F5B] mt-0.5">{result.correctCount}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">{t('result.wrong')}</div>
            <div className="text-lg font-bold text-rose-500 mt-0.5">{result.totalQuestions - result.correctCount}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">{t('result.time')}</div>
            <div className="text-lg font-bold text-[#1C2B22] mt-0.5">{fmt.duration(result.durationSeconds)}</div>
          </div>
        </div>

        {weakTopics.length > 0 && (
          <div className="text-left p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="text-xs font-bold text-[#92400E]">{t('result.weak')}</div>
            <div className="flex flex-wrap gap-1.5">
              {weakTopics.map(topic => (
                <span key={topic} className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[#92400E]">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {wrongQuestions.length > 0 && (
            <button
              onClick={() => setShowReviewMistakes(!showReviewMistakes)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#EBF5F0] hover:bg-[#DCEDE4] text-[#2F8F5B] font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{showReviewMistakes ? t('result.hideMistakes') : t('result.reviewMistakes', { n: wrongQuestions.length })}</span>
              {showReviewMistakes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onTryAgain}
            className="w-full py-3.5 px-5 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#F4F9F5] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('result.tryAgain')}</span>
          </button>

          {wrongQuestions.length > 0 && <button
            onClick={handleAddFollowupTask}
            disabled={addedTaskNotice}
            className="w-full py-3.5 px-5 rounded-2xl bg-white border border-[#2F8F5B] text-[#2F8F5B] hover:bg-[#EBF5F0] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{addedTaskNotice ? t('result.added') : t('result.addTask')}</span>
          </button>}

          <button
            onClick={onBackToHome}
            className="w-full py-4 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>{t('result.home')}</span>
          </button>
        </div>
      </div>

      {/* Review Mistakes Section */}
      {showReviewMistakes && wrongQuestions.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
            {t('result.reviewTitle', { n: wrongQuestions.length })}
          </h3>

          {wrongQuestions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {t('result.question', { n: idx + 1 })}
                </span>
              </div>

              {q.image && <QuestionPicture src={q.image} source={q.imageSource} compact />}

              <h4 className="text-sm md:text-base font-bold text-[#1C2B22]">
                {q.question}
              </h4>

              {(q.topic || q.sourceReference) && (
                <p className="text-[11px] text-[#8A9E92]">
                  {[q.topic, q.sourceReference].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="space-y-1 text-xs">
                <div className="text-rose-600 font-medium">
                  {t('result.yourAnswer')}<span className="line-through">{q.userAnswer || t('result.none')}</span>
                </div>
                <div className="text-[#2F8F5B] font-bold">
                  {t('result.correctAnswer', { answer: q.correctAnswer })}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] text-xs text-[#1C2B22] leading-relaxed space-y-2">
                <div>
                  <span className="font-bold text-[#2F8F5B] block mb-0.5">{t('result.why')}</span>
                  {q.explanation}
                </div>

                {q.mustRememberRule && (
                  <div className="p-2.5 rounded-xl bg-[#EBF5F0] border border-[#C8E3D3] text-[#1C2B22]">
                    <span className="font-extrabold text-[#2F8F5B] block mb-0.5">{t('result.remember')}</span>
                    {q.mustRememberRule}
                  </div>
                )}

                {q.examTrapAlert && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[#92400E]">
                    <span className="font-extrabold block mb-0.5">{t('result.trap')}</span>
                    {q.examTrapAlert}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

