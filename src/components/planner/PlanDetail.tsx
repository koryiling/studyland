'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  BrainCircuit, 
  Sparkles, 
  Trash2, 
  Award, 
  ChevronDown, 
  ChevronRight, 
  Flame, 
  Plus 
} from 'lucide-react';
import { StudyPlan, Milestone, Concept, MasteryStatus } from '@/types/study';
import { playChimeSound } from '@/lib/utils';

interface PlanDetailProps {
  plan: StudyPlan;
  onBack: () => void;
  onUpdatePlan: (updated: StudyPlan) => void;
  onDeletePlan: (planId: string) => void;
  onStartQuestioning: (topic: string, planId?: string, milestoneId?: string) => void;
}

export function PlanDetail({
  plan,
  onBack,
  onUpdatePlan,
  onDeletePlan,
  onStartQuestioning
}: PlanDetailProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({
    [plan.milestones[0]?.id || '']: true
  });

  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateMilestoneStatus = (milestoneId: string, status: MasteryStatus) => {
    const updatedMilestones = plan.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status,
          concepts: m.concepts.map(c => ({
            ...c,
            masteryScore: status === 'mastered' ? Math.max(c.masteryScore, 90) : c.masteryScore
          }))
        };
      }
      return m;
    });

    onUpdatePlan({
      ...plan,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString()
    });

    if (status === 'mastered') {
      playChimeSound('success');
    }
  };

  const totalMilestones = plan.milestones.length;
  const completedMilestones = plan.milestones.filter(m => m.status === 'mastered').length;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roadmaps</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartQuestioning(plan.title, plan.id)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Quiz Entire Plan</span>
          </button>
          <button
            onClick={() => onDeletePlan(plan.id)}
            title="Delete this roadmap"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Plan Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {plan.category}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {plan.difficulty}
          </span>
          {plan.targetDays && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {plan.targetDays} Days Target
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {plan.title}
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-2 leading-relaxed">
            {plan.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Roadmap Progress</span>
            <span className="text-indigo-300">{completedMilestones} of {totalMilestones} Mastered ({progressPct}%)</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Milestones & Understanding Checkpoints ({plan.milestones.length})
          </h2>
        </div>

        <div className="space-y-3">
          {plan.milestones.map((m, idx) => {
            const isExpanded = expandedMilestones[m.id];
            const isMastered = m.status === 'mastered';
            const isInProgress = m.status === 'in-progress';

            return (
              <div
                key={m.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isMastered
                    ? 'bg-slate-900/40 border-emerald-500/30'
                    : isInProgress
                    ? 'bg-slate-900/90 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                    : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                {/* Milestone Row */}
                <div className="p-4 md:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() =>
                        updateMilestoneStatus(
                          m.id,
                          isMastered ? 'todo' : isInProgress ? 'mastered' : 'in-progress'
                        )
                      }
                      title="Toggle milestone status"
                      className="flex-shrink-0"
                    >
                      {isMastered ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Circle className={`w-6 h-6 ${isInProgress ? 'text-indigo-400' : 'text-slate-600'} hover:text-indigo-300`} />
                      )}
                    </button>

                    <div 
                      className="cursor-pointer flex-1 min-w-0" 
                      onClick={() => toggleMilestone(m.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                        <h3 className={`text-base font-semibold truncate ${isMastered ? 'text-slate-300 line-through opacity-80' : 'text-white'}`}>
                          {m.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{m.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onStartQuestioning(m.title, plan.id, m.id)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                      title="Drill this milestone with AI Socratic questions"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Test Understanding</span>
                    </button>

                    <button
                      onClick={() => toggleMilestone(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Concepts */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Concepts to Articulate & Master:</span>
                      <button
                        onClick={() => onStartQuestioning(m.title, plan.id, m.id)}
                        className="sm:hidden text-indigo-400 font-semibold flex items-center gap-1"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" /> Drill Milestone
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {m.concepts.map((concept) => (
                        <div
                          key={concept.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white">{concept.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                concept.masteryScore >= 80 
                                  ? 'bg-emerald-500/20 text-emerald-300' 
                                  : concept.masteryScore > 0 
                                  ? 'bg-amber-500/20 text-amber-300' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {concept.masteryScore}% Mastery
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {concept.summary}
                            </p>
                            {concept.keyPoints && concept.keyPoints.length > 0 && (
                              <ul className="mt-2 space-y-0.5">
                                {concept.keyPoints.slice(0, 2).map((kp, kpIdx) => (
                                  <li key={kpIdx} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                                    {kp}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <button
                            onClick={() => onStartQuestioning(concept.name, plan.id, m.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-300 text-xs font-semibold transition-all border border-slate-700/60"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Drill Concept</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
