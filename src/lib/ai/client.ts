import { 
  AIRequestPayload, 
  GeneratedPlanResponse, 
  SocraticTurnResponse, 
  FeynmanEvaluationResponse, 
  GenerateQuizResponse, 
  GradeQuizResponse 
} from '@/types/ai';
import { UserSettings } from '@/types/study';

export async function callAI<T = any>(
  payload: Omit<AIRequestPayload, 'providerConfig'>,
  settings: UserSettings
): Promise<{ data: T; isSimulated?: boolean; notice?: string; error?: string }> {
  try {
    const fullPayload: AIRequestPayload = {
      ...payload,
      providerConfig: {
        provider: settings.provider,
        apiKey: settings.provider === 'gemini' 
          ? settings.geminiApiKey 
          : settings.provider === 'openai' 
          ? settings.openaiApiKey 
          : undefined,
        model: settings.provider === 'gemini' 
          ? settings.geminiModel 
          : settings.provider === 'openai' 
          ? settings.openaiModel 
          : settings.provider === 'ollama' 
          ? settings.ollamaModel 
          : undefined,
        baseUrl: settings.provider === 'ollama' ? settings.ollamaBaseUrl : undefined
      }
    };

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    });

    const result = await res.json();
    if (result.success) {
      return { data: result.data as T, isSimulated: result.isSimulated };
    } else if (result.fallbackData) {
      return {
        data: result.fallbackData as T,
        isSimulated: true,
        notice: result.notice || 'Switched to local simulator',
        error: result.error
      };
    } else {
      throw new Error(result.error || 'Failed to call AI');
    }
  } catch (err: any) {
    console.error('callAI client error:', err);
    throw err;
  }
}
