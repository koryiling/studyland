'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface FocusTimerProps {
  onStudyMinuteCompleted?: (minutes: number) => void;
}

export function FocusTimer({ onStudyMinuteCompleted }: FocusTimerProps) {
  const [mode, setMode] = useState<'focus25' | 'deep50' | 'break5'>('focus25');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getInitialSeconds = (selectedMode: 'focus25' | 'deep50' | 'break5') => {
    switch (selectedMode) {
      case 'focus25': return 25 * 60;
      case 'deep50': return 50 * 60;
      case 'break5': return 5 * 60;
    }
  };

  const switchMode = (newMode: 'focus25' | 'deep50' | 'break5') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(getInitialSeconds(newMode));
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getInitialSeconds(mode));
  };

  const toggleTimer = () => {
    setIsRunning(prev => !prev);
    playChimeSound('ping');
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChimeSound('complete');
            if (mode !== 'break5') {
              triggerConfetti();
              onStudyMinuteCompleted?.(mode === 'deep50' ? 50 : 25);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, onStudyMinuteCompleted]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
          isRunning 
            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/20 animate-pulse' 
            : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Clock className={`w-4 h-4 ${isRunning ? 'text-indigo-400' : 'text-slate-400'}`} />
        <span className="font-mono tracking-wider">{formattedTime}</span>
        {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Study Focus Timer</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {mode === 'break5' ? 'Break' : 'Focus'}
            </span>
          </div>

          <div className="text-center my-3">
            <div className="font-mono text-4xl font-extrabold tracking-tight text-white">
              {formattedTime}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isRunning ? 'Deep work session in progress...' : 'Ready to lock in?'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-800/60 p-1 rounded-xl mb-4 text-xs font-medium">
            <button
              onClick={() => switchMode('focus25')}
              className={`py-1 rounded-lg transition-all ${
                mode === 'focus25' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              25m Focus
            </button>
            <button
              onClick={() => switchMode('deep50')}
              className={`py-1 rounded-lg transition-all ${
                mode === 'deep50' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              50m Deep
            </button>
            <button
              onClick={() => switchMode('break5')}
              className={`py-1 rounded-lg transition-all ${
                mode === 'break5' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              5m Rest
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleTimer}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                isRunning 
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start Focus
                </>
              )}
            </button>

            <button
              onClick={resetTimer}
              title="Reset timer"
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
