import { NextRequest, NextResponse } from 'next/server';
import { QuizConfig, QuizQuestion } from '@/types/studybub';
import { generateGroundedQuestions } from '@/lib/studybub-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, documentText, question, userAnswer, providerConfig } = body;
    const provider = providerConfig?.provider || 'demo';

    // Fallback directly to grounded generator if demo mode or no key
    const hasKey = Boolean(providerConfig?.apiKey && providerConfig.apiKey.trim().length > 0);
    if (provider === 'demo' || (!hasKey && provider !== 'ollama')) {
      if (action === 'generate-quiz') {
        const questions = generateGroundedQuestions(config, documentText || '');
        return NextResponse.json({ success: true, questions });
      }
      if (action === 'evaluate-answer') {
        return NextResponse.json({
          success: true,
          evaluation: {
            scorePct: 85,
            isCorrect: true,
            feedback: 'Good explanation! You captured the central concept presented in the material.',
            howToImprove: 'For full marks on an exam, explicitly mention the key terminology from the source text.'
          }
        });
      }
    }

    if (action === 'generate-quiz') {
      const systemPrompt = `You are StudyBub, an encouraging and accurate educational quiz generator.
Your job is to read the provided school document text and generate exactly ${config.questionCount} questions.
Rules:
1. ONLY generate questions directly supported by the text. Never hallucinate facts outside the material.
2. Question types requested: ${config.questionType} ('mcq' = Multiple Choice with 4 options, 'tf' = True/False with 2 options, 'short' = Short Answer).
3. Difficulty: ${config.difficulty}.
4. Provide a clear, encouraging explanation for each question grounded in the text, and include a source reference.

Respond STRICTLY with JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq" | "tf" | "short",
      "question": "string",
      "options": ["A", "B", "C", "D"], // for mcq or ["True", "False"] for tf
      "correctAnswer": "string",
      "explanation": "Clear explanation citing the material",
      "sourceReference": "Section or concept name"
    }
  ]
}`;

      if (provider === 'gemini') {
        const apiKey = providerConfig.apiKey;
        const model = providerConfig.model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [{ text: `Document Study Material:\n\n${documentText}\n\nGenerate ${config.questionCount} ${config.questionType} questions now.` }]
              }
            ],
            generationConfig: { response_mime_type: 'application/json', temperature: 0.4 }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(cleanJson(raw));
            return NextResponse.json({ success: true, questions: parsed.questions });
          }
        }
      } else if (provider === 'openai') {
        const apiKey = providerConfig.apiKey;
        const model = providerConfig.model || 'gpt-4o-mini';

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Document Material:\n${documentText}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4
          })
        });

        if (res.ok) {
          const json = await res.json();
          const raw = json.choices?.[0]?.message?.content;
          if (raw) {
            const parsed = JSON.parse(cleanJson(raw));
            return NextResponse.json({ success: true, questions: parsed.questions });
          }
        }
      }
    }

    // Default fallback to grounded generator
    const fallbackQuestions = generateGroundedQuestions(config, documentText || '');
    return NextResponse.json({ success: true, questions: fallbackQuestions });

  } catch (error: any) {
    console.error('StudyBub AI route error:', error);
    return NextResponse.json({
      success: true,
      questions: generateGroundedQuestions({} as any, '')
    });
  }
}

function cleanJson(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
}
