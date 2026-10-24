'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { AIProvider, AISettings } from '@/types/studybub';
import { DEFAULT_MODELS, loadAISettings, saveAISettings } from '@/lib/ai-settings';
import { getServerAIStatus, testAIConnection, AIRequestError } from '@/lib/studybub-ai';
import { playChimeSound } from '@/lib/utils';

type OwnProvider = Exclude<AIProvider, 'server'>;

const PROVIDERS: Array<{ id: AIProvider; label: string; sub: string }> = [
  { id: 'server', label: 'Studyland 内置 AI', sub: '免费 · 无需设置' },
  { id: 'gemini', label: 'Google Gemini', sub: '自己的 Key · 有免费额度' },
  { id: 'openai', label: 'OpenAI (GPT)', sub: '自己的 Key · 按用量付费' },
  { id: 'deepseek', label: 'DeepSeek', sub: '自己的 Key · 价格低' },
];

const GUIDES: Record<OwnProvider, { url: string; urlLabel: string; keyHint: string; steps: string[]; note: string }> = {
  gemini: {
    url: 'https://aistudio.google.com/apikey',
    urlLabel: 'Google AI Studio',
    keyHint: 'AIza...',
    steps: [
      '打开 Google AI Studio，用你的 Google 账号登录。',
      '点击「Create API key」（创建 API 密钥）。',
      '复制以 AIza 开头的 Key，粘贴到下面的输入框。',
    ],
    note: '免费额度有每分钟和每天的请求次数限制，用完需要等一段时间。免费版的数据可能会被 Google 用于改进产品，请不要上传敏感或私人的资料。',
  },
  openai: {
    url: 'https://platform.openai.com/api-keys',
    urlLabel: 'OpenAI Platform',
    keyHint: 'sk-...',
    steps: [
      '打开 OpenAI Platform 并登录（和 ChatGPT 是同一个账号）。',
      '在 Billing 页面先充值。注意：ChatGPT Plus 订阅不包含 API 额度，需要另外充值。',
      '回到 API keys 页面，点击「Create new secret key」。',
      '复制以 sk- 开头的 Key（只会显示一次），粘贴到下面的输入框。',
    ],
    note: 'OpenAI 按用量收费，生成一份测验一般只需要很少的费用。可以在 OpenAI 网站设置每月用量上限。',
  },
  deepseek: {
    url: 'https://platform.deepseek.com/api_keys',
    urlLabel: 'DeepSeek 开放平台',
    keyHint: 'sk-...',
    steps: [
      '打开 DeepSeek 开放平台，注册并登录。',
      '在「充值」页面充值少量金额（按用量计费，价格很低）。',
      '进入「API keys」，点击「创建 API key」。',
      '复制以 sk- 开头的 Key，粘贴到下面的输入框。',
    ],
    note: 'DeepSeek 对中文资料的理解很好，费用也比较低。',
  },
};

interface AISettingsPanelProps {
  onClose: () => void;
}

export function AISettingsPanel({ onClose }: AISettingsPanelProps) {
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

  const update = (next: AISettings) => {
    setForm(next);
    setTestState({ status: 'idle' });
  };

  const handleTest = async () => {
    setTestState({ status: 'testing' });
    try {
      await testAIConnection(form);
      setTestState({ status: 'ok', message: '连接成功，可以使用！' });
    } catch (err) {
      setTestState({ status: 'error', message: err instanceof AIRequestError ? err.message : '这次没能连上，请检查 Key 再试一次。' });
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
        <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">选择 AI</label>
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
              <div className="text-xs">{p.label}</div>
              <div className="text-[10px] text-[#8A9E92] font-normal">{p.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {provider === 'server' && (
        <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs text-[#607367] space-y-1">
          {serverConfigured === null ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 检查中…</span>
          ) : serverConfigured ? (
            <span className="flex items-center gap-1.5 text-[#2F8F5B] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> 内置 AI 已启用（Google Gemini 免费额度）
            </span>
          ) : (
            <span className="flex items-start gap-1.5 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              这个网站还没有配置内置 AI。请选择上面其中一个 AI，并填写你自己的 API Key（Gemini 有免费额度）。
            </span>
          )}
          <p>内置 AI 由所有用户共用免费额度，使用人多时可能需要稍等。想要更稳定，可以使用自己的 Key。</p>
        </div>
      )}

      {own && (
        <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] space-y-3">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#2F8F5B]"
          >
            <span>📖 如何获取 {PROVIDERS.find((p) => p.id === own)?.label} API Key？</span>
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
                打开 {GUIDES[own].urlLabel} <ExternalLink className="w-3 h-3" />
              </a>
              <ol className="list-decimal pl-4 space-y-1">
                {GUIDES[own].steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="text-[#607367]">{GUIDES[own].note}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#1C2B22]">API Key</label>
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
            <label className="block text-xs font-bold text-[#1C2B22]">模型（一般不用改）</label>
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
            你的 Key 只保存在这个浏览器里。使用时会经过 Studyland 服务器转发给 {PROVIDERS.find((p) => p.id === own)?.label}，服务器不会记录或保存它。请不要把 Key 分享给别人；如果泄露了，请到服务商网站删除并重新创建。
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
          <span>{testState.status === 'testing' ? '正在测试连接…' : testState.message}</span>
        </div>
      )}

      <div className="pt-1 flex items-center justify-between gap-2">
        <button
          onClick={handleTest}
          disabled={testState.status === 'testing' || (own !== null && !form.apiKeys[own])}
          className="px-4 py-2 rounded-xl bg-white border border-[#E2EFE7] text-xs font-bold text-[#1C2B22] disabled:opacity-40"
        >
          测试连接
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#8A9E92]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
          >
            {saved ? 'Saved! ✓' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
