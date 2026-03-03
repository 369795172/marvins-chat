'use client';

import { Conversation, Message, Model, ToolCallRecord } from '@/lib/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import { useState, useRef, useCallback } from 'react';

const CHAT_API = '/api/chat';
const AGENT_API = '/api/agent';

const LOCAL_OP_PATTERNS = [
  /[/\\]users[/\\]/i,
  /[/\\]home[/\\]/i,
  /[/\\]tmp[/\\]/i,
  /目录/, /文件夹/, /文件/, /当前目录/,
  /\bls\b/, /\bpwd\b/, /\bcat\b/, /\bmkdir\b/,
  /list.*files/i, /directory/i, /read.*file/i, /run.*command/i,
  /check.*folder/i, /查看/, /检查/, /执行/, /运行/,
];

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onUpdateConversation: (conversation: Conversation) => void;
}

export default function ChatInterface({
  conversation,
  onUpdateConversation,
}: ChatInterfaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [agentHint, setAgentHint] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const looksLikeLocalOp = useCallback((text: string) => {
    return LOCAL_OP_PATTERNS.some((p) => p.test(text));
  }, []);

  // Ensure conversation has a model (for backward compatibility)
  const currentModel: Model = conversation?.model || 'grok-4-fast'; // Will be updated by ModelSelector if needed

  const handleModelChange = (model: Model) => {
    if (!conversation) return;
    
    const updatedConversation: Conversation = {
      ...conversation,
      model,
      updatedAt: Date.now(),
    };
    
    onUpdateConversation(updatedConversation);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!conversation) return;

    // Find the index of the message being edited
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Remove all messages after the edited message (including the edited message's response)
    const messagesUpToEdit = conversation.messages.slice(0, messageIndex);
    
    // Update the edited message
    const editedMessage: Message = {
      ...conversation.messages[messageIndex],
      content: newContent,
    };

    const updatedMessages = [...messagesUpToEdit, editedMessage];
    const updatedConversation: Conversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    onUpdateConversation(updatedConversation);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const apiUrl = agentMode ? AGENT_API : CHAT_API;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: currentModel,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Failed to get response (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      let assistantStatus: Message['status'];
      let assistantToolCalls: ToolCallRecord[] = [];
      const assistantMessageId = `assistant-${Date.now()}`;

      const emitUpdate = () => {
        const streamingMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now(),
          ...(assistantStatus && { status: assistantStatus }),
          ...(assistantToolCalls.length > 0 && { toolCalls: [...assistantToolCalls] }),
        };
        onUpdateConversation({
          ...updatedConversation,
          messages: [...updatedMessages, streamingMessage],
          updatedAt: Date.now(),
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'status') {
              assistantStatus = parsed.status;
              emitUpdate();
            } else if (parsed.type === 'content' || parsed.content !== undefined) {
              const c = parsed.content ?? '';
              if (typeof c === 'string') {
                assistantContent += c;
                assistantStatus = undefined;
                emitUpdate();
              }
            } else if (parsed.type === 'tool_call') {
              assistantToolCalls.push({
                tool: parsed.tool,
                args: parsed.args ?? {},
              });
              assistantStatus = 'executing';
              emitUpdate();
            } else if (parsed.type === 'tool_result') {
              const last = assistantToolCalls[assistantToolCalls.length - 1];
              if (last) {
                last.success = parsed.success;
                last.output = parsed.output;
              }
              emitUpdate();
            } else if (parsed.type === 'error') {
              assistantStatus = 'error';
              assistantContent = `**Error** (${parsed.context ?? 'unknown'}): ${parsed.message}`;
              emitUpdate();
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      assistantStatus = undefined;

      const finalMessages = [...updatedMessages, {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: assistantContent,
        timestamp: Date.now(),
        ...(assistantToolCalls.length > 0 && { toolCalls: assistantToolCalls }),
      }];

      onUpdateConversation({
        ...updatedConversation,
        messages: finalMessages,
        updatedAt: Date.now(),
      });

      if (conversation.title === 'New Chat' && finalMessages.length >= 2) {
        try {
          const titleResponse = await fetch('/api/generate-title', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: finalMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });

          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            const titledConversation: Conversation = {
              ...updatedConversation,
              title: title || 'New Chat',
              messages: finalMessages,
              updatedAt: Date.now(),
            };
            onUpdateConversation(titledConversation);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
          // Don't fail the whole request if title generation fails
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response. Please try again.'}`,
        timestamp: Date.now(),
      };

      const errorConversation: Conversation = {
        ...updatedConversation,
        messages: [...updatedMessages, errorMessage],
        updatedAt: Date.now(),
      };

      onUpdateConversation(errorConversation);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (content: string) => {
    if (!conversation) return;

    if (!agentMode && looksLikeLocalOp(content)) {
      setAgentHint(true);
    } else {
      setAgentHint(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...conversation.messages, userMessage];
    const updatedConversation: Conversation = {
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    onUpdateConversation(updatedConversation);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const apiUrl = agentMode ? AGENT_API : CHAT_API;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: currentModel,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Failed to get response (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      let assistantStatus: Message['status'];
      let assistantToolCalls: ToolCallRecord[] = [];
      const assistantMessageId = `assistant-${Date.now()}`;

      const emitUpdate = () => {
        const streamingMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now(),
          ...(assistantStatus && { status: assistantStatus }),
          ...(assistantToolCalls.length > 0 && { toolCalls: [...assistantToolCalls] }),
        };
        onUpdateConversation({
          ...updatedConversation,
          messages: [...updatedMessages, streamingMessage],
          updatedAt: Date.now(),
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'status') {
              assistantStatus = parsed.status;
              emitUpdate();
            } else if (parsed.type === 'content' || parsed.content !== undefined) {
              const c = parsed.content ?? '';
              if (typeof c === 'string') {
                assistantContent += c;
                assistantStatus = undefined;
                emitUpdate();
              }
            } else if (parsed.type === 'tool_call') {
              assistantToolCalls.push({
                tool: parsed.tool,
                args: parsed.args ?? {},
              });
              assistantStatus = 'executing';
              emitUpdate();
            } else if (parsed.type === 'tool_result') {
              const last = assistantToolCalls[assistantToolCalls.length - 1];
              if (last) {
                last.success = parsed.success;
                last.output = parsed.output;
              }
              emitUpdate();
            } else if (parsed.type === 'error') {
              assistantStatus = 'error';
              assistantContent = `**Error** (${parsed.context ?? 'unknown'}): ${parsed.message}`;
              emitUpdate();
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      assistantStatus = undefined;

      const finalMessages = [...updatedMessages, {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: assistantContent,
        timestamp: Date.now(),
        ...(assistantToolCalls.length > 0 && { toolCalls: assistantToolCalls }),
      }];

      if (conversation.title === 'New Chat' && finalMessages.length >= 2) {
        try {
          const titleResponse = await fetch('/api/generate-title', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: finalMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });

          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            const titledConversation: Conversation = {
              ...updatedConversation,
              title: title || 'New Chat',
              messages: finalMessages,
              updatedAt: Date.now(),
            };
            onUpdateConversation(titledConversation);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
          // Don't fail the whole request if title generation fails
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response. Please try again.'}`,
        timestamp: Date.now(),
      };

      const errorConversation: Conversation = {
        ...updatedConversation,
        messages: [...updatedMessages, errorMessage],
        updatedAt: Date.now(),
      };

      onUpdateConversation(errorConversation);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold truncate">
          {conversation?.title || 'New Chat'}
        </h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-400">Agent</span>
            <button
              type="button"
              role="switch"
              aria-checked={agentMode}
              onClick={() => setAgentMode((v) => !v)}
              disabled={isLoading}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                agentMode ? 'bg-blue-600' : 'bg-gray-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  agentMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <ModelSelector
            selectedModel={currentModel}
            onModelChange={handleModelChange}
            disabled={isLoading}
            agentMode={agentMode}
          />
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={conversation?.messages || []}
        isLoading={isLoading}
        onEditMessage={handleEditMessage}
      />

      {/* Agent mode hint */}
      {agentHint && !agentMode && (
        <div className="px-4 py-2 bg-amber-900/40 border-t border-amber-700/50 flex items-center justify-between">
          <span className="text-sm text-amber-300">
            This looks like a local operation. Enable <strong>Agent Mode</strong> for real file/command access.
          </span>
          <button
            onClick={() => { setAgentMode(true); setAgentHint(false); }}
            className="ml-3 px-3 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors flex-shrink-0"
          >
            Enable Agent
          </button>
        </div>
      )}

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
