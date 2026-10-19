'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Key, 
  Server, 
  Download, 
  Upload, 
  Check, 
  Sparkles, 
  HelpCircle, 
  ShieldCheck, 
  RotateCcw 
} from 'lucide-react';
import { UserSettings } from '@/types/study';
import { exportBackupData, importBackupData, DEFAULT_SETTINGS } from '@/lib/storage';
import { playChimeSound } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onDataReloaded?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onDataReloaded
}: SettingsModalProps) {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [savedNotice, setSavedNotice] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedNotice(true);
    playChimeSound('success');
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleExport = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyland-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playChimeSound('ping');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupData(content);
      if (success) {
        setImportNotice('Data restored successfully!');
        playChimeSound('success');
        onDataReloaded?.();
      } else {
        setImportNotice('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Studyland Settings</h2>
              <p className="text-xs text-slate-400">AI provider models, API keys, and data storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI Provider Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select AI Intelligence Engine
              </label>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Keys stored locally in your browser
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'demo', label: 'Simulator', desc: 'No keys needed' },
                { id: 'gemini', label: 'Google Gemini', desc: 'Fast & free tier' },
                { id: 'openai', label: 'OpenAI', desc: 'GPT-4o models' },
                { id: 'ollama', label: 'Local Ollama', desc: 'Private & offline' }
              ].map(prov => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, provider: prov.id as any })}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    formData.provider === prov.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{prov.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{prov.desc}</div>
                </button>
              ))}
            </div>

            {/* Provider Specific Settings */}
            {formData.provider === 'gemini' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1 font-semibold">
                    <span>Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      Get Free Key &rarr;
                    </a>
                  </div>
                  <input
                    type="password"
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Model</label>
                  <select
                    value={formData.geminiModel}
                    onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Fastest & smart)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Deep reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {formData.provider === 'openai' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1 font-semibold">
                    <span>OpenAI API Key</span>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      Get Key &rarr;
                    </a>
                  </div>
                  <input
                    type="password"
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Model</label>
                  <select
                    value={formData.openaiModel}
                    onChange={(e) => setFormData({ ...formData, openaiModel: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & economical)</option>
                    <option value="gpt-4o">gpt-4o (High capability)</option>
                  </select>
                </div>
              </div>
            )}

            {formData.provider === 'ollama' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">Ollama Base URL</label>
                  <input
                    type="text"
                    value={formData.ollamaBaseUrl}
                    onChange={(e) => setFormData({ ...formData, ollamaBaseUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">Model Name</label>
                  <input
                    type="text"
                    value={formData.ollamaModel}
                    onChange={(e) => setFormData({ ...formData, ollamaModel: e.target.value })}
                    placeholder="llama3.2"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ensure Ollama is running (`ollama serve`). Supports `llama3.2`, `mistral`, `deepseek-r1`, etc.
                  </p>
                </div>
              </div>
            )}

            {formData.provider === 'demo' && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-indigo-300 block mb-1">
                  💡 Zero-Config Smart Simulator Active
                </span>
                You can immediately create study roadmaps, test Socratic questions, and evaluate your explanations with rich contextual feedback without needing any API keys.
              </div>
            )}
          </div>

          {/* Daily Goal */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Daily Study Goal (Minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                max="300"
                step="5"
                value={formData.dailyGoalMinutes}
                onChange={(e) => setFormData({ ...formData, dailyGoalMinutes: Number(e.target.value) })}
                className="w-28 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400">minutes of active learning per day</span>
            </div>
          </div>

          {/* Backup & Data Management */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Backup & Data Sovereignty
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Data (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {importNotice && (
              <p className="text-xs text-emerald-400 font-medium">{importNotice}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setFormData({ ...DEFAULT_SETTINGS });
              playChimeSound('ping');
            }}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset to Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
