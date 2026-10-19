'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { PlanList } from '@/components/planner/PlanList';
import { PlanDetail } from '@/components/planner/PlanDetail';
import { PlanCreatorModal } from '@/components/planner/PlanCreatorModal';
import { QuestionSession } from '@/components/questioning/QuestionSession';
import { GapAnalysisReport } from '@/components/questioning/GapAnalysisReport';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { 
  StudyPlan, 
  UserSettings, 
  KnowledgeGap, 
  QuestioningSession as SessionType,
  StudyMode 
} from '@/types/study';
import { 
  loadPlans, 
  savePlans, 
  loadSettings, 
  saveSettings, 
  loadGaps, 
  saveGaps, 
  loadSessions, 
  saveSessions, 
  calculateStats,
  DEFAULT_SETTINGS 
} from '@/lib/storage';

export default function Home() {
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [sessions, setSessions] = useState<SessionType[]>([]);

  const [activeTab, setActiveTab] = useState<'plans' | 'questioning' | 'gaps'>('plans');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);

  // Active questioning target
  const [drillTopic, setDrillTopic] = useState('Distributed Systems & Raft Consensus');
  const [drillMode, setDrillMode] = useState<StudyMode>('socratic');

  // Load persisted state on mount
  useEffect(() => {
    const loadedPlans = loadPlans();
    const loadedSettings = loadSettings();
    const loadedGaps = loadGaps();
    const loadedSessions = loadSessions();

    setPlans(loadedPlans);
    setSettings(loadedSettings);
    setGaps(loadedGaps);
    setSessions(loadedSessions);
    setIsClientLoaded(true);
  }, []);

  // Compute live study analytics
  const stats = calculateStats(plans, sessions);

  // Plan actions
  const handlePlanCreated = (newPlan: StudyPlan) => {
    const updated = [newPlan, ...plans];
    setPlans(updated);
    savePlans(updated);
    setSelectedPlan(newPlan);
  };

  const handleUpdatePlan = (updatedPlan: StudyPlan) => {
    const updated = plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    setPlans(updated);
    savePlans(updated);
    if (selectedPlan?.id === updatedPlan.id) {
      setSelectedPlan(updatedPlan);
    }
  };

  const handleDeletePlan = (planId: string) => {
    const updated = plans.filter(p => p.id !== planId);
    setPlans(updated);
    savePlans(updated);
    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
    }
  };

  // Start question drill
  const handleStartQuestioning = (topic: string, planId?: string, milestoneId?: string) => {
    setDrillTopic(topic);
    setDrillMode('socratic');
    setActiveTab('questioning');
  };

  // Gap actions
  const handleSaveGap = (newGap: KnowledgeGap) => {
    // Avoid exact duplicate gap notes
    const exists = gaps.some(g => g.topic === newGap.topic && g.notes.toLowerCase() === newGap.notes.toLowerCase());
    if (exists) return;

    const updated = [newGap, ...gaps];
    setGaps(updated);
    saveGaps(updated);
  };

  const handleUpdateGaps = (updatedGaps: KnowledgeGap[]) => {
    setGaps(updatedGaps);
    saveGaps(updatedGaps);
  };

  const handleDrillGap = (gapTopic: string) => {
    setDrillTopic(gapTopic);
    setDrillMode('socratic');
    setActiveTab('questioning');
  };

  // Settings update
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Data reload from backup
  const handleDataReloaded = () => {
    setPlans(loadPlans());
    setSettings(loadSettings());
    setGaps(loadGaps());
    setSessions(loadSessions());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'plans') {
            // Keep selected plan if present
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        streakDays={settings.streakDays || 3}
        provider={settings.provider}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab 1: Roadmaps & Plans */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {selectedPlan ? (
              <PlanDetail
                plan={selectedPlan}
                onBack={() => setSelectedPlan(null)}
                onUpdatePlan={handleUpdatePlan}
                onDeletePlan={handleDeletePlan}
                onStartQuestioning={handleStartQuestioning}
              />
            ) : (
              <>
                <StatsRow
                  stats={stats}
                  onNewPlan={() => setIsNewPlanOpen(true)}
                  onQuickDrill={() => {
                    setDrillTopic('System Design & Distributed Architectures');
                    setActiveTab('questioning');
                  }}
                />

                <PlanList
                  plans={plans}
                  onSelectPlan={(plan) => setSelectedPlan(plan)}
                  onNewPlan={() => setIsNewPlanOpen(true)}
                  onStartQuestioning={handleStartQuestioning}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 2: Active AI Questioning */}
        {activeTab === 'questioning' && (
          <div className="animate-in fade-in duration-200">
            <QuestionSession
              key={`${drillTopic}-${drillMode}`}
              initialTopic={drillTopic}
              initialMode={drillMode}
              settings={settings}
              onSaveGap={handleSaveGap}
              onConceptMastered={(score) => {
                // Check if drillTopic matches any concept in plans and update mastery
                let planUpdated = false;
                const nextPlans = plans.map(p => {
                  const nextMilestones = p.milestones.map(m => {
                    const nextConcepts = m.concepts.map(c => {
                      if (c.name.toLowerCase().includes(drillTopic.toLowerCase()) || drillTopic.toLowerCase().includes(c.name.toLowerCase())) {
                        planUpdated = true;
                        return { ...c, masteryScore: Math.max(c.masteryScore, score), lastReviewedAt: new Date().toISOString() };
                      }
                      return c;
                    });
                    return { ...m, concepts: nextConcepts };
                  });
                  return { ...p, milestones: nextMilestones };
                });

                if (planUpdated) {
                  setPlans(nextPlans);
                  savePlans(nextPlans);
                }
              }}
            />
          </div>
        )}

        {/* Tab 3: Knowledge Gap Matrix */}
        {activeTab === 'gaps' && (
          <div className="animate-in fade-in duration-200">
            <GapAnalysisReport
              gaps={gaps}
              onUpdateGaps={handleUpdateGaps}
              onDrillGap={handleDrillGap}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>Studyland &mdash; AI Active Recall, Socratic Questioning & Deep Understanding Cockpit.</p>
      </footer>

      {/* Modals */}
      <PlanCreatorModal
        isOpen={isNewPlanOpen}
        onClose={() => setIsNewPlanOpen(false)}
        onPlanCreated={handlePlanCreated}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onDataReloaded={handleDataReloaded}
      />
    </div>
  );
}
