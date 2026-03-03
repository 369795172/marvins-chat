export type MessageStatus = 'thinking' | 'searching' | 'executing' | 'error';

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  success?: boolean;
  output?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** Current status (e.g. thinking, executing) - for observability */
  status?: MessageStatus;
  /** Tool calls made during this message - for observability */
  toolCalls?: ToolCallRecord[];
}

export type Model = string; // Dynamic model ID from AI Builder Space

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: Model;
  createdAt: number;
  updatedAt: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}
