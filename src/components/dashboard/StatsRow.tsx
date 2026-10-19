'use client';

import React from 'react';
import { 
  Compass, 
  CheckCircle2, 
  HelpCircle, 
  Award, 
  Timer, 
  Plus, 
  Zap, 
  Target 
} from 'lucide-react';
import { StudyStats } from '@/types/study';

interface StatsRowProps {
  stats: StudyStats;
  onNewPlan: () => void;
  onQuickDrill: () => void;
}

export function StatsRow({ stats, onNewPlan, onQuickDrill }: StatsRowProps) {
  return (
    <div className="space-y-4">
      {/* Quick Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Active Learning Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Turn passive reading into <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent">deep mental models</span>.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Create structured roadmaps for any topic. When you think you understand a concept, let AI ask you probing questions, evaluate your Feynman explanations, and highlight your gaps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={onNewPlan}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan</span>
            </button>
            <button
              onClick={onQuickDrill}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white font-semibold text-sm border border-slate-700 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Quiz Me Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        {/* Metric 1: Roadmaps */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Roadmaps</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.totalPlans}</div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.completedMilestones} milestones mastered
          </div>
        </div>

        {/* Metric 2: Average Mastery */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Mastery Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.averageMasteryScore}%</span>
            <span className="text-xs text-emerald-400 font-medium">Concept Depth</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.averageMasteryScore}%` }}
            />
          </div>
        </div>

        {/* Metric 3: AI Questions Answered */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Questions Answered</span>
            <HelpCircle className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.totalQuestionsAnswered}</div>
          <div className="text-xs text-slate-400 mt-1">
            Active recall dialogues
          </div>
        </div>

        {/* Metric 4: Total Study Time */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Focus Time</span>
            <Timer className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {Math.floor(stats.totalStudyMinutes / 60)}h {stats.totalStudyMinutes % 60}m
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Quality deep work
          </div>
        </div>

      </div>
    </div>
  );
}

