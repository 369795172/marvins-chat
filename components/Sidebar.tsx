'use client';

import { Conversation } from '@/lib/types';
import ConversationItem from './ConversationItem';
import { useState } from 'react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <button
            onClick={onNewConversation}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors w-full"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm font-medium">New Chat</span>
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={onNewConversation}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="New Chat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-2 p-2 hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            {!isCollapsed && <p>No conversations yet</p>}
            {!isCollapsed && <p className="mt-2">Start a new chat to begin</p>}
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
