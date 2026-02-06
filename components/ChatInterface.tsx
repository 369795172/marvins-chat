'use client';

import { Conversation, Message, Model } from '@/lib/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import { useState, useRef } from 'react';

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onUpdateConversation: (conversation: Conversation) => void;
}

export default function ChatInterface({
  conversation,
  onUpdateConversation,
}: ChatInterfaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
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
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      const assistantMessageId = `assistant-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;

                // Update conversation with streaming content
                const streamingMessage: Message = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: Date.now(),
                };

                const finalMessages = [...updatedMessages, streamingMessage];
                const streamingConversation: Conversation = {
                  ...updatedConversation,
                  messages: finalMessages,
                  updatedAt: Date.now(),
                };

                onUpdateConversation(streamingConversation);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }

      // Generate title if it's still "New Chat" and we have messages
      const finalMessages = [...updatedMessages, {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: assistantContent,
        timestamp: Date.now(),
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

  const handleSend = async (content: string) => {
    if (!conversation) return;

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

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
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
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      const assistantMessageId = `assistant-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;

                // Update conversation with streaming content
                const streamingMessage: Message = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: Date.now(),
                };

                const finalMessages = [...updatedMessages, streamingMessage];
                const streamingConversation: Conversation = {
                  ...updatedConversation,
                  messages: finalMessages,
                  updatedAt: Date.now(),
                };

                onUpdateConversation(streamingConversation);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }

      // Generate title if it's still "New Chat" and we have messages
      const finalMessages = [...updatedMessages, {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: assistantContent,
        timestamp: Date.now(),
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
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {conversation?.title || 'New Chat'}
        </h1>
        <ModelSelector
          selectedModel={currentModel}
          onModelChange={handleModelChange}
          disabled={isLoading}
        />
      </div>

      {/* Messages */}
      <MessageList
        messages={conversation?.messages || []}
        isLoading={isLoading}
        onEditMessage={handleEditMessage}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
