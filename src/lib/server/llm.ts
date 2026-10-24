// Server-only: calls the AI provider. Never import this from a client component.
//
// Key resolution:
//  1. If the student chose a provider and sent their own key, use it (the key is
//     forwarded to that provider only and never logged or stored on the server).
//  2. Otherwise use the site owner's built-in key from the server environment
//     (GEMINI_API_KEY, Gemini free tier). If GROQ_API_KEY is also set, Groq is the
//     backup when Gemini is busy or out of quota, for requests small enough for Groq's free tier.
//  3. Otherwise fail with NOT_CONFIGURED. We never fall back to made-up content.

import type { AIProvider } from '@/types/studybub';

type RealProvider = Exclude<AIProvider, 'server'>;

export interface ClientAIConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
}

export type AIErrorCode = 'NOT_CONFIGURED' | 'AUTH' | 'RATE_LIMIT' | 'PROVIDER_ERROR' | 'BAD_OUTPUT' | 'BAD_REQUEST';

// Messages are shown to students as-is, so they are written in a warm, plain tone.
// Raw provider error text is only logged on the server.
export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public status = 502,
    public retryable = false
  ) {
    super(message);
  }
}

const DEFAULT_MODELS: Record<RealProvider, string> = {
  gemini: 'gemini-3.8-flash',
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
};

// Used when the main Gemini model is overloaded or out of quota (separate capacity and quota)
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
// Retries stop once this much time has passed, to stay within the function time limit
const RETRY_WINDOW_MS = 60_000;

const OPENAI_COMPATIBLE_URLS: Record<Exclude<RealProvider, 'gemini'>, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
};

const PROVIDER_LABELS: Record<RealProvider, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

const REQUEST_TIMEOUT_MS = 170_000;

// Groq's free tier allows about 8K tokens per minute, so only short requests can go there
const GROQ_FALLBACK_MAX_CHARS = 14_000;

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
      throw new AIError('NOT_CONFIGURED', `还差一步：请到 Profile → AI 设置，填写你的 ${PROVIDER_LABELS[provider]} API Key 就可以开始啦。`, 400);
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
      '内置 AI 暂时还没开通。你可以到 Profile → AI 设置，用自己的 API Key（Gemini 有免费额度，里面有教程）。',
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

function errorFromStatus(status: number, provider: RealProvider, detail: string, model: string): AIError {
  console.warn(`AI provider error: ${provider} ${model} ${status} ${detail}`);
  const label = PROVIDER_LABELS[provider];
  // Gemini reports an invalid key as 400 "API key not valid"
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(detail))) {
    return new AIError('AUTH', `这个 ${label} API Key 好像不太对，请到 Profile → AI 设置 检查一下，再按"测试连接"试试。`, 400);
  }
  if (status === 429) {
    return new AIError('RATE_LIMIT', '现在用 AI 的同学有点多，免费额度暂时用完了 🙏 请过一会儿再试；着急的话，也可以在 Profile → AI 设置 用自己的 Key。', 429, true);
  }
  if (status === 413) {
    return new AIError('RATE_LIMIT', `这份资料对 ${label} 的免费额度来说太长了。请换回 Studyland 免费 AI，或少一点题目再试。`, 413);
  }
  if (status === 402) {
    return new AIError('RATE_LIMIT', `你的 ${label} 账户余额不足了，充值后就能继续使用，或在 AI 设置 换回内置 AI。`, 402);
  }
  if (status === 404) {
    return new AIError('PROVIDER_ERROR', `找不到模型「${model}」。请到 Profile → AI 设置 检查模型名称（留空会使用推荐的模型）。`, 400);
  }
  if (status >= 500) {
    return new AIError('PROVIDER_ERROR', 'AI 现在有点忙，我们已经帮你自动重试了几次 🙏 请稍等一两分钟，再按一次就好。', 503, true);
  }
  return new AIError('PROVIDER_ERROR', 'AI 这次没能完成，请再试一次。如果一直不行，可以换一份资料或稍后再来。');
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
    if (!/thinking/i.test(detail)) throw errorFromStatus(res.status, cfg.provider, detail, cfg.model);
    console.warn(`Gemini rejected thinkingConfig for ${cfg.model}: ${detail}`);
    res = await request(false);
  }
  if (!res.ok) throw errorFromStatus(res.status, cfg.provider, await readErrorDetail(res), cfg.model);
  const json = await res.json();
  console.log(`Gemini ${cfg.model}: ${Date.now() - started} ms, thoughts ${json?.usageMetadata?.thoughtsTokenCount ?? 0} tokens`);
  const text = json?.candidates?.[0]?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text || '')
    .join('');
  if (!text) {
    const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason;
    console.warn(`Gemini ${cfg.model} returned no text: ${reason}`);
    throw new AIError('BAD_OUTPUT', 'AI 这次没有给出内容，请再按一次试试。', 502, true);
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
      // gpt-oss models reason before answering; study material only needs a little
      ...(/gpt-oss/.test(cfg.model) && { reasoning_effort: 'low' }),
      temperature,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw errorFromStatus(res.status, cfg.provider, await readErrorDetail(res), cfg.model);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new AIError('BAD_OUTPUT', 'AI 这次没有给出内容，请再按一次试试。', 502, true);
  return text;
}

function parseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) cleaned = fenced[1];
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AIError('BAD_OUTPUT', 'AI 这次的回答格式有点乱，请再按一次试试。');
  }
}

interface LLMRequest {
  client?: ClientAIConfig;
  system: string;
  user: string;
  temperature?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callOnce(cfg: ResolvedConfig, opts: CallOptions): Promise<string> {
  try {
    return cfg.provider === 'gemini' ? await callGemini(cfg, opts) : await callOpenAICompatible(cfg, opts);
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new AIError('PROVIDER_ERROR', 'AI 想得有点久，这次没能完成。请再试一次；如果资料很长，可以先试试 Simple 笔记或少一点题目。', 504);
    }
    console.warn(`AI network error (${cfg.provider} ${cfg.model}):`, err);
    throw new AIError('PROVIDER_ERROR', 'AI 暂时连不上，请稍后再试一次。', 502, true);
  }
}

// Busy/overloaded errors are usually brief: retry, then (for Gemini) switch to a
// lighter backup model with its own capacity and quota before giving up.
async function callLLM(req: LLMRequest, json: boolean): Promise<string> {
  const cfg = resolveConfig(req.client);
  const opts: CallOptions = { system: req.system, user: req.user, temperature: req.temperature ?? 0.4, json };
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim() || GEMINI_FALLBACK_MODEL;
  const models = cfg.provider === 'gemini' && fallback !== cfg.model ? [cfg.model, fallback] : [cfg.model];
  const started = Date.now();
  let firstError: AIError | null = null;

  tryModels: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOnce({ ...cfg, model }, opts);
      } catch (err) {
        const error = err as AIError;
        firstError ??= error;
        // A real problem with the main model (bad key, bad request) is reported right away
        if (!error.retryable && model === cfg.model) throw error;
        // Errors on the backup model (e.g. it doesn't exist) shouldn't hide the real problem
        if (!error.retryable || Date.now() - started > RETRY_WINDOW_MS) break tryModels;
        // Quota errors won't clear in seconds: go straight to the backup model
        if (error.code === 'RATE_LIMIT') break;
        await sleep(attempt === 0 ? 1500 : 4000);
      }
    }
  }
  // Built-in AI still busy: try Groq (if the site owner set it up) for requests small enough for its free tier
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (cfg.usingServerKey && groqKey && firstError?.retryable && opts.system.length + opts.user.length <= GROQ_FALLBACK_MAX_CHARS) {
    try {
      console.warn('Built-in Gemini busy, using Groq backup');
      return await callOnce({ provider: 'groq', apiKey: groqKey, model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODELS.groq, usingServerKey: true }, opts);
    } catch (err) {
      console.warn('Groq backup failed too:', err instanceof Error ? err.message : err);
    }
  }
  throw firstError!;
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
