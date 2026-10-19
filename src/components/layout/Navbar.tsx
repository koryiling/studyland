'use client';

import React from 'react';
import { 
  Sparkles, 
  Settings as SettingsIcon, 
  Flame, 
  Compass, 
  BrainCircuit, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { FocusTimer } from './FocusTimer';

interface NavbarProps {
  activeTab: 'plans' | 'questioning' | 'gaps';
  setActiveTab: (tab: 'plans' | 'questioning' | 'gaps') => void;
  onOpenSettings: () => void;
  streakDays: number;
  provider: string;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenSettings,
  streakDays,
  provider
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                Studyland
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Coach
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Active Recall & Socratic Planning Cockpit
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80 text-sm font-medium">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden md:inline">Roadmaps</span>
          </button>

          <button
            onClick={() => setActiveTab('questioning')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'questioning'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span className="hidden md:inline">Active Questioning</span>
          </button>

          <button
            onClick={() => setActiveTab('gaps')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'gaps'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline">Gap Matrix</span>
          </button>
        </nav>

        {/* Right side tools */}
        <div className="flex items-center gap-2.5">
          {/* Streak pill */}
          <div 
            title={`${streakDays} days study streak!`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20 animate-pulse" />
            <span>{streakDays}d Streak</span>
          </div>

          {/* Pomodoro Timer */}
          <FocusTimer />

          {/* Provider status badge / settings trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-medium"
            title="Configure AI Provider & Settings"
          >
            <SettingsIcon className="w-4 h-4 text-slate-400 hover:rotate-45 transition-transform" />
            <span className="hidden lg:inline capitalize">
              {provider === 'demo' ? 'Simulation Mode' : provider}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}

