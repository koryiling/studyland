'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Home, 
  Plus, 
  BookOpen, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { QuizResult, QuizQuestion } from '@/types/studybub';
import { playChimeSound } from '@/lib/utils';

interface QuizResultViewProps {
  result: QuizResult;
  onBackToHome: () => void;
  onTryAgain: () => void;
  onAddTaskToPlan: (title: string, subject: string) => void;
}

export function QuizResultView({
  result,
  onBackToHome,
  onTryAgain,
  onAddTaskToPlan
}: QuizResultViewProps) {
  const [showReviewMistakes, setShowReviewMistakes] = useState(false);
  const [addedTaskNotice, setAddedTaskNotice] = useState(false);

  const wrongQuestions = result.questions.filter(q => !q.isCorrect);

  const handleAddFollowupTask = () => {
    onAddTaskToPlan(`Review ${result.subject} Mistakes (${result.wrongCount} Qs)`, result.subject);
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
          Quiz Completed!
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
              Your Score
            </span>
            <div className="text-3xl md:text-4xl font-black text-[#1C2B22] mt-0.5">
              {result.score} <span className="text-lg text-[#8A9E92] font-semibold">/ {result.totalQuestions}</span>
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
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">Correct</div>
            <div className="text-lg font-bold text-[#2F8F5B] mt-0.5">{result.correctCount}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">Wrong</div>
            <div className="text-lg font-bold text-rose-500 mt-0.5">{result.wrongCount}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-[#8A9E92]">Time</div>
            <div className="text-lg font-bold text-[#1C2B22] mt-0.5">{result.timeSpentFormatted}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {wrongQuestions.length > 0 && (
            <button
              onClick={() => setShowReviewMistakes(!showReviewMistakes)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#EBF5F0] hover:bg-[#DCEDE4] text-[#2F8F5B] font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{showReviewMistakes ? 'Hide Mistakes' : `Review Mistakes (${wrongQuestions.length})`}</span>
              {showReviewMistakes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleAddFollowupTask}
            disabled={addedTaskNotice}
            className="w-full py-3.5 px-5 rounded-2xl bg-white border border-[#2F8F5B] text-[#2F8F5B] hover:bg-[#EBF5F0] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{addedTaskNotice ? 'Added to Study Plan! ✓' : 'Add Follow-up Study Task'}</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full py-4 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>

      {/* Review Mistakes Section */}
      {showReviewMistakes && wrongQuestions.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
            Review Incorrect Answers ({wrongQuestions.length})
          </h3>

          {wrongQuestions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Question {idx + 1}
                </span>
              </div>

              <h4 className="text-sm md:text-base font-bold text-[#1C2B22]">
                {q.question}
              </h4>

              <div className="space-y-1 text-xs">
                <div className="text-rose-600 font-medium">
                  Your Answer: <span className="line-through">{q.userAnswer || 'None'}</span>
                </div>
                <div className="text-[#2F8F5B] font-bold">
                  Correct Answer: {q.correctAnswer}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] text-xs text-[#1C2B22] leading-relaxed">
                <span className="font-bold text-[#2F8F5B] block mb-1">Explanation:</span>
                {q.explanation}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
