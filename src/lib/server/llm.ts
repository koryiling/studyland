// Server-only: calls the AI provider. Never import this from a client component.
//
// Key resolution:
//  1. If the student chose a provider and sent their own key, use it (the key is
//     forwarded to that provider only and never logged or stored on the server).
//  2. Otherwise use the site owner's built-in key from the server environment
//     (GEMINI_API_KEY, Gemini free tier).
//  3. Otherwise fail with NOT_CONFIGURED. We never fall back to made-up content.

import type { AIProvider } from '@/types/studybub';

type RealProvider = Exclude<AIProvider, 'server'>;

export interface ClientAIConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
}

export type AIErrorCode = 'NOT_CONFIGURED' | 'AUTH' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'BAD_OUTPUT' | 'BAD_REQUEST';

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string, public status = 502) {
    super(message);
  }
}

const DEFAULT_MODELS: Record<RealProvider, string> = {
  gemini: 'gemini-3.8-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
};

const OPENAI_COMPATIBLE_URLS: Record<Exclude<RealProvider, 'gemini'>, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
};

const PROVIDER_LABELS: Record<RealProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

const REQUEST_TIMEOUT_MS = 170_000;

interface ResolvedConfig {
  provider: RealProvider;
  apiKey: string;
  model: string;
  usingServerKey: boolean;
}

export function isServerKeyConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function resolveConfig(client?: ClientAIConfig): ResolvedConfig {
  const provider = client?.provider;
  if (provider && provider !== 'server') {
    if (!Object.hasOwn(DEFAULT_MODELS, provider)) {
      throw new AIError('BAD_REQUEST', `Unknown AI provider: ${provider}`, 400);
    }
    const apiKey = client?.apiKey?.trim();
    if (!apiKey) {
      throw new AIError('NOT_CONFIGURED', `请先在 Profile → AI 设置 中填写你的 ${PROVIDER_LABELS[provider]} API Key。`, 400);
    }
    return {
      provider,
      apiKey,
      model: client?.model?.trim() || DEFAULT_MODELS[provider],
      usingServerKey: false,
    };
  }

  const serverKey = process.env.GEMINI_API_KEY?.trim();
  if (!serverKey) {
    throw new AIError(
      'NOT_CONFIGURED',
      'AI 尚未连接：网站没有配置内置 AI Key。请在 Profile → AI 设置 中添加你自己的 API Key（有免费选项）。',
      503
    );
  }
  return {
    provider: 'gemini',
    apiKey: serverKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODELS.gemini,
    usingServerKey: true,
  };
}

function errorFromStatus(status: number, provider: RealProvider, detail: string): AIError {
  const label = PROVIDER_LABELS[provider];
  // Gemini reports an invalid key as 400 "API key not valid"
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(detail))) {
    return new AIError('AUTH', `${label} 拒绝了这个 API Key，请检查 Key 是否正确、是否已启用。`, 400);
  }
  if (status === 429) {
    return new AIError('RATE_LIMIT', `${label} 请求太频繁或免费额度已用完，请稍后再试。`, 429);
  }
  if (status === 402) {
    return new AIError('RATE_LIMIT', `${label} 账户余额不足，请先充值或换一个 AI。`, 402);
  }
  if (status === 404) {
    return new AIError('PROVIDER_ERROR', `${label} 找不到这个模型，请在 AI 设置中检查模型名称。${detail ? `（${detail}）` : ''}`, 400);
  }
  return new AIError('PROVIDER_ERROR', `${label} 出错了（${status}）。${detail}`.trim());
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.error?.message || body?.message || '';
    return typeof msg === 'string' ? msg.slice(0, 200) : '';
  } catch {
    return '';
  }
}

interface CallOptions {
  system: string;
  user: string;
  temperature: number;
  json: boolean;
}

async function callGemini(cfg: ResolvedConfig, { system, user, temperature, json: jsonMode }: CallOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  // Gemini 3 models "think" at medium level by default, which makes notes/quizzes slow.
  // Studying material doesn't need deep reasoning, so ask for low thinking.
  const lowThinking = /^gemini-3/.test(cfg.model);
  const request = (withThinkingConfig: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          ...(jsonMode && { responseMimeType: 'application/json' }),
          ...(withThinkingConfig && { thinkingConfig: { thinkingLevel: 'low' } }),
          temperature,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  const started = Date.now();
  let res = await request(lowThinking);
  if (!res.ok && lowThinking && res.status === 400) {
    // If this model rejects the thinking setting, retry with the model's defaults
    const detail = await readErrorDetail(res);
    if (!/thinking/i.test(detail)) throw errorFromStatus(res.status, cfg.provider, detail);
    console.warn(`Gemini rejected thinkingConfig for ${cfg.model}: ${detail}`);
    res = await request(false);
  }
  if (!res.ok) throw errorFromStatus(res.status, cfg.provider, await readErrorDetail(res));
  const json = await res.json();
  console.log(`Gemini ${cfg.model}: ${Date.now() - started} ms, thoughts ${json?.usageMetadata?.thoughtsTokenCount ?? 0} tokens`);
  const text = json?.candidates?.[0]?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text || '')
    .join('');
  if (!text) {
    const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason;
    throw new AIError('BAD_OUTPUT', `Gemini 没有返回内容${reason ? `（${reason}）` : ''}，请重试。`);
  }
  return text;
}

async function callOpenAICompatible(cfg: ResolvedConfig, { system, user, temperature, json: jsonMode }: CallOptions): Promise<string> {
  const url = OPENAI_COMPATIBLE_URLS[cfg.provider as Exclude<RealProvider, 'gemini'>];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(jsonMode && { response_format: { type: 'json_object' } }),
      temperature,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw errorFromStatus(res.status, cfg.provider, await readErrorDetail(res));
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new AIError('BAD_OUTPUT', `${PROVIDER_LABELS[cfg.provider]} 没有返回内容，请重试。`);
  return text;
}

function parseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) cleaned = fenced[1];
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AIError('BAD_OUTPUT', 'AI 返回的格式不正确，请重试一次。');
  }
}

interface LLMRequest {
  client?: ClientAIConfig;
  system: string;
  user: string;
  temperature?: number;
}

async function callLLM(req: LLMRequest, json: boolean): Promise<string> {
  const cfg = resolveConfig(req.client);
  const opts: CallOptions = { system: req.system, user: req.user, temperature: req.temperature ?? 0.4, json };
  try {
    return cfg.provider === 'gemini' ? await callGemini(cfg, opts) : await callOpenAICompatible(cfg, opts);
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new AIError('PROVIDER_ERROR', 'AI 回应超时，请稍后重试。', 504);
    }
    throw new AIError('PROVIDER_ERROR', `无法连接到 ${PROVIDER_LABELS[cfg.provider]}，请检查网络。`);
  }
}

export async function callLLMJson<T>(req: LLMRequest): Promise<T> {
  return parseJson<T>(await callLLM(req, true));
}

// Plain-text (Markdown) response, with any surrounding ``` fence removed
export async function callLLMText(req: LLMRequest): Promise<string> {
  const raw = (await callLLM(req, false)).trim();
  const fenced = raw.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1] : raw).trim();
}
