'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Layers, 
  Check, 
  Plus, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { StudyPlan, Milestone, UserSettings } from '@/types/study';
import { callAI } from '@/lib/ai/client';
import { GeneratedPlanResponse } from '@/types/ai';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface PlanCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: StudyPlan) => void;
  settings: UserSettings;
}

const TOPIC_SUGGESTIONS = [
  'Distributed Systems & Raft',
  'Rust Concurrency & Lifetimes',
  'Transformers & Attention Mechanisms',
  'PostgreSQL Indexing & Query Optimization',
  'Kubernetes Architecture',
  'Financial Accounting & Cash Flows'
];

export function PlanCreatorModal({
  isOpen,
  onClose,
  onPlanCreated,
  settings
}: PlanCreatorModalProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [targetDays, setTargetDays] = useState(14);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMsg('Please specify a topic or learning goal.');
      return;
    }
    setErrorMsg('');
    setIsGenerating(true);

    try {
      const res = await callAI<GeneratedPlanResponse>(
        {
          action: 'generate-plan',
          topic: topic.trim(),
          difficulty,
          context: `Target completion timeframe: ${targetDays} days.`
        },
        settings
      );

      setGeneratedPlan(res.data);
      playChimeSound('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate study plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!generatedPlan) return;

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      title: generatedPlan.title,
      description: generatedPlan.description,
      category: generatedPlan.category || 'General',
      difficulty: generatedPlan.difficulty || difficulty,
      targetDays: generatedPlan.targetDays || targetDays,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: generatedPlan.milestones.map((m, idx) => ({
        id: `m-${Date.now()}-${idx}`,
        title: m.title,
        description: m.description,
        order: idx + 1,
        status: 'todo',
        estimatedMinutes: m.estimatedMinutes || 45,
        concepts: m.concepts.map((c, cIdx) => ({
          id: `c-${Date.now()}-${idx}-${cIdx}`,
          name: c.name,
          summary: c.summary,
          keyPoints: c.keyPoints || [],
          masteryScore: 0
        }))
      }))
    };

    onPlanCreated(newPlan);
    playChimeSound('complete');
    triggerConfetti();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create New Study Roadmap</h2>
              <p className="text-xs text-slate-400">Generate a structured learning path with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!generatedPlan ? (
            <div className="space-y-5">
              {/* Topic Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  What do you want to learn and master?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Raft Distributed Consensus, Quantum Computing, Microeconomics..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>
                )}
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-2">Quick Ideas:</span>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_SUGGESTIONS.map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setTopic(sugg)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options: Difficulty & Timeframe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                    Target Depth / Level
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                          difficulty === lvl 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                    Target Timeframe
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    {[
                      { days: 7, label: '7 Days' },
                      { days: 14, label: '14 Days' },
                      { days: 30, label: '30 Days' },
                    ].map((item) => (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => setTargetDays(item.days)}
                        className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                          targetDays === item.days 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Synthesizing Cognitive Roadmap...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate AI Roadmap</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Review & Edit Generated Plan */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {generatedPlan.difficulty} • {generatedPlan.targetDays} Days
                    </span>
                    <h3 className="text-xl font-bold text-white mt-2">{generatedPlan.title}</h3>
                    <p className="text-sm text-slate-300 mt-1">{generatedPlan.description}</p>
                  </div>
                  <button
                    onClick={() => setGeneratedPlan(null)}
                    className="text-xs text-slate-400 hover:text-indigo-300 underline"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Milestones & Focus Concepts ({generatedPlan.milestones.length})
                </h4>

                {generatedPlan.milestones.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{m.title}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {m.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{m.description}</p>
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {m.concepts.map((c, cIdx) => (
                        <span 
                          key={cIdx}
                          className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300"
                          title={c.summary}
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generatedPlan && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
            <button
              onClick={() => setGeneratedPlan(null)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleSavePlan}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save & Start Learning</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
