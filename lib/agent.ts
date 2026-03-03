import { TOOL_DEFINITIONS, runTool } from './tools';
import { DEFAULT_TOOL_MODEL, TOOL_CAPABLE_MODELS } from './constants';

const API_BASE_URL = 'https://space.ai-builders.com/backend/v1';
const MAX_TURNS = 5;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export type SSECallback = (event: Record<string, unknown>) => void;

const SYSTEM_MESSAGE = `You are an AI assistant with access to local tools. When the user asks to list files, view directory contents, run commands, read/write files, use the appropriate tool instead of just describing how.

Available tools:
- directory_list: List files in a directory. Use path "." for current workspace root.
- shell_execute: Run shell commands (e.g. ls, pwd, cat).
- file_read: Read file contents.
- file_write: Write content to a file.

Workspace root is the current working directory. For "当前目录" or "current folder", use directory_list with path ".".`;

export async function runAgenticLoop(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
  onEvent: SSECallback
): Promise<void> {
  const effectiveModel = TOOL_CAPABLE_MODELS.includes(model)
    ? model
    : DEFAULT_TOOL_MODEL;
  if (effectiveModel !== model) {
    console.log(`[agent] Model ${model} does not support tools, using ${effectiveModel}`);
  }

  const history: ChatMessage[] = [
    { role: 'system', content: SYSTEM_MESSAGE },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onEvent({ type: 'status', status: 'thinking' });

    const res = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: history,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      onEvent({
        type: 'error',
        message: errText || `API error ${res.status}`,
        context: 'llm_call',
      });
      return;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) {
      onEvent({
        type: 'error',
        message: 'No choices in API response',
        context: 'llm_call',
      });
      return;
    }

    const msg = choice.message;
    const toolCalls = msg.tool_calls;

    // Debug: log raw API response shape for observability
    console.log('[agent] API response', {
      model: effectiveModel,
      turn,
      finishReason: choice.finish_reason,
      hasToolCalls: Array.isArray(toolCalls) && toolCalls.length > 0,
      toolCallsCount: Array.isArray(toolCalls) ? toolCalls.length : 0,
      messageKeys: msg ? Object.keys(msg) : [],
      contentLength: typeof msg?.content === 'string' ? msg.content.length : 0,
    });

    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      history.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const fn = tc.function;
        const name = fn?.name ?? 'unknown';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(fn?.arguments ?? '{}');
        } catch {
          args = {};
        }

        onEvent({ type: 'tool_call', tool: name, args });

        const result = await runTool(name, args);

        onEvent({
          type: 'tool_result',
          tool: name,
          success: result.success,
          output: result.output,
        });

        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result.output,
        });
      }
      continue;
    }

    const content = msg.content ?? '';
    onEvent({ type: 'content', content });
    return;
  }

  onEvent({
    type: 'error',
    message: 'Max turns reached',
    context: 'llm_call',
  });
}
