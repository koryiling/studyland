'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  Award, 
  RotateCcw, 
  Lightbulb, 
  Loader2, 
  Zap, 
  ArrowRight, 
  BookOpen, 
  Check, 
  MessageSquare 
} from 'lucide-react';
import { StudyMode, DialogueTurn, SessionAssessment, UserSettings, KnowledgeGap } from '@/types/study';
import { callAI } from '@/lib/ai/client';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { playChimeSound, triggerConfetti } from '@/lib/utils';
import { FeynmanEvaluationResponse, GenerateQuizResponse, GradeQuizResponse, SocraticTurnResponse } from '@/types/ai';

interface QuestionSessionProps {
  initialTopic: string;
  initialMode?: StudyMode;
  planId?: string;
  milestoneId?: string;
  settings: UserSettings;
  onSaveGap: (gap: KnowledgeGap) => void;
  onConceptMastered?: (score: number) => void;
  onClose?: () => void;
}

export function QuestionSession({
  initialTopic,
  initialMode = 'socratic',
  planId,
  milestoneId,
  settings,
  onSaveGap,
  onConceptMastered,
  onClose
}: QuestionSessionProps) {
  const [topic, setTopic] = useState(initialTopic || 'Distributed Systems & Raft Consensus');
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  
  // Socratic State
  const [turns, setTurns] = useState<DialogueTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [assessment, setAssessment] = useState<SessionAssessment | null>(null);

  // Feynman State
  const [feynmanText, setFeynmanText] = useState('');
  const [feynmanResult, setFeynmanResult] = useState<FeynmanEvaluationResponse | null>(null);

  // Quiz State
  const [quizData, setQuizData] = useState<GenerateQuizResponse | null>(null);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizGrades, setQuizGrades] = useState<Record<number, GradeQuizResponse>>({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new dialogue turn
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isLoading]);

  // Initiate Socratic Coach or Quiz on first mount / topic change
  const startSession = async (targetMode: StudyMode = mode, targetTopic: string = topic) => {
    setIsLoading(true);
    setSessionCompleted(false);
    setAssessment(null);
    setTurns([]);
    setFeynmanResult(null);
    setQuizData(null);
    setQuizGrades({});
    setCurrentQuizIdx(0);

    try {
      if (targetMode === 'socratic') {
        const res = await callAI<SocraticTurnResponse>(
          {
            action: 'socratic-turn',
            topic: targetTopic,
            difficulty,
            userMessage: '',
            history: []
          },
          settings
        );

        setTurns([
          {
            id: `turn-init-${Date.now()}`,
            role: 'assistant',
            content: res.data.reply,
            timestamp: new Date().toISOString(),
            feedback: res.data.feedback
          }
        ]);
        playChimeSound('ping');
      } else if (targetMode === 'quiz') {
        const res = await callAI<GenerateQuizResponse>(
          {
            action: 'generate-quiz',
            topic: targetTopic,
            difficulty
          },
          settings
        );
        setQuizData(res.data);
        playChimeSound('ping');
      }
    } catch (err: any) {
      console.error('Error starting session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    startSession(mode, topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Socratic Turn Submission
  const handleSendSocraticAnswer = async () => {
    if (!userInput.trim() || isLoading) return;

    const userText = userInput.trim();
    setUserInput('');

    const newTurns: DialogueTurn[] = [
      ...turns,
      {
        id: `turn-user-${Date.now()}`,
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString()
      }
    ];

    setTurns(newTurns);
    setIsLoading(true);

    try {
      const history = newTurns.map(t => ({ role: t.role, content: t.content }));
      const res = await callAI<SocraticTurnResponse>(
        {
          action: 'socratic-turn',
          topic,
          difficulty,
          userMessage: userText,
          history
        },
        settings
      );

      const aiReplyTurn: DialogueTurn = {
        id: `turn-ai-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        timestamp: new Date().toISOString(),
        feedback: res.data.feedback
      };

      setTurns([...newTurns, aiReplyTurn]);

      // Check if knowledge gaps detected in user's response
      if (res.data.feedback?.gaps && res.data.feedback.gaps.length > 0) {
        res.data.feedback.gaps.forEach(gapText => {
          onSaveGap({
            id: `gap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            topic,
            concept: topic,
            notes: gapText,
            severity: 'medium',
            createdAt: new Date().toISOString(),
            resolved: false
          });
        });
      }

      if (res.data.isSessionFinished || newTurns.filter(t => t.role === 'user').length >= 3) {
        setSessionCompleted(true);
        triggerConfetti();
        playChimeSound('complete');

        const finalScore = res.data.feedback?.score || 88;
        onConceptMastered?.(finalScore);

        setAssessment({
          overallScore: finalScore,
          strengths: res.data.feedback?.strengths || ['Demonstrated solid mental model', 'Clear causal thinking'],
          gaps: res.data.feedback?.gaps || [],
          keyTakeaway: `You navigated the core principles and edge cases of ${topic} with clarity.`,
          recommendedReviewConcepts: res.data.feedback?.gaps?.length ? res.data.feedback.gaps : ['Ready for advanced practical implementation']
        });
      } else {
        playChimeSound('ping');
      }
    } catch (err) {
      console.error('Socratic turn error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Feynman Evaluation Submission
  const handleEvaluateFeynman = async () => {
    if (!feynmanText.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const res = await callAI<FeynmanEvaluationResponse>(
        {
          action: 'evaluate-feynman',
          topic,
          difficulty,
          userMessage: feynmanText.trim()
        },
        settings
      );

      setFeynmanResult(res.data);
      onConceptMastered?.(res.data.score);

      if (res.data.missedConnections && res.data.missedConnections.length > 0) {
        res.data.missedConnections.forEach(gap => {
          onSaveGap({
            id: `gap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            topic,
            concept: topic,
            notes: gap,
            severity: 'medium',
            createdAt: new Date().toISOString(),
            resolved: false
          });
        });
      }

      if (res.data.score >= 80) {
        triggerConfetti();
        playChimeSound('complete');
      } else {
        playChimeSound('ping');
      }
    } catch (err) {
      console.error('Feynman eval error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quiz Answer Submission
  const handleGradeQuizAnswer = async () => {
    if (!quizAnswer.trim() || !quizData || isLoading) return;
    setIsLoading(true);

    const questionItem = quizData.questions[currentQuizIdx];

    try {
      const res = await callAI<GradeQuizResponse>(
        {
          action: 'grade-quiz-answer',
          topic,
          difficulty,
          context: `Question: "${questionItem.question}" (Criteria: ${questionItem.sampleAnswerCriteria})`,
          userMessage: quizAnswer.trim()
        },
        settings
      );

      setQuizGrades(prev => ({
        ...prev,
        [currentQuizIdx]: res.data
      }));

      if (res.data.missingElements && res.data.missingElements.length > 0) {
        res.data.missingElements.forEach(elem => {
          onSaveGap({
            id: `gap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            topic,
            concept: topic,
            notes: elem,
            severity: 'medium',
            createdAt: new Date().toISOString(),
            resolved: false
          });
        });
      }

      if (res.data.score >= 85) {
        playChimeSound('success');
      } else {
        playChimeSound('ping');
      }
    } catch (err) {
      console.error('Grade quiz error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Session Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Understanding Verification Drill
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              {topic}
            </h1>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => { setMode('socratic'); startSession('socratic', topic); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'socratic'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Socratic Coach</span>
            </button>

            <button
              onClick={() => { setMode('feynman'); setFeynmanResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'feynman'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Feynman Technique</span>
            </button>

            <button
              onClick={() => { setMode('quiz'); startSession('quiz', topic); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Diagnostic Quiz</span>
            </button>
          </div>
        </div>

        {/* Topic quick selector / modifier */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs text-slate-400">Drilling Topic:</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 bg-transparent text-sm text-indigo-300 font-medium focus:outline-none focus:underline"
            placeholder="Change focus topic..."
          />
          <button
            onClick={() => startSession(mode, topic)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Restart
          </button>
        </div>
      </div>

      {/* MODE 1: SOCRATIC COACH DIALOGUE */}
      {mode === 'socratic' && (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
          {/* Chat Transcript */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[600px]">
            {turns.length === 0 && isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">Synthesizing probing Socratic questions for {topic}...</p>
              </div>
            )}

            {turns.map((turn) => {
              const isAi = turn.role === 'assistant';
              return (
                <div
                  key={turn.id}
                  className={`flex gap-3.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[85%] ${isAi ? '' : 'items-end'}`}>
                    <div
                      className={`p-5 rounded-2xl ${
                        isAi
                          ? 'bg-slate-800/80 border border-slate-700/60 text-slate-100 shadow-md'
                          : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      }`}
                    >
                      <MarkdownView content={turn.content} />
                    </div>

                    {/* AI Feedback Badge for User Turn */}
                    {isAi && turn.feedback && (
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                            Diagnostic Understanding Feedback
                          </span>
                          {turn.feedback.score !== undefined && (
                            <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              {turn.feedback.score}% Depth
                            </span>
                          )}
                        </div>

                        {turn.feedback.coachNote && (
                          <p className="text-slate-300 italic">
                            💡 &ldquo;{turn.feedback.coachNote}&rdquo;
                          </p>
                        )}

                        {turn.feedback.strengths && turn.feedback.strengths.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {turn.feedback.strengths.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {turn.feedback.gaps && turn.feedback.gaps.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {turn.feedback.gaps.map((g, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-800/50">
                                ⚠ Gap: {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && turns.length > 0 && (
              <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Socrates is evaluating your mental model and preparing the next question...</span>
              </div>
            )}

            {/* Assessment Card if finished */}
            {sessionCompleted && assessment && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/50 border border-indigo-500/40 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Socratic Drill Completed!</h3>
                  </div>
                  <span className="text-lg font-extrabold px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {assessment.overallScore}% Mastery Verified
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed">
                  {assessment.keyTakeaway}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 space-y-1.5">
                    <span className="text-xs font-semibold text-emerald-400">Strong Mental Models:</span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {assessment.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/20 space-y-1.5">
                    <span className="text-xs font-semibold text-indigo-400">Next Focus Areas:</span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {(assessment.recommendedNextSteps || assessment.recommendedReviewConcepts || []).map((step: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => startSession('socratic', topic)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Drill Again</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          {!sessionCompleted && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/90">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendSocraticAnswer();
                }}
                className="flex items-center gap-3"
              >
                <textarea
                  rows={2}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendSocraticAnswer();
                    }
                  }}
                  placeholder="Articulate your answer or reasoning here (Shift+Enter for newline)..."
                  className="flex-1 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !userInput.trim()}
                  className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-lg shadow-indigo-600/30 flex-shrink-0"
                  title="Send answer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: FEYNMAN TECHNIQUE DRILL */}
      {mode === 'feynman' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  The Feynman Challenge: Explain Without Jargon
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Explain <strong>{topic}</strong> as if teaching a smart 10-year-old or someone completely new to the field. 
                  Avoid buzzwords. Use physical analogies.
                </p>
              </div>
            </div>

            <textarea
              rows={6}
              value={feynmanText}
              onChange={(e) => setFeynmanText(e.target.value)}
              placeholder={`"Imagine you have two friends who need to agree on what movie to watch, but they can only send paper airplanes across a windy playground..."`}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Word count: {feynmanText.trim() ? feynmanText.trim().split(/\s+/).length : 0} words
              </span>
              <button
                onClick={handleEvaluateFeynman}
                disabled={isLoading || !feynmanText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Feynman is evaluating clarity...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Evaluate Clarity & Analogies</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feynman Results */}
          {feynmanResult && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clarity Assessment</span>
                  <h4 className="text-xl font-bold text-white mt-0.5">{feynmanResult.clarityRating}</h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-300">{feynmanResult.score}/100</span>
                  <span className="block text-[11px] text-slate-400">Simplicity Score</span>
                </div>
              </div>

              {/* Strengths & Jargon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">What You Explained Well</span>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {feynmanResult.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Unexplained Jargon / Vague Terms</span>
                  {feynmanResult.jargonOrVaguePhrases.length > 0 ? (
                    <ul className="text-xs text-slate-300 space-y-1.5">
                      {feynmanResult.jargonOrVaguePhrases.map((jargon, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <span>{jargon}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-400 italic">No unexplained buzzwords detected! Great plain English.</p>
                  )}
                </div>
              </div>

              {/* Memorable Analogy */}
              <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> Recommended Physical Analogy
                </span>
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  &ldquo;{feynmanResult.suggestedAnalogy}&rdquo;
                </p>
              </div>

              {/* Ultimate Challenge Question */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Ultimate Mastery Challenge Question
                </span>
                <p className="text-sm text-slate-200 font-medium">
                  {feynmanResult.challengeQuestion}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: DIAGNOSTIC QUIZ */}
      {mode === 'quiz' && (
        <div className="space-y-6">
          {isLoading && !quizData && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm">Synthesizing 3 progressive diagnostic questions...</p>
            </div>
          )}

          {quizData && (
            <div className="space-y-6">
              {/* Question Navigation Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {quizData.questions.map((q, idx) => {
                  const grade = quizGrades[idx];
                  const isActive = currentQuizIdx === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuizIdx(idx);
                        setQuizAnswer('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : grade
                          ? 'bg-slate-900 border-emerald-500/40 text-slate-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="capitalize">{q.type} Drill</span>
                        {grade && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {grade.score}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs truncate font-medium">Question {idx + 1}</div>
                    </button>
                  );
                })}
              </div>

              {/* Current Question Display */}
              {(() => {
                const question = quizData.questions[currentQuizIdx];
                const grade = quizGrades[currentQuizIdx];

                return (
                  <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Question {currentQuizIdx + 1} of 3 • {question.type}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
                        {question.question}
                      </h3>
                      {question.hint && (
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Hint: {question.hint}
                        </p>
                      )}
                    </div>

                    {!grade ? (
                      <div className="space-y-4">
                        <textarea
                          rows={4}
                          value={quizAnswer}
                          onChange={(e) => setQuizAnswer(e.target.value)}
                          placeholder="Type your explanation or solution here..."
                          className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleGradeQuizAnswer}
                            disabled={isLoading || !quizAnswer.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Grading your answer...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Submit & Grade Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-in fade-in">
                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Evaluation</span>
                            <span className="text-base font-extrabold px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300">
                              {grade.score}% Understanding
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">{grade.evaluation}</p>

                          {grade.strengths.length > 0 && (
                            <div className="pt-1">
                              <span className="text-xs font-semibold text-emerald-400">Strengths:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {grade.strengths.map((str, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                                    ✓ {str}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {grade.missingElements.length > 0 && (
                            <div className="pt-1">
                              <span className="text-xs font-semibold text-rose-400">Knowledge Gaps:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {grade.missingElements.map((elem, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                                    ⚠ {elem}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ideal explanation */}
                        <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                            Ideal Conceptual Answer
                          </span>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {grade.idealExplanation}
                          </p>
                        </div>

                        {/* Next question navigation */}
                        <div className="flex justify-end gap-3 pt-2">
                          {currentQuizIdx < 2 ? (
                            <button
                              onClick={() => {
                                setCurrentQuizIdx(prev => prev + 1);
                                setQuizAnswer('');
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                            >
                              <span>Next Question</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                triggerConfetti();
                                playChimeSound('complete');
                                onConceptMastered?.(88);
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
                            >
                              <Award className="w-4 h-4" />
                              <span>Complete Diagnostic Drill</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
