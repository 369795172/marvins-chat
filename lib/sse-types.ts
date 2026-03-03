/**
 * SSE event types for chat observability.
 * Backward compatible: plain { content } is treated as content event.
 */

export type SSEStatus = 'thinking' | 'searching' | 'executing' | 'error';

export type SSEErrorContext = 'tool_execution' | 'llm_call' | 'network';

export interface SSEContentEvent {
  type?: 'content';
  content: string;
}

export interface SSEStatusEvent {
  type: 'status';
  status: SSEStatus;
  detail?: string;
}

export interface SSEToolCallEvent {
  type: 'tool_call';
  tool: string;
  args: Record<string, unknown>;
}

export interface SSEToolResultEvent {
  type: 'tool_result';
  tool: string;
  success: boolean;
  output: string;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
  context?: SSEErrorContext;
}

export type SSEEvent =
  | SSEContentEvent
  | SSEStatusEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSEErrorEvent;
