'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import type { AIProvider } from '@/types/studybub';
import { loadAISettings } from '@/lib/ai-settings';

const LABELS: Record<AIProvider, string> = {
  server: 'Studyland 免费 AI',
  gemini: '我的 Gemini',
  groq: '我的 Groq（超快）',
  openai: '我的 ChatGPT',
  deepseek: '我的 DeepSeek',
};

// The AIs this student can use right now: the free built-in one plus any they added a key for
export function availableProviders(): AIProvider[] {
  const settings = loadAISettings();
  return ['server', ...(['gemini', 'groq', 'openai', 'deepseek'] as const).filter((p) => settings.apiKeys[p]?.trim())];
}

// Starts on the AI chosen in Profile; changing it here only affects this generation
export function useAIProvider(): [AIProvider, (p: AIProvider) => void, AIProvider[]] {
  const [options] = useState(availableProviders);
  const [provider, setProvider] = useState<AIProvider>(() => {
    const preferred = loadAISettings().provider;
    return options.includes(preferred) ? preferred : 'server';
  });
  return [provider, setProvider, options];
}

export function AIProviderPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: AIProvider;
  options: AIProvider[];
  onChange: (p: AIProvider) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Bot className="w-4 h-4 text-[#2F8F5B] flex-shrink-0" />
      <span className="font-bold text-[#1C2B22] whitespace-nowrap">用哪个 AI</span>
      {options.length > 1 ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as AIProvider)}
          className="flex-1 min-w-0 p-2 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] font-semibold text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
        >
          {options.map((p) => (
            <option key={p} value={p}>{LABELS[p]}</option>
          ))}
        </select>
      ) : (
        <span className="text-[#607367]">
          {LABELS.server} <span className="text-[#8A9E92]">（在 Profile 加入自己的 GPT / DeepSeek Key 就可以选）</span>
        </span>
      )}
    </div>
  );
}
