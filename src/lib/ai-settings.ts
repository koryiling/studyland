// Which AI provider the student uses. Kept in localStorage on purpose: personal
// API keys should stay on the student's own device even after data moves to a cloud database.

import { AISettings, AIProvider } from '@/types/studybub';

const KEY = 'studybub_ai_settings_v1';

export const DEFAULT_MODELS: Record<Exclude<AIProvider, 'server'>, string> = {
  gemini: 'gemini-3.8-flash',
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'server',
  apiKeys: {},
  models: {},
};

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      apiKeys: { ...parsed.apiKeys },
      models: { ...parsed.models },
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving AI settings:', err);
  }
}
