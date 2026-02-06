'use client';

import { Conversation } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export default function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(conversation.updatedAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-gray-800 text-white'
          : 'hover:bg-gray-800/50 text-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{conversation.title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{timeAgo}</div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
        aria-label="Delete conversation"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
