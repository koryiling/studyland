import { NextRequest, NextResponse } from 'next/server';
import { AIRequestPayload } from '@/types/ai';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { simulateAIResponse } from '@/lib/ai/simulator';

export async function POST(req: NextRequest) {
  let payload: AIRequestPayload = { action: 'socratic-turn' };
  try {
    payload = await req.json();
    const { action, providerConfig, topic, userMessage, history = [], context, difficulty = 'Intermediate' } = payload;
    const provider = providerConfig?.provider || 'demo';

    // Fallback directly to simulator if Demo mode is selected or no API key is provided for cloud providers
    const hasKey = Boolean(providerConfig?.apiKey && providerConfig.apiKey.trim().length > 0);
    if (provider === 'demo' || (!hasKey && provider !== 'ollama')) {
      const simulatedData = simulateAIResponse(payload);
      return NextResponse.json({ success: true, data: simulatedData, isSimulated: true });
    }

    // Determine system prompt according to action
    let systemInstruction = SYSTEM_PROMPTS.PLAN_GENERATOR;
    if (action === 'socratic-turn') {
      systemInstruction = SYSTEM_PROMPTS.SOCRATIC_COACH;
    } else if (action === 'evaluate-feynman') {
      systemInstruction = SYSTEM_PROMPTS.FEYNMAN_EVALUATOR;
    } else if (action === 'generate-quiz') {
      systemInstruction = SYSTEM_PROMPTS.QUIZ_GENERATOR;
    } else if (action === 'grade-quiz-answer') {
      systemInstruction = SYSTEM_PROMPTS.QUIZ_GRADER;
    }

    // Format prompt content
    const contextInfo = `Topic: "${topic || 'General'}"\nDifficulty: "${difficulty}"\n${context ? `Context: ${context}\n` : ''}`;
    const userPromptText = `${contextInfo}\nUser Input: ${userMessage || 'Initiate'}\n\nPlease respond strictly with valid JSON.`;

    if (provider === 'gemini') {
      const apiKey = providerConfig?.apiKey?.trim() || process.env.GEMINI_API_KEY;
      const model = providerConfig?.model?.trim() || 'gemini-2.0-flash';
      
      const contents = [
        ...history.map(item => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }]
        })),
        {
          role: 'user',
          parts: [{ text: userPromptText }]
        }
      ];

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.7
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Gemini API Error:', errorText);
        throw new Error(`Gemini API Error (${res.status}): ${errorText.slice(0, 150)}`);
      }

      const geminiJson = await res.json();
      const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('No response text received from Gemini');
      }

      const cleanJson = cleanJsonString(rawText);
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: parsedData, provider: 'gemini' });
    }

    if (provider === 'openai') {
      const apiKey = providerConfig?.apiKey?.trim() || process.env.OPENAI_API_KEY;
      const model = providerConfig?.model?.trim() || 'gpt-4o-mini';

      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(item => ({ role: item.role, content: item.content })),
        { role: 'user', content: userPromptText }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('OpenAI API Error:', errText);
        throw new Error(`OpenAI API Error (${res.status}): ${errText.slice(0, 150)}`);
      }

      const openaiJson = await res.json();
      const rawContent = openaiJson.choices?.[0]?.message?.content;
      const cleanJson = cleanJsonString(rawContent);
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: parsedData, provider: 'openai' });
    }

    if (provider === 'ollama') {
      const baseUrl = providerConfig?.baseUrl?.trim() || 'http://localhost:11434';
      const model = providerConfig?.model?.trim() || 'llama3.2';

      const messages = [
        { role: 'system', content: systemInstruction + '\nRespond ONLY with valid JSON.' },
        ...history.map(item => ({ role: item.role, content: item.content })),
        { role: 'user', content: userPromptText }
      ];

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          format: 'json'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama Error (${res.status}): ${errText.slice(0, 150)}`);
      }

      const ollamaJson = await res.json();
      const rawContent = ollamaJson.message?.content;
      const cleanJson = cleanJsonString(rawContent);
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: parsedData, provider: 'ollama' });
    }

    // Default fallback
    const simulated = simulateAIResponse(payload);
    return NextResponse.json({ success: true, data: simulated, isSimulated: true });

  } catch (error: any) {
    console.error('AI Route Handler Error:', error);
    // Return error and provide simulated fallback so user experience is uninterrupted
    const fallback = simulateAIResponse(payload);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to call AI service',
      fallbackData: fallback,
      notice: 'Switched to local intelligent simulation due to API error.'
    }, { status: 200 });
  }
}

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
}
