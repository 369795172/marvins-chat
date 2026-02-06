import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://space.ai-builders.com/backend/v1';
const API_KEY = process.env.AI_BUILDER_TOKEN || '';

if (!API_KEY) {
  console.warn('AI_BUILDER_TOKEN is not set in environment variables');
}

export async function POST(request: NextRequest) {
  let selectedModel = 'grok-4-fast';

  try {
    const { messages, stream = false, model = 'grok-4-fast' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    selectedModel = model || 'grok-4-fast';

    const chatUrl = `${API_BASE_URL}/chat/completions`;
    console.log('Chat request:', { model: selectedModel, messageCount: messages.length, stream });

    if (stream) {
      // Try streaming first
      let apiResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          stream: true,
          temperature: 0.7,
        }),
      });

      // If streaming is not supported (404), fall back to non-streaming
      // and simulate SSE output so the client still works
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        const isStreamUnsupported = apiResponse.status === 404 && errorText.includes('Streaming not supported');

        if (isStreamUnsupported) {
          console.log(`Streaming not supported for ${selectedModel}, falling back to non-streaming`);
          apiResponse = await fetch(chatUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: selectedModel,
              messages,
              temperature: 0.7,
            }),
          });

          if (!apiResponse.ok) {
            const fallbackError = await apiResponse.text();
            throw new Error(`API returned ${apiResponse.status}: ${fallbackError}`);
          }

          // Return the full response as a single SSE chunk
          const data = await apiResponse.json();
          const content = data.choices?.[0]?.message?.content || '';
          const encoder = new TextEncoder();
          const singleChunkStream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(singleChunkStream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        console.error('Upstream API error:', { status: apiResponse.status, body: errorText });
        throw new Error(`API returned ${apiResponse.status}: ${errorText}`);
      }

      // Transform the upstream SSE stream into our format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const upstreamBody = apiResponse.body;

      if (!upstreamBody) {
        throw new Error('No response body from upstream API');
      }

      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = upstreamBody.getReader();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith('data: ')) {
                  const data = trimmed.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch {
                    // Not valid JSON SSE chunk — could be a non-streaming response
                  }
                } else if (trimmed.startsWith('{')) {
                  // Non-streaming JSON response (some models don't support streaming)
                  try {
                    const parsed = JSON.parse(trimmed);
                    const content = parsed.choices?.[0]?.message?.content || '';
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming: use direct fetch as well
      const apiResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.7,
        }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`API returned ${apiResponse.status}: ${errorText}`);
      }

      const data = await apiResponse.json();

      return NextResponse.json({
        content: data.choices?.[0]?.message?.content || '',
      });
    }
  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      model: selectedModel,
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to process chat completion',
        details: { model: selectedModel },
      },
      { status: error.status || 500 }
    );
  }
}
