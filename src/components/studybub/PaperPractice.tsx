'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, ClipboardList, Loader2, ListChecks, Timer, Trash2, RefreshCw } from 'lucide-react';
import { QuizConfig, QuizQuestion, QuizResult, StudyFile } from '@/types/studybub';
import {
  AIRequestError,
  evaluateShortAnswer,
  extractPaperQuestions,
  marksFromScore,
  photoToJpeg,
} from '@/lib/studybub-ai';
import { newId } from '@/lib/studybub-storage';
import { useEstimatedProgress, ProgressBar } from '@/components/ui/AIProgress';
import { AIProviderPicker, useAIProvider } from '@/components/ui/AIProviderPicker';
import { FriendlyNotice } from '@/components/ui/FriendlyNotice';
import { asksForDrawing } from '@/components/ui/DiagramAnswer';
import { playChimeSound, triggerConfetti } from '@/lib/utils';
import { useFormat, useI18n } from '@/lib/i18n';

interface PaperPracticeProps {
  file: StudyFile; // with its text loaded
  previousResults: QuizResult[]; // earlier sittings of this paper
  onBack: () => void;
  onUpdateFile: (file: StudyFile) => void;
  onStartOneByOne: (questions: QuizQuestion[], config: QuizConfig) => void;
  onFinishExam: (result: QuizResult) => void;
  onSaveMistake: (question: QuizQuestion, config: QuizConfig) => void;
}

type Answer = { text: string; photo: string };
const draftKey = (fileId: string) => `studyland_paper_draft_${fileId}`;
const GRADE_AT_ONCE = 3;

// "Answer any THREE questions": only the answered questions count towards the total
function choosesQuestions(instructions: string): boolean {
  return /\bany\b|\bchoose\b|\bpilih\b|任选|任答|选答/i.test(instructions);
}

export function PaperPractice({
  file,
  previousResults,
  onBack,
  onUpdateFile,
  onStartOneByOne,
  onFinishExam,
  onSaveMistake,
}: PaperPracticeProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const paper = file.paperQuestions;
  const [provider, setProvider, providerOptions] = useAIProvider();
  const [phase, setPhase] = useState<'start' | 'exam' | 'grading'>('start');
  const [reading, setReading] = useState(false);
  const [runId, setRunId] = useState(0);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [graded, setGraded] = useState(0);
  const photoFor = useRef<string>('');
  const photoInput = useRef<HTMLInputElement | null>(null);
  const percent = useEstimatedProgress(reading ? runId : null, { index: 0, count: 1, expectedMs: 50_000 });

  const config: QuizConfig = {
    fileId: file.id,
    fileName: file.name,
    subject: file.subject,
    category: 'past_year',
    questionType: 'short',
    difficulty: 'Normal',
    questionCount: paper?.questions.length || 0,
  };

  // Exam clock
  useEffect(() => {
    if (phase !== 'exam') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Typed answers are kept on this device in case the page is closed mid-paper (photos are too big)
  useEffect(() => {
    if (phase !== 'exam') return;
    try {
      const texts = Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, a.text]));
      localStorage.setItem(draftKey(file.id), JSON.stringify(texts));
    } catch {
      // Only a convenience
    }
  }, [answers, phase, file.id]);

  const readPaper = async () => {
    setRunId((r) => r + 1);
    setReading(true);
    setError('');
    try {
      const result = await extractPaperQuestions(file.textContent, file.name, file.subject, provider);
      onUpdateFile({ ...file, paperQuestions: { ...result, extractedAt: new Date().toISOString() } });
      playChimeSound('success');
    } catch (err) {
      setError(err instanceof AIRequestError ? err.message : t('paper.readFailed'));
    } finally {
      setReading(false);
    }
  };

  const startExam = () => {
    let saved: Record<string, string> = {};
    try {
      saved = JSON.parse(localStorage.getItem(draftKey(file.id)) || '{}');
    } catch {
      saved = {};
    }
    const initial: Record<string, Answer> = {};
    for (const q of paper?.questions || []) if (saved[q.id]) initial[q.id] = { text: saved[q.id], photo: '' };
    setAnswers(initial);
    setStartedAt(Date.now());
    setNow(Date.now());
    setPhase('exam');
  };

  const setAnswer = (id: string, patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] || { text: '', photo: '' }), ...patch } }));

  const pickPhoto = async (picked?: File) => {
    const id = photoFor.current;
    if (!picked || !id) return;
    try {
      setAnswer(id, { photo: await photoToJpeg(picked) });
    } catch {
      setError(t('draw.photoFailed'));
    } finally {
      if (photoInput.current) photoInput.current.value = '';
    }
  };

  const isAnswered = (q: QuizQuestion) => Boolean(answers[q.id]?.text.trim() || answers[q.id]?.photo);

  const gradeOne = async (q: QuizQuestion): Promise<QuizQuestion> => {
    const a = answers[q.id];
    if (!a || (!a.text.trim() && !a.photo)) return { ...q, userAnswer: '', isCorrect: false, earnedMarks: 0 };
    const marks = q.marks || 1;
    if (q.type === 'mcq') {
      const isCorrect = a.text.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      return { ...q, userAnswer: a.text, isCorrect, earnedMarks: isCorrect ? marks : 0 };
    }
    const base = {
      ...q,
      userAnswer: a.text.trim() || t('draw.photoAnswer'),
      ...(a.photo && { userAnswerImage: `data:image/jpeg;base64,${a.photo}` }),
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const e = await evaluateShortAnswer(q, a.text.trim(), a.photo || undefined);
        return {
          ...base,
          isCorrect: e.isCorrect,
          earnedMarks: marksFromScore(e.scorePct, marks),
          aiEvaluation: { scorePct: e.scorePct, feedback: e.feedback, howToImprove: e.howToImprove },
        };
      } catch {
        // try once more, then report it honestly
      }
    }
    return {
      ...base,
      isCorrect: false,
      earnedMarks: 0,
      aiEvaluation: { scorePct: 0, feedback: t('paper.gradeFailed'), howToImprove: '' },
    };
  };

  const submit = async () => {
    if (!paper) return;
    const unanswered = paper.questions.filter((q) => !isAnswered(q)).length;
    if (unanswered > 0 && !window.confirm(t('paper.confirmSubmit', { n: unanswered }))) return;
    setPhase('grading');
    setGraded(0);
    const results: QuizQuestion[] = new Array(paper.questions.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: GRADE_AT_ONCE }, async () => {
        while (next < paper.questions.length) {
          const i = next++;
          results[i] = await gradeOne(paper.questions[i]);
          setGraded((g) => g + 1);
        }
      })
    );

    const counted = choosesQuestions(paper.instructions) ? results.filter((q) => q.userAnswer) : results;
    const totalMarks = counted.reduce((s, q) => s + (q.marks || 0), 0);
    const earnedMarks = counted.reduce((s, q) => s + (q.earnedMarks || 0), 0);
    const completedAt = new Date();
    results.filter((q) => q.userAnswer && !q.isCorrect).forEach((q) => onSaveMistake(q, config));
    try {
      localStorage.removeItem(draftKey(file.id));
    } catch {
      // ignore
    }
    triggerConfetti();
    playChimeSound('complete');
    onFinishExam({
      id: newId('result'),
      fileId: file.id,
      fileName: file.name,
      subject: file.subject,
      category: 'past_year',
      correctCount: results.filter((q) => q.isCorrect).length,
      totalQuestions: results.length,
      percentage: totalMarks ? Math.round((earnedMarks / totalMarks) * 100) : 0,
      durationSeconds: Math.round((completedAt.getTime() - startedAt) / 1000),
      startedAt: new Date(startedAt).toISOString(),
      completedAt: completedAt.toISOString(),
      questions: results,
      earnedMarks,
      totalMarks,
    });
  };

  const leave = () => {
    if (phase === 'exam' && Object.keys(answers).length > 0 && !window.confirm(t('paper.confirmLeave'))) return;
    if (phase === 'exam') setPhase('start');
    else onBack();
  };

  const totalMarks = paper?.questions.reduce((s, q) => s + (q.marks || 0), 0) || 0;
  const best = previousResults.reduce<QuizResult | null>((b, r) => (!b || r.percentage > b.percentage ? r : b), null);
  const answeredCount = paper ? paper.questions.filter(isAnswered).length : 0;
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <div className="space-y-5 pb-24 md:pb-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={leave}
          disabled={phase === 'grading'}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors disabled:opacity-40"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">{file.name}</h1>
          <p className="text-xs text-[#8A9E92]">
            {file.subject} · {t('paper.title')}
          </p>
        </div>
      </div>

      {error && <FriendlyNotice message={error} />}

      {phase === 'start' && !paper && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4 text-center">
          <ClipboardList className="w-10 h-10 text-[#D97706] mx-auto" />
          <p className="text-sm text-[#607367]">{t('paper.readIntro')}</p>
          <div className="text-left">
            <AIProviderPicker value={provider} options={providerOptions} onChange={setProvider} disabled={reading} />
          </div>
          <button
            onClick={readPaper}
            disabled={reading || Boolean(file.extractionWarning)}
            className="px-5 py-3 rounded-2xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2"
          >
            {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            {reading ? t('paper.reading') : t('paper.read')}
          </button>
          {reading && <ProgressBar percent={percent} label={t('common.approxProgress')} color="#D97706" />}
          {file.extractionWarning && <p className="text-xs text-amber-700">{file.extractionWarning}</p>}
        </div>
      )}

      {phase === 'start' && paper && (
        <>
          <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-[#F4F9F5]">
                <div className="text-lg font-extrabold text-[#2F8F5B]">{paper.questions.length}</div>
                <div className="text-[10px] text-[#607367]">{t('paper.nQuestions')}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F4F9F5]">
                <div className="text-lg font-extrabold text-[#2F8F5B]">{totalMarks}</div>
                <div className="text-[10px] text-[#607367]">{t('paper.totalMarks')}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FFF8EC]">
                <div className="text-lg font-extrabold text-[#D97706]">{best ? `${best.percentage}%` : '—'}</div>
                <div className="text-[10px] text-[#607367]">{t('paper.best', { n: previousResults.length })}</div>
              </div>
            </div>
            {paper.instructions && <p className="text-xs text-[#92400E] p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">📋 {paper.instructions}</p>}
            <p className="text-[11px] text-[#8A9E92]">{t('paper.aiMarks')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => onStartOneByOne(paper.questions, config)}
              className="p-5 rounded-3xl bg-white border-2 border-[#2F8F5B]/30 hover:border-[#2F8F5B] shadow-sm text-left space-y-1.5 transition-colors"
            >
              <ListChecks className="w-6 h-6 text-[#2F8F5B]" />
              <div className="text-sm font-extrabold text-[#1C2B22]">{t('paper.modeOne')}</div>
              <p className="text-xs text-[#607367]">{t('paper.modeOneSub')}</p>
            </button>
            <button
              onClick={startExam}
              className="p-5 rounded-3xl bg-white border-2 border-[#D97706]/30 hover:border-[#D97706] shadow-sm text-left space-y-1.5 transition-colors"
            >
              <Timer className="w-6 h-6 text-[#D97706]" />
              <div className="text-sm font-extrabold text-[#1C2B22]">{t('paper.modeExam')}</div>
              <p className="text-xs text-[#607367]">{t('paper.modeExamSub')}</p>
            </button>
          </div>

          <details className="p-4 rounded-3xl bg-white border border-[#E2EFE7]">
            <summary className="text-xs font-bold text-[#607367] cursor-pointer">{t('paper.preview')}</summary>
            <ol className="mt-3 space-y-1.5 text-xs text-[#1C2B22]">
              {paper.questions.map((q) => (
                <li key={q.id} className="flex gap-2">
                  <span className="font-bold text-[#D97706] flex-shrink-0">{q.paperNumber}</span>
                  <span className="line-clamp-2 flex-1">{q.question}</span>
                  <span className="text-[#8A9E92] flex-shrink-0">{t('paper.marks', { n: q.marks || 0 })}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={readPaper}
              disabled={reading}
              className="mt-3 text-[11px] font-bold text-[#8A9E92] hover:text-[#2F8F5B] inline-flex items-center gap-1"
            >
              {reading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {reading ? t('paper.reading') : t('paper.reread')}
            </button>
          </details>
        </>
      )}

      {phase !== 'start' && paper && (
        <>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />

          {/* Exam bar */}
          <div className="sticky top-2 z-10 p-3 rounded-2xl bg-white/95 backdrop-blur border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-3">
            <div className="text-xs text-[#607367] flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-bold text-[#1C2B22]">
                <Timer className="w-4 h-4 text-[#D97706]" /> {fmt.duration(elapsed)}
              </span>
              <span>{t('paper.answered', { n: answeredCount, total: paper.questions.length })}</span>
            </div>
            <button
              onClick={submit}
              disabled={phase === 'grading'}
              className="px-4 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-60 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              {phase === 'grading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {phase === 'grading' ? t('paper.grading', { n: graded, total: paper.questions.length }) : t('paper.submit')}
            </button>
          </div>
          {phase === 'grading' && (
            <ProgressBar percent={Math.round((graded / paper.questions.length) * 100)} label={t('paper.gradingHint')} />
          )}
          {paper.instructions && <p className="text-xs text-[#92400E] p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">📋 {paper.instructions}</p>}

          <div className="space-y-4">
            {paper.questions.map((q) => {
              const a = answers[q.id];
              const drawing = asksForDrawing(q);
              return (
                <div key={q.id} className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#D97706]">{q.paperNumber}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">{t('paper.marks', { n: q.marks || 0 })}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1C2B22] whitespace-pre-line leading-relaxed">{q.question}</p>

                  {q.type === 'mcq' && q.options ? (
                    <div className="space-y-2">
                      {q.options.map((o, i) => (
                        <label key={i} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm cursor-pointer ${a?.text === o ? 'border-[#2F8F5B] bg-[#EBF5F0]' : 'border-[#E2EFE7]'}`}>
                          <input
                            type="radio"
                            name={q.id}
                            checked={a?.text === o}
                            disabled={phase === 'grading'}
                            onChange={() => setAnswer(q.id, { text: o })}
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                      <textarea
                        rows={drawing ? 3 : 5}
                        value={a?.text || ''}
                        disabled={phase === 'grading'}
                        onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                        placeholder={drawing ? t('draw.placeholder') : t('paper.placeholder')}
                        className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] placeholder-[#8A9E92] focus:outline-none focus:border-[#2F8F5B]"
                      />
                      {a?.photo ? (
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`data:image/jpeg;base64,${a.photo}`} alt={t('draw.yourPhoto')} className="max-h-40 max-w-[70%] rounded-xl border border-[#E2EFE7] object-contain" />
                          {phase === 'exam' && (
                            <button type="button" onClick={() => setAnswer(q.id, { photo: '' })} className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold inline-flex items-center gap-1">
                              <Trash2 className="w-3.5 h-3.5" /> {t('draw.remove')}
                            </button>
                          )}
                        </div>
                      ) : (
                        phase === 'exam' && (
                          <button
                            type="button"
                            onClick={() => {
                              photoFor.current = q.id;
                              photoInput.current?.click();
                            }}
                            className={`w-full p-3 rounded-2xl border-2 border-dashed text-xs font-bold inline-flex items-center justify-center gap-2 ${
                              drawing ? 'border-[#2F8F5B]/50 bg-[#EBF5F0] text-[#2F8F5B]' : 'border-[#E2EFE7] text-[#607367]'
                            }`}
                          >
                            <Camera className="w-4 h-4" /> {drawing ? t('draw.upload') : t('draw.uploadHandwriting')}
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={submit}
            disabled={phase === 'grading'}
            className="w-full py-4 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-60 text-white font-extrabold text-sm shadow-lg shadow-[#2F8F5B]/25 inline-flex items-center justify-center gap-2"
          >
            {phase === 'grading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {phase === 'grading' ? t('paper.grading', { n: graded, total: paper.questions.length }) : t('paper.submit')}
          </button>
        </>
      )}
    </div>
  );
}
