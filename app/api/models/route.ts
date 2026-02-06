import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const API_BASE_URL = 'https://space.ai-builders.com/backend/v1';
const API_KEY = process.env.AI_BUILDER_TOKEN || '';

if (!API_KEY) {
  console.warn('AI_BUILDER_TOKEN is not set in environment variables');
}

const openai = new OpenAI({
  baseURL: API_BASE_URL,
  apiKey: API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    // Fetch models from AI Builder Space API
    const response = await fetch(`${API_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract chat models from the response
    // The response follows OpenAI format: { data: [{ id: string, ... }] }
    const models = (data.data || [])
      .filter((model: any) => {
        // Filter for chat completion models (exclude embedding and image models)
        const id = model.id?.toLowerCase() || '';
        return !id.includes('embedding') && !id.includes('dall-e') && !id.includes('image');
      })
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        // Extract description if available
        description: model.description || getModelDescription(model.id),
      }));

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch models',
        models: [] // Return empty array on error
      },
      { status: 500 }
    );
  }
}

// Helper function to provide descriptions for known models
function getModelDescription(modelId: string): string {
  const descriptions: Record<string, string> = {
    'grok-4-fast': 'Fast response, good for quick queries',
    'grok-4': 'Higher quality, better reasoning',
    'deepseek': 'Fast and cost-effective chat completions',
    'supermind-agent-v1': 'Multi-tool agent with web search and Gemini handoff',
    'gemini-2.5-pro': 'Direct access to Google\'s Gemini model',
    'gemini-3-flash-preview': 'Fast Gemini reasoning model',
    'gpt-5': 'Passthrough to OpenAI-compatible providers',
  };
  
  return descriptions[modelId.toLowerCase()] || 'AI model';
}
