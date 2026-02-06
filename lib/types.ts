export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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
