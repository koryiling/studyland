'use client';

import React from 'react';
import { 
  Compass, 
  ArrowRight, 
  BrainCircuit, 
  Clock, 
  CheckCircle, 
  Plus, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { StudyPlan } from '@/types/study';

interface PlanListProps {
  plans: StudyPlan[];
  onSelectPlan: (plan: StudyPlan) => void;
  onNewPlan: () => void;
  onStartQuestioning: (topic: string, planId?: string) => void;
}

export function PlanList({
  plans,
  onSelectPlan,
  onNewPlan,
  onStartQuestioning
}: PlanListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Your Active Learning Roadmaps</h2>
          <p className="text-xs text-slate-400 mt-0.5">Pick a roadmap to review milestones or drill concepts with AI</p>
        </div>
        <button
          onClick={onNewPlan}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Roadmap</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Create Plan Card */}
        <div
          onClick={onNewPlan}
          className="group cursor-pointer p-6 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-indigo-950/10 transition-all flex flex-col items-center justify-center text-center min-h-[220px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Plan a New Subject</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Let AI build a step-by-step cognitive curriculum for any topic in seconds.
          </p>
          <span className="mt-4 text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Existing Plan Cards */}
        {plans.map((plan) => {
          const totalMilestones = plan.milestones.length;
          const completedMilestones = plan.milestones.filter(m => m.status === 'mastered').length;
          const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

          return (
            <div
              key={plan.id}
              className="group relative p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {plan.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {plan.difficulty}
                  </span>
                </div>

                <div 
                  onClick={() => onSelectPlan(plan)}
                  className="cursor-pointer"
                >
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                    {plan.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {plan.description}
                  </p>
                </div>
              </div>

              <div className="pt-5 space-y-4">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Mastery</span>
                    <span className="text-indigo-300">{completedMilestones}/{totalMilestones} Milestones ({progressPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => onSelectPlan(plan)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors text-center"
                  >
                    View Roadmap
                  </button>
                  <button
                    onClick={() => onStartQuestioning(plan.title, plan.id)}
                    title="Drill this roadmap with Socratic questioning"
                    className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                  >
                    <BrainCircuit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

