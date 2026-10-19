'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Sparkles, 
  BrainCircuit, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Check 
} from 'lucide-react';
import { KnowledgeGap } from '@/types/study';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface GapAnalysisReportProps {
  gaps: KnowledgeGap[];
  onUpdateGaps: (gaps: KnowledgeGap[]) => void;
  onDrillGap: (topic: string) => void;
}

export function GapAnalysisReport({
  gaps,
  onUpdateGaps,
  onDrillGap
}: GapAnalysisReportProps) {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [newGapConcept, setNewGapConcept] = useState('');
  const [newGapNotes, setNewGapNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleGapResolved = (gapId: string) => {
    const updated = gaps.map(g => {
      if (g.id === gapId) {
        const nextResolved = !g.resolved;
        if (nextResolved) {
          playChimeSound('success');
          triggerConfetti();
        }
        return { ...g, resolved: nextResolved };
      }
      return g;
    });
    onUpdateGaps(updated);
  };

  const deleteGap = (gapId: string) => {
    const updated = gaps.filter(g => g.id !== gapId);
    onUpdateGaps(updated);
  };

  const handleAddCustomGap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGapConcept.trim()) return;

    const newGap: KnowledgeGap = {
      id: `gap-${Date.now()}`,
      topic: newGapConcept.trim(),
      concept: newGapConcept.trim(),
      notes: newGapNotes.trim() || 'Self-identified knowledge gap to review.',
      severity: 'medium',
      createdAt: new Date().toISOString(),
      resolved: false
    };

    onUpdateGaps([newGap, ...gaps]);
    setNewGapConcept('');
    setNewGapNotes('');
    setIsAdding(false);
    playChimeSound('ping');
  };

  const filteredGaps = gaps.filter(g => {
    if (filter === 'unresolved') return !g.resolved;
    if (filter === 'resolved') return g.resolved;
    return true;
  });

  const unresolvedCount = gaps.filter(g => !g.resolved).length;
  const resolvedCount = gaps.filter(g => g.resolved).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cognitive Gap Matrix
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-2">
            Target & Eliminate Weak Spots
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Whenever an AI Socratic question or quiz identifies a misconception or missing connection, it lands here. Drill them until resolved!
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Gap</span>
        </button>
      </div>

      {/* Add Custom Gap Form */}
      {isAdding && (
        <form onSubmit={handleAddCustomGap} className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Record Knowledge Gap</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={newGapConcept}
            onChange={(e) => setNewGapConcept(e.target.value)}
            placeholder="Concept or Topic (e.g. Raft Randomized Election Timeout)"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <textarea
            rows={2}
            value={newGapNotes}
            onChange={(e) => setNewGapNotes(e.target.value)}
            placeholder="What exactly felt fuzzy or incomplete?"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Save Gap
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'unresolved' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Needs Review ({unresolvedCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'resolved' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mastered ({resolvedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({gaps.length})
          </button>
        </div>
      </div>

      {/* Gaps List */}
      <div className="space-y-3">
        {filteredGaps.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-slate-900/30 border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">No knowledge gaps in this view!</p>
            <p className="text-xs">Take an AI diagnostic quiz or Socratic drill to test your comprehension.</p>
          </div>
        ) : (
          filteredGaps.map((gap) => (
            <div
              key={gap.id}
              className={`p-4 md:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                gap.resolved
                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <button
                  onClick={() => toggleGapResolved(gap.id)}
                  title={gap.resolved ? 'Mark as unresolved' : 'Mark as mastered'}
                  className="mt-0.5 flex-shrink-0"
                >
                  {gap.resolved ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300">{gap.topic}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                      {gap.severity} priority
                    </span>
                  </div>
                  <p className={`text-sm mt-1 leading-relaxed ${gap.resolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {gap.notes}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!gap.resolved && (
                  <button
                    onClick={() => onDrillGap(gap.concept || gap.topic)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Drill Now</span>
                  </button>
                )}
                <button
                  onClick={() => deleteGap(gap.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
