import { NextRequest } from 'next/server';
import { runAgenticLoop } from '@/lib/agent';

const API_KEY = process.env.AI_BUILDER_TOKEN || '';

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI_BUILDER_TOKEN not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, model = 'grok-4-fast' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const onEvent = (event: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          await runAgenticLoop(
            messages,
            model,
            API_KEY,
            onEvent
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          onEvent({
            type: 'error',
            message: msg,
            context: 'network',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: msg,
        type: 'error',
        context: 'network',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
