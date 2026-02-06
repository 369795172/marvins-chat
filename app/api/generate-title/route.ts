import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://space.ai-builders.com/backend/v1';
const API_KEY = process.env.AI_BUILDER_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const titlePrompt = `Based on the following conversation, generate a concise, descriptive title (maximum 60 characters). The title should capture the main topic or question being discussed. Return only the title, no quotes or additional text.

Conversation:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}

Title:`;

    const apiResponse = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates concise, descriptive titles for conversations. Return only the title text, no quotes or markdown.',
          },
          {
            role: 'user',
            content: titlePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 30,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API returned ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();
    const title = data.choices?.[0]?.message?.content?.trim() || 'New Chat';
    const cleanTitle = title.replace(/^["']|["']$/g, '').slice(0, 60);

    return NextResponse.json({ title: cleanTitle });
  } catch (error: any) {
    console.error('Title Generation Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to generate title' },
      { status: 500 }
    );
  }
}
