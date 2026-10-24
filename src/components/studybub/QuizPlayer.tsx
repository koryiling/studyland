'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Camera,
  Trash2
} from 'lucide-react';
import { QuizQuestion, QuizConfig, QuizResult } from '@/types/studybub';
import { evaluateShortAnswer, photoToJpeg, AIRequestError } from '@/lib/studybub-ai';
import { DiagramAnswer, asksForDrawing } from '@/components/ui/DiagramAnswer';
import { newId } from '@/lib/studybub-storage';
import { playChimeSound, triggerConfetti } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { QuestionPicture } from '@/components/ui/QuestionPicture';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  config: QuizConfig;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
  onSaveMistake: (question: QuizQuestion, config: QuizConfig) => void;
}

export function QuizPlayer({
  questions,
  config,
  onExit,
  onComplete,
  onSaveMistake
}: QuizPlayerProps) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gradingError, setGradingError] = useState('');
  // Photo of a handwritten answer / drawn diagram (base64 JPEG)
  const [photo, setPhoto] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef<HTMLInputElement | null>(null);

  // Track answered questions
  const [answeredQuestions, setAnsweredQuestions] = useState<QuizQuestion[]>([]);
  const [startTime] = useState(() => new Date());

  const currentQ = questions[currentIndex];
  const total = questions.length;

  if (!currentQ) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-sm text-[#607367]">{t('player.empty')}</p>
        <button onClick={onExit} className="px-5 py-2.5 rounded-2xl bg-[#2F8F5B] text-white text-sm font-bold">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / total) * 100);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const handleSelectOption = (option: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(option);
  };

  const recordAnswer = (answeredQ: QuizQuestion) => {
    setAnsweredQuestions(prev => [...prev, answeredQ]);
    setIsAnswerChecked(true);
    setGradingError('');
    if (answeredQ.isCorrect) {
      playChimeSound('success');
    } else {
      playChimeSound('ping');
      onSaveMistake(answeredQ, config);
    }
  };

  const handleCheckAnswer = async () => {
    if (currentQ.type === 'short') {
      const answer = shortAnswerText.trim();
      if ((!answer && !photo) || isEvaluating) return;
      setIsEvaluating(true);
      setGradingError('');
      try {
        const evaluation = await evaluateShortAnswer(currentQ, answer, photo || undefined);
        recordAnswer({
          ...currentQ,
          userAnswer: answer || t('draw.photoAnswer'),
          ...(photo && { userAnswerImage: `data:image/jpeg;base64,${photo}` }),
          isCorrect: evaluation.isCorrect,
          aiEvaluation: {
            scorePct: evaluation.scorePct,
            feedback: evaluation.feedback,
            howToImprove: evaluation.howToImprove
          }
        });
      } catch (err) {
        // Don't invent a grade: show the model answer and let the student judge
        setGradingError(err instanceof AIRequestError ? err.message : t('player.gradeFailed'));
      } finally {
        setIsEvaluating(false);
      }
      return;
    }

    // MCQ or True/False
    if (!selectedOption) return;
    const isCorrect = selectedOption.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    recordAnswer({ ...currentQ, userAnswer: selectedOption, isCorrect });
  };

  const handleSelfAssess = (isCorrect: boolean) => {
    recordAnswer({
      ...currentQ,
      userAnswer: shortAnswerText.trim() || t('draw.photoAnswer'),
      ...(photo && { userAnswerImage: `data:image/jpeg;base64,${photo}` }),
      isCorrect,
      selfAssessed: true,
    });
  };

  const handlePickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      setPhoto(await photoToJpeg(file));
    } catch {
      setPhotoError(t('draw.photoFailed'));
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption('');
      setShortAnswerText('');
      setPhoto('');
      setPhotoError('');
      setIsAnswerChecked(false);
      setGradingError('');
    } else {
      // Quiz Finished!
      const completedAt = new Date();
      const totalCorrect = answeredQuestions.filter(q => q.isCorrect).length;

      const result: QuizResult = {
        id: newId('result'),
        fileId: config.fileId,
        fileName: config.fileName,
        subject: config.subject,
        category: config.category,
        correctCount: totalCorrect,
        totalQuestions: total,
        percentage: Math.round((totalCorrect / total) * 100),
        durationSeconds: Math.round((completedAt.getTime() - startTime.getTime()) / 1000),
        startedAt: startTime.toISOString(),
        completedAt: completedAt.toISOString(),
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
          title={t('player.exit')}
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
        
        {/* Question Type Badge & Past Year Similar Tag */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF5F0] text-[#2F8F5B]">
            {t(currentQ.type === 'mcq' ? 'quiz.type.mcq' : currentQ.type === 'tf' ? 'quiz.type.tf' : 'quiz.type.short')}
          </span>

          {currentQ.isPastYearSimilar && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex items-center gap-1">
              <span>{t('player.pastYearTag')}</span>
              {currentQ.similarOriginalQuestion && (
                <span className="font-normal opacity-90 hidden sm:inline">
                  • {currentQ.similarOriginalQuestion}
                </span>
              )}
            </span>
          )}
        </div>

        {currentQ.image && <QuestionPicture key={currentQ.id} src={currentQ.image} source={currentQ.imageSource} />}

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
                  key={`${idx}-${option}`}
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
              disabled={isAnswerChecked || Boolean(gradingError)}
              placeholder={asksForDrawing(currentQ) ? t('draw.placeholder') : t('player.placeholder')}
              className="w-full p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] placeholder-[#8A9E92] focus:outline-none focus:border-[#2F8F5B]"
            />

            {/* Space for a photo of the drawn diagram or handwritten working */}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePickPhoto(e.target.files?.[0])}
            />
            {photo ? (
              <div className="p-3 rounded-2xl border border-[#E2EFE7] bg-[#FAFCF9] flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/jpeg;base64,${photo}`} alt={t('draw.yourPhoto')} className="max-h-48 max-w-[70%] rounded-xl border border-[#E2EFE7] bg-white object-contain" />
                {!isAnswerChecked && (
                  <div className="flex flex-col gap-2 text-xs font-bold">
                    <button type="button" onClick={() => photoInput.current?.click()} className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EFE7] text-[#2F8F5B] inline-flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> {t('draw.retake')}
                    </button>
                    <button type="button" onClick={() => setPhoto('')} className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 inline-flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> {t('draw.remove')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              !isAnswerChecked && (
                <button
                  type="button"
                  disabled={photoBusy || Boolean(gradingError)}
                  onClick={() => photoInput.current?.click()}
                  className={`w-full p-4 rounded-2xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                    asksForDrawing(currentQ)
                      ? 'border-[#2F8F5B]/50 bg-[#EBF5F0] text-[#2F8F5B] hover:bg-[#DCEDE4]'
                      : 'border-[#E2EFE7] text-[#607367] hover:border-[#2F8F5B]/40'
                  }`}
                >
                  {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span>{asksForDrawing(currentQ) ? t('draw.upload') : t('draw.uploadHandwriting')}</span>
                </button>
              )
            )}
            {!photo && !isAnswerChecked && asksForDrawing(currentQ) && <p className="text-[11px] text-[#8A9E92]">{t('draw.hint')}</p>}
            {photoError && <p className="text-xs text-rose-600">{photoError}</p>}

            {gradingError && !isAnswerChecked && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{t('player.selfCheck', { error: gradingError })}</span>
                </div>
                <p className="text-xs text-[#1C2B22] bg-white rounded-xl p-3 border border-amber-100">
                  <span className="font-bold text-[#2F8F5B]">{t('player.modelAnswer')}</span>{currentQ.correctAnswer}
                </p>
                <DiagramAnswer diagram={currentQ.diagramAnswer} />
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSelfAssess(true)}
                    className="py-2 rounded-xl bg-[#2F8F5B] text-white text-xs font-bold"
                  >
                    {t('player.iGotIt')}
                  </button>
                  <button
                    onClick={() => handleSelfAssess(false)}
                    className="py-2 rounded-xl bg-white border border-rose-300 text-rose-600 text-xs font-bold"
                  >
                    {t('player.iMissed')}
                  </button>
                  <button
                    onClick={handleCheckAnswer}
                    disabled={isEvaluating}
                    className="py-2 rounded-xl bg-white border border-[#E2EFE7] text-[#607367] text-xs font-bold"
                  >
                    {isEvaluating ? t('player.grading') : t('player.retryGrade')}
                  </button>
                </div>
              </div>
            )}
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
                    <span className="font-extrabold text-sm md:text-base block">{t('player.correct')}</span>
                    <span className="text-xs">{t('player.correctSub')}</span>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-sm md:text-base block">{t('player.incorrect')}</span>
                    <span className="text-xs">{t('player.incorrectSub')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Explanation Grounded in Material */}
            <div className="p-4 md:p-5 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-3">
              {currentQ.type === 'short' && (
                <p className="text-xs md:text-sm text-[#1C2B22]">
                  <span className="font-bold text-[#2F8F5B]">{t('player.modelAnswer')}</span>{currentQ.correctAnswer}
                </p>
              )}
              <DiagramAnswer diagram={currentQ.diagramAnswer} />
              <div>
                <span className="text-xs font-bold text-[#2F8F5B] uppercase tracking-wider block">
                  {t('player.explanation')}
                </span>
                <p className="text-xs md:text-sm text-[#1C2B22] leading-relaxed mt-1">
                  {currentQ.explanation}
                </p>
                {currentQ.sourceReference && (
                  <p className="text-[11px] text-[#8A9E92] pt-1">
                    {t('player.reference', { ref: currentQ.sourceReference })}
                  </p>
                )}
              </div>

              {/* PAST YEAR DRILL DIAGNOSTIC: 应该要记得的东西 & 历年陷阱 */}
              {currentQ.mustRememberRule && (
                <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#C8E3D3] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#2F8F5B]">
                    <span>{t('player.mustRemember')}</span>
                  </div>
                  <p className="text-xs text-[#1C2B22] font-medium leading-relaxed">
                    {currentQ.mustRememberRule}
                  </p>
                </div>
              )}

              {currentQ.examTrapAlert && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#D97706]">
                    <span>{t('player.trap')}</span>
                  </div>
                  <p className="text-xs text-[#92400E] leading-relaxed">
                    {currentQ.examTrapAlert}
                  </p>
                </div>
              )}

              {currentQ.scoringRubric && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569]">
                  <span className="font-bold text-[#334155] block mb-0.5">{t('player.rubric')}</span>
                  {currentQ.scoringRubric}
                </div>
              )}

              {/* AI evaluation for short answer */}
              {currentAnswerRecord?.aiEvaluation && (
                <div className="mt-2 pt-3 border-t border-[#E2EFE7] space-y-1.5">
                  <span className="text-xs font-bold text-[#1C2B22]">
                    {t('player.aiGrade', { pct: currentAnswerRecord.aiEvaluation.scorePct })}
                  </span>
                  <p className="text-xs text-[#607367]">
                    {currentAnswerRecord.aiEvaluation.feedback}
                  </p>
                  <p className="text-xs text-[#2F8F5B] font-medium">
                    {t('player.improve', { tip: currentAnswerRecord.aiEvaluation.howToImprove })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button: Check Answer or Next Question */}
        <div className="pt-2">
          {!isAnswerChecked ? (!gradingError &&
            <button
              onClick={handleCheckAnswer}
              disabled={(currentQ.type === 'short' ? !shortAnswerText.trim() && !photo : !selectedOption) || isEvaluating || photoBusy}
              className="w-full py-4 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-40 text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('player.evaluating')}</span>
                </>
              ) : (
                <span>{t('player.check')}</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{currentIndex < total - 1 ? t('player.next') : t('player.results')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}

