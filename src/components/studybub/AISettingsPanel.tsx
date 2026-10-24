'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { AIProvider, AISettings } from '@/types/studybub';
import { DEFAULT_MODELS, loadAISettings, saveAISettings } from '@/lib/ai-settings';
import { getServerAIStatus, testAIConnection, AIRequestError } from '@/lib/studybub-ai';
import { playChimeSound } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/i18n';

type OwnProvider = Exclude<AIProvider, 'server'>;

// Provider names stay as brand names; descriptions and guides are translated
export const PROVIDER_NAMES: Record<OwnProvider, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
  openai: 'OpenAI (GPT)',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  anthropic: 'Claude',
};

const PROVIDERS: Array<{ id: AIProvider; sub: MessageKey }> = [
  { id: 'server', sub: 'ai.serverSub' },
  { id: 'gemini', sub: 'ai.geminiSub' },
  { id: 'groq', sub: 'ai.groqSub' },
  { id: 'openai', sub: 'ai.openaiSub' },
  { id: 'openrouter', sub: 'ai.openrouterSub' },
  { id: 'deepseek', sub: 'ai.deepseekSub' },
  { id: 'anthropic', sub: 'ai.anthropicSub' },
];

const GUIDES: Record<OwnProvider, { url: string; urlLabel: string; keyHint: string }> = {
  gemini: { url: 'https://aistudio.google.com/apikey', urlLabel: 'Google AI Studio', keyHint: 'AIza...' },
  groq: { url: 'https://console.groq.com/keys', urlLabel: 'Groq Console', keyHint: 'gsk_...' },
  openai: { url: 'https://platform.openai.com/api-keys', urlLabel: 'OpenAI Platform', keyHint: 'sk-...' },
  openrouter: { url: 'https://openrouter.ai/settings/keys', urlLabel: 'OpenRouter', keyHint: 'sk-or-...' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', urlLabel: 'DeepSeek Platform', keyHint: 'sk-...' },
  anthropic: { url: 'https://console.anthropic.com/settings/keys', urlLabel: 'Claude Console', keyHint: 'sk-ant-...' },
};

interface AISettingsPanelProps {
  onClose: () => void;
}

export function AISettingsPanel({ onClose }: AISettingsPanelProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<AISettings>(() => loadAISettings());
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [testState, setTestState] = useState<{ status: 'idle' | 'testing' | 'ok' | 'error'; message?: string }>({ status: 'idle' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getServerAIStatus()
      .then((s) => setServerConfigured(s.serverKeyConfigured))
      .catch(() => setServerConfigured(false));
  }, []);

  const provider = form.provider;
  const own = provider === 'server' ? null : provider;
  const providerLabel = (id: AIProvider) => (id === 'server' ? t('ai.server') : id === 'groq' ? t('ai.groq') : PROVIDER_NAMES[id]);

  const update = (next: AISettings) => {
    setForm(next);
    setTestState({ status: 'idle' });
  };

  const handleTest = async () => {
    setTestState({ status: 'testing' });
    try {
      await testAIConnection(form);
      setTestState({ status: 'ok', message: t('ai.testOk') });
    } catch (err) {
      setTestState({ status: 'error', message: err instanceof AIRequestError ? err.message : t('ai.testFailed') });
    }
  };

  const handleSave = () => {
    saveAISettings(form);
    setSaved(true);
    playChimeSound('success');
    setTimeout(onClose, 600);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">{t('ai.choose')}</label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                update({ ...form, provider: p.id });
                setShowGuide(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                provider === p.id
                  ? 'bg-[#EBF5F0] border-[#2F8F5B] text-[#1C2B22] font-bold'
                  : 'bg-[#F4F9F5] border-[#E2EFE7] text-[#607367]'
              }`}
            >
              <div className="text-xs">{providerLabel(p.id)}</div>
              <div className="text-[10px] text-[#8A9E92] font-normal">{t(p.sub)}</div>
            </button>
          ))}
        </div>
      </div>

      {provider === 'server' && (
        <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs text-[#607367] space-y-1">
          {serverConfigured === null ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('ai.checking')}</span>
          ) : serverConfigured ? (
            <span className="flex items-center gap-1.5 text-[#2F8F5B] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('ai.serverOn')}
            </span>
          ) : (
            <span className="flex items-start gap-1.5 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {t('ai.serverOff')}
            </span>
          )}
          <p>{t('ai.serverShared')}</p>
        </div>
      )}

      {own && (
        <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] space-y-3">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#2F8F5B]"
          >
            <span>{t('ai.howTo', { name: PROVIDER_NAMES[own] })}</span>
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showGuide && (
            <div className="text-xs text-[#1C2B22] space-y-2 bg-white rounded-xl p-3 border border-[#E2EFE7]">
              <a
                href={GUIDES[own].url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#2F8F5B] hover:underline"
              >
                {t('ai.open', { name: GUIDES[own].urlLabel })} <ExternalLink className="w-3 h-3" />
              </a>
              <ol className="list-decimal pl-4 space-y-1">
                {t(`ai.guide.${own}.steps` as MessageKey).split('\n').map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="text-[#607367]">{t(`ai.guide.${own}.note` as MessageKey)}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#1C2B22]">{t('ai.key')}</label>
            <input
              type="password"
              autoComplete="off"
              value={form.apiKeys[own] || ''}
              onChange={(e) => update({ ...form, apiKeys: { ...form.apiKeys, [own]: e.target.value.trim() } })}
              placeholder={GUIDES[own].keyHint}
              className="w-full p-2.5 rounded-xl bg-white border border-[#E2EFE7] text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#1C2B22]">{t('ai.model')}</label>
            <input
              type="text"
              value={form.models[own] || ''}
              onChange={(e) => update({ ...form, models: { ...form.models, [own]: e.target.value.trim() } })}
              placeholder={DEFAULT_MODELS[own]}
              className="w-full p-2.5 rounded-xl bg-white border border-[#E2EFE7] text-xs font-mono"
            />
          </div>

          <p className="text-[11px] text-[#607367] flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-[#2F8F5B]" />
            {t('ai.keyPrivacy', { name: PROVIDER_NAMES[own] })}
          </p>
        </div>
      )}

      {testState.status !== 'idle' && (
        <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
          testState.status === 'ok'
            ? 'bg-[#EBF5F0] text-[#2F8F5B]'
            : testState.status === 'error'
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-[#F4F9F5] text-[#607367]'
        }`}>
          {testState.status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : testState.status === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{testState.status === 'testing' ? t('ai.testing') : testState.message}</span>
        </div>
      )}

      <div className="pt-1 flex items-center justify-between gap-2">
        <button
          onClick={handleTest}
          disabled={testState.status === 'testing' || (own !== null && !form.apiKeys[own])}
          className="px-4 py-2 rounded-xl bg-white border border-[#E2EFE7] text-xs font-bold text-[#1C2B22] disabled:opacity-40"
        >
          {t('ai.test')}
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#8A9E92]">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
          >
            {saved ? t('ai.saved') : t('ai.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}
