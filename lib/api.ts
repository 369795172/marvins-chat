import OpenAI from 'openai';
import { ChatCompletionRequest } from './types';

const API_BASE_URL = 'https://space.ai-builders.com/backend/v1';
const API_KEY = process.env.NEXT_PUBLIC_AI_BUILDER_TOKEN || '';

if (!API_KEY) {
  console.warn('AI_BUILDER_TOKEN is not set. Please set NEXT_PUBLIC_AI_BUILDER_TOKEN in your .env.local file');
}

const openai = new OpenAI({
  baseURL: API_BASE_URL,
  apiKey: API_KEY,
});

export async function* streamChatCompletion(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onChunk?: (chunk: string) => void
): AsyncGenerator<string, void, unknown> {
  try {
    const stream = await openai.chat.completions.create({
      model: 'grok-4-fast',
      messages,
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
        onChunk?.(content);
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function getChatCompletion(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'grok-4-fast',
      messages,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
