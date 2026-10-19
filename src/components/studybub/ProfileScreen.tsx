'use client';

import React, { useState } from 'react';
import { 
  Award, 
  History, 
  BookMarked, 
  Settings as SettingsIcon, 
  HelpCircle, 
  ChevronRight, 
  Check, 
  Key, 
  RotateCcw, 
  ShieldCheck, 
  Trash2 
} from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';
import { UserProfile, MistakeItem, QuizResult } from '@/types/studybub';
import { playChimeSound } from '@/lib/utils';

interface ProfileScreenProps {
  profile: UserProfile;
  mistakes: MistakeItem[];
  quizHistory: QuizResult[];
  onUpdateProfile: (profile: UserProfile) => void;
  onClearMistakes?: () => void;
  onSelectMistakeQuiz?: (mistake: MistakeItem) => void;
}

export function ProfileScreen({
  profile,
  mistakes,
  quizHistory,
  onUpdateProfile,
  onClearMistakes,
  onSelectMistakeQuiz
}: ProfileScreenProps) {
  const [activeModal, setActiveModal] = useState<'progress' | 'history' | 'mistakes' | 'settings' | 'help' | null>(null);
  const [formData, setFormData] = useState<UserProfile>({ ...profile });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = () => {
    onUpdateProfile(formData);
    setSaveSuccess(true);
    playChimeSound('success');
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveModal(null);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Profile Header (Screen 10 in Mockup) */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] border border-[#DCEDE4] flex items-center justify-center flex-shrink-0 shadow-inner">
          <StudyBubMascot mood="icon" size={50} />
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22]">
            StudyBub
          </h1>
          <p className="text-xs md:text-sm text-[#2F8F5B] font-semibold mt-0.5">
            Keep going! 🌿
          </p>
        </div>
      </div>

      {/* Menu List matching Screen 10 in Mockup */}
      <div className="p-3 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-1">
        
        {/* Item 1: My Progress */}
        <button
          onClick={() => setActiveModal('progress')}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#1C2B22]">My Progress</span>
              <p className="text-[11px] text-[#8A9E92]">Accuracy & questions answered</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Item 2: My Quiz History */}
        <button
          onClick={() => setActiveModal('history')}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#1C2B22]">My Quiz History</span>
              <p className="text-[11px] text-[#8A9E92]">{quizHistory.length} completed sessions</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Item 3: Favorite Topics & Mistake Notebook */}
        <button
          onClick={() => setActiveModal('mistakes')}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <BookMarked className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#1C2B22]">Mistake Notebook (错题本)</span>
              <p className="text-[11px] text-[#8A9E92]">{mistakes.length} questions to review</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Item 4: AI Settings */}
        <button
          onClick={() => setActiveModal('settings')}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#1C2B22]">AI Provider & Keys</span>
              <p className="text-[11px] text-[#8A9E92] capitalize">{profile.aiProvider === 'demo' ? 'Smart Simulator Active' : profile.aiProvider}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Item 5: Help & Feedback */}
        <button
          onClick={() => setActiveModal('help')}
          className="w-full p-4 rounded-2xl hover:bg-[#EBF5F0] transition-colors flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F4F9F5] text-[#607367] flex items-center justify-center">
              <HelpCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#1C2B22]">Help & Feedback</span>
              <p className="text-[11px] text-[#8A9E92]">How to learn best with StudyBub</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8A9E92] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* MODAL 1: PROGRESS */}
      {activeModal === 'progress' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C2B22]">My Learning Progress</h3>
              <button onClick={() => setActiveModal(null)} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">Accuracy Rate</span>
                <div className="text-2xl font-black text-[#2F8F5B] mt-1">{profile.accuracyRate}%</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">Questions Answered</span>
                <div className="text-2xl font-black text-[#1C2B22] mt-1">{profile.totalQuestionsAnswered}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">Quizzes Completed</span>
                <div className="text-2xl font-black text-[#1C2B22] mt-1">{profile.quizzesCompleted}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7]">
                <span className="text-[11px] font-bold text-[#8A9E92] uppercase">Study Streak</span>
                <div className="text-2xl font-black text-[#D97706] mt-1">🔥 {profile.streakDays}d</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MISTAKE NOTEBOOK */}
      {activeModal === 'mistakes' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E2EFE7]">
              <div>
                <h3 className="text-base font-bold text-[#1C2B22]">Mistake Notebook (错题本)</h3>
                <p className="text-xs text-[#8A9E92]">{mistakes.length} questions to master</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {mistakes.length === 0 ? (
                <div className="text-center py-12 text-[#8A9E92]">
                  <p className="text-sm font-bold text-[#1C2B22]">No mistakes saved yet!</p>
                  <p className="text-xs mt-1">When you get questions wrong during a quiz, they will appear here.</p>
                </div>
              ) : (
                mistakes.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2F8F5B]">{m.subject}</span>
                      <span className="text-[#8A9E92]">{m.fileName}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#1C2B22]">{m.question.question}</h4>
                    <p className="text-xs text-[#2F8F5B] font-semibold">Correct: {m.question.correctAnswer}</p>
                    <p className="text-xs text-[#607367] leading-relaxed">{m.question.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AI SETTINGS */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C2B22]">AI Provider & API Keys</h3>
                <span className="text-[11px] text-[#2F8F5B] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Keys stored safely in your browser
                </span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">Close</button>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">
                Select AI Engine
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'demo', label: 'Smart Simulator', sub: 'Zero setup required' },
                  { id: 'gemini', label: 'Google Gemini', sub: 'Generous free tier' },
                  { id: 'openai', label: 'OpenAI', sub: 'GPT-4o / GPT-4o-mini' },
                  { id: 'ollama', label: 'Local Ollama', sub: '100% offline & private' }
                ].map(prov => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, aiProvider: prov.id as any })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.aiProvider === prov.id
                        ? 'bg-[#EBF5F0] border-[#2F8F5B] text-[#1C2B22] font-bold'
                        : 'bg-[#F4F9F5] border-[#E2EFE7] text-[#607367]'
                    }`}
                  >
                    <div className="text-xs">{prov.label}</div>
                    <div className="text-[10px] text-[#8A9E92] font-normal">{prov.sub}</div>
                  </button>
                ))}
              </div>

              {formData.aiProvider === 'gemini' && (
                <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] space-y-2">
                  <label className="block text-xs font-bold text-[#1C2B22]">Gemini API Key</label>
                  <input
                    type="password"
                    value={formData.geminiApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full p-2.5 rounded-xl bg-white border border-[#E2EFE7] text-xs font-mono"
                  />
                </div>
              )}

              {formData.aiProvider === 'openai' && (
                <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] space-y-2">
                  <label className="block text-xs font-bold text-[#1C2B22]">OpenAI API Key</label>
                  <input
                    type="password"
                    value={formData.openaiApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full p-2.5 rounded-xl bg-white border border-[#E2EFE7] text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-[#8A9E92]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
              >
                {saveSuccess ? 'Saved! ✓' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HELP */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C2B22]">How to Learn with StudyBub</h3>
              <button onClick={() => setActiveModal(null)} className="text-xs text-[#8A9E92] hover:text-[#1C2B22]">Close</button>
            </div>
            <div className="text-xs text-[#1C2B22] leading-relaxed space-y-2.5">
              <p>1. <strong>Upload Materials:</strong> Drag and drop your school slides (.pptx), study notes (.pdf), or study guides (.docx).</p>
              <p>2. <strong>Generate Quiz:</strong> Choose question types (Multiple Choice, True/False, or Short Answer) and difficulty.</p>
              <p>3. <strong>Immediate Feedback:</strong> StudyBub checks each answer instantly and explains the underlying concept with direct references to your notes.</p>
              <p>4. <strong>Mistake Notebook:</strong> Any question you miss is automatically saved so you can review and practice it later!</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
