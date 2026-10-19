'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { QuizQuestion, QuizConfig, QuizResult, MistakeItem } from '@/types/studybub';
import { evaluateShortAnswer } from '@/lib/studybub-ai';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  config: QuizConfig;
  documentText: string;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
  onSaveMistake: (mistake: MistakeItem) => void;
}

export function QuizPlayer({
  questions,
  config,
  documentText,
  onExit,
  onComplete,
  onSaveMistake
}: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Track answered questions
  const [answeredQuestions, setAnsweredQuestions] = useState<QuizQuestion[]>([]);
  const [startTime] = useState<number>(Date.now());

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const progressPct = Math.round(((currentIndex + 1) / total) * 100);

  const letters = ['A', 'B', 'C', 'D'];

  const handleSelectOption = (option: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = async () => {
    if (currentQ.type === 'short') {
      if (!shortAnswerText.trim() || isEvaluating) return;
      setIsEvaluating(true);

      const evaluation = await evaluateShortAnswer(currentQ, shortAnswerText.trim(), documentText);
      setIsEvaluating(false);

      const evaluatedQ: QuizQuestion = {
        ...currentQ,
        userAnswer: shortAnswerText.trim(),
        isCorrect: evaluation.isCorrect,
        aiEvaluation: {
          scorePct: evaluation.scorePct,
          feedback: evaluation.feedback,
          howToImprove: evaluation.howToImprove
        }
      };

      setAnsweredQuestions(prev => [...prev, evaluatedQ]);
      setIsAnswerChecked(true);

      if (evaluation.isCorrect) {
        playChimeSound('success');
      } else {
        playChimeSound('ping');
        onSaveMistake({
          id: `mistake-${Date.now()}`,
          question: evaluatedQ,
          fileName: config.fileName,
          subject: config.subject,
          savedAt: 'Today',
          resolved: false
        });
      }
      return;
    }

    // MCQ or True/False
    if (!selectedOption) return;

    const isCorrect = selectedOption.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    const answeredQ: QuizQuestion = {
      ...currentQ,
      userAnswer: selectedOption,
      isCorrect
    };

    setAnsweredQuestions(prev => [...prev, answeredQ]);
    setIsAnswerChecked(true);

    if (isCorrect) {
      playChimeSound('success');
    } else {
      playChimeSound('ping');
      onSaveMistake({
        id: `mistake-${Date.now()}`,
        question: answeredQ,
        fileName: config.fileName,
        subject: config.subject,
        savedAt: 'Today',
        resolved: false
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption('');
      setShortAnswerText('');
      setIsAnswerChecked(false);
    } else {
      // Quiz Finished!
      const totalCorrect = [...answeredQuestions].filter(q => q.isCorrect).length;
      const secondsSpent = Math.max(10, Math.round((Date.now() - startTime) / 1000));
      const mins = Math.floor(secondsSpent / 60);
      const secs = secondsSpent % 60;
      const formattedTime = `${mins}m ${secs}s`;

      const result: QuizResult = {
        id: `result-${Date.now()}`,
        fileId: config.fileId,
        fileName: config.fileName,
        subject: config.subject,
        score: totalCorrect,
        totalQuestions: total,
        percentage: Math.round((totalCorrect / total) * 100),
        correctCount: totalCorrect,
        wrongCount: total - totalCorrect,
        timeSpentFormatted: formattedTime,
        completedAt: 'Just now',
        questions: answeredQuestions
      };

      triggerConfetti();
      playChimeSound('complete');
      onComplete(result);
    }
  };

  const currentAnswerRecord = answeredQuestions[currentIndex];
  const isCurrentCorrect = currentAnswerRecord?.isCorrect;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Quiz Header Bar (Matching Mockup Screen 5) */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onExit}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#607367] hover:text-[#1C2B22] transition-colors"
          title="Exit Quiz"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 flex-1 mx-4">
          <div className="text-xs font-bold text-[#1C2B22] whitespace-nowrap">
            {currentIndex + 1} / {total}
          </div>
          <div className="w-full bg-[#EBF5F0] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#2F8F5B] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-6">
        
        {/* Question Type Badge */}
        <div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF5F0] text-[#2F8F5B]">
            {currentQ.type === 'mcq'
              ? 'Multiple Choice'
              : currentQ.type === 'tf'
              ? 'True / False'
              : 'Short Answer'}
          </span>
        </div>

        {/* Question Prompt */}
        <h2 className="text-lg md:text-xl font-bold text-[#1C2B22] leading-snug">
          {currentQ.question}
        </h2>

        {/* Answer Options: MCQ or TF */}
        {currentQ.type !== 'short' ? (
          <div className="space-y-3 pt-2">
            {(currentQ.options || ['True', 'False']).map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrectAnswer = isAnswerChecked && option.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
              const isUserWrongChoice = isAnswerChecked && isSelected && !isCurrentCorrect;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswerChecked}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 ${
                    isCorrectAnswer
                      ? 'border-[#2F8F5B] bg-[#EBF5F0] text-[#1C2B22] font-bold ring-2 ring-[#2F8F5B]/30'
                      : isUserWrongChoice
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                      : isSelected
                      ? 'border-[#2F8F5B] bg-[#EBF5F0] text-[#1C2B22] font-bold shadow-sm'
                      : 'border-[#E2EFE7] bg-white text-[#1C2B22] hover:border-[#2F8F5B]/50 hover:bg-[#FAFCF9]'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCorrectAnswer
                      ? 'bg-[#2F8F5B] text-white'
                      : isUserWrongChoice
                      ? 'bg-rose-500 text-white'
                      : isSelected
                      ? 'bg-[#2F8F5B] text-white'
                      : 'bg-[#F4F9F5] text-[#607367]'
                  }`}>
                    {letters[idx] || (idx + 1)}
                  </span>
                  <span className="text-sm md:text-base leading-snug">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Short Answer Input */
          <div className="space-y-3 pt-2">
            <textarea
              rows={4}
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              disabled={isAnswerChecked}
              placeholder="Type your explanation based on the study material..."
              className="w-full p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] placeholder-[#8A9E92] focus:outline-none focus:border-[#2F8F5B]"
            />
          </div>
        )}

        {/* Immediate Feedback Card (Screen 6 in Mockup) */}
        {isAnswerChecked && (
          <div className="space-y-4 pt-4 border-t border-[#E2EFE7] animate-in fade-in duration-200">
            {/* Correct/Incorrect Banner */}
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
              isCurrentCorrect
                ? 'bg-[#EBF5F0] text-[#2F8F5B]'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {isCurrentCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-sm md:text-base block">Correct!</span>
                    <span className="text-xs">Great job! 🎉</span>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-sm md:text-base block">Incorrect.</span>
                    <span className="text-xs">Saved to your Mistake Notebook for review.</span>
                  </div>
                </>
              )}
            </div>

            {/* Explanation Grounded in Material */}
            <div className="p-4 md:p-5 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-2">
              <span className="text-xs font-bold text-[#2F8F5B] uppercase tracking-wider block">
                Explanation
              </span>
              <p className="text-xs md:text-sm text-[#1C2B22] leading-relaxed">
                {currentQ.explanation}
              </p>
              {currentQ.sourceReference && (
                <p className="text-[11px] text-[#8A9E92] pt-1">
                  Reference: {currentQ.sourceReference}
                </p>
              )}

              {/* AI evaluation for short answer */}
              {currentAnswerRecord?.aiEvaluation && (
                <div className="mt-3 pt-3 border-t border-[#E2EFE7] space-y-1.5">
                  <span className="text-xs font-bold text-[#1C2B22]">
                    AI Evaluation ({currentAnswerRecord.aiEvaluation.scorePct}%):
                  </span>
                  <p className="text-xs text-[#607367]">
                    {currentAnswerRecord.aiEvaluation.feedback}
                  </p>
                  <p className="text-xs text-[#2F8F5B] font-medium">
                    💡 {currentAnswerRecord.aiEvaluation.howToImprove}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button: Check Answer or Next Question */}
        <div className="pt-2">
          {!isAnswerChecked ? (
            <button
              onClick={handleCheckAnswer}
              disabled={(currentQ.type === 'short' ? !shortAnswerText.trim() : !selectedOption) || isEvaluating}
              className="w-full py-4 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-40 text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI is evaluating your response...</span>
                </>
              ) : (
                <span>Check Answer</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{currentIndex < total - 1 ? 'Next Question' : 'View Results'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
