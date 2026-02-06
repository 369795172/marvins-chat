'use client';

import { Message } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export default function MessageList({ messages, isLoading, onEditMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartEdit = (message: Message) => {
    setEditingId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim() && onEditMessage) {
      onEditMessage(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg">Start a conversation</p>
            <p className="text-sm mt-2">Send a message to begin chatting</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 relative group ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {editingId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                        rows={Math.min(editContent.split('\n').length, 10)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSaveEdit();
                          }
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim()}
                          className="px-3 py-1 text-sm bg-blue-700 hover:bg-blue-800 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          Save & Resend
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-invert prose-sm max-w-none break-words">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            components={{
                              // Custom styling for code blocks
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                  <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto my-2">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              // Custom styling for links
                              a: ({ node, ...props }: any) => (
                                <a className="text-blue-400 hover:text-blue-300 underline" {...props} />
                              ),
                              // Custom styling for lists
                              ul: ({ node, ...props }: any) => (
                                <ul className="list-disc list-inside my-2 space-y-1" {...props} />
                              ),
                              ol: ({ node, ...props }: any) => (
                                <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
                              ),
                              // Custom styling for headings
                              h1: ({ node, ...props }: any) => (
                                <h1 className="text-xl font-bold my-3" {...props} />
                              ),
                              h2: ({ node, ...props }: any) => (
                                <h2 className="text-lg font-semibold my-2" {...props} />
                              ),
                              h3: ({ node, ...props }: any) => (
                                <h3 className="text-base font-semibold my-2" {...props} />
                              ),
                              // Custom styling for blockquotes
                              blockquote: ({ node, ...props }: any) => (
                                <blockquote className="border-l-4 border-gray-600 pl-4 italic my-2 text-gray-300" {...props} />
                              ),
                              // Custom styling for tables
                              table: ({ node, ...props }: any) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="min-w-full border-collapse border border-gray-700" {...props} />
                                </div>
                              ),
                              th: ({ node, ...props }: any) => (
                                <th className="border border-gray-700 px-4 py-2 bg-gray-800 font-semibold" {...props} />
                              ),
                              td: ({ node, ...props }: any) => (
                                <td className="border border-gray-700 px-4 py-2" {...props} />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                      {message.role === 'user' && onEditMessage && (
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-700 rounded"
                          aria-label="Edit message"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">U</span>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-300 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
