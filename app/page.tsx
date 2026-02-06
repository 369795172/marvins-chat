'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { Conversation } from '@/lib/types';
import { storage } from '@/lib/storage';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    // Load conversations from storage
    const loadedConversations = storage.getConversations();
    
    // Migrate old conversations to include model field (backward compatibility)
    const migratedConversations = loadedConversations.map(conv => ({
      ...conv,
      model: conv.model || 'grok-4-fast', // Default fallback
    }));
    
    if (migratedConversations.length !== loadedConversations.length || 
        migratedConversations.some((c, i) => c.model !== loadedConversations[i]?.model)) {
      storage.saveConversations(migratedConversations);
    }
    
    setConversations(migratedConversations);
    
    // Set active conversation to the most recent one
    if (migratedConversations.length > 0) {
      const sorted = [...migratedConversations].sort((a, b) => b.updatedAt - a.updatedAt);
      setActiveConversationId(sorted[0].id);
    }
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const handleNewConversation = () => {
    // Use first available model or fallback to grok-4-fast
    // ModelSelector will update it if needed when it loads
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      model: 'grok-4-fast', // Default, will be updated by ModelSelector if needed
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setActiveConversationId(newConversation.id);
    storage.saveConversations(updatedConversations);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    storage.saveConversations(updatedConversations);

    if (activeConversationId === id) {
      if (updatedConversations.length > 0) {
        const sorted = [...updatedConversations].sort((a, b) => b.updatedAt - a.updatedAt);
        setActiveConversationId(sorted[0].id);
      } else {
        setActiveConversationId(null);
      }
    }
  };

  const handleUpdateConversation = (conversation: Conversation) => {
    // Update title if it's still "New Chat" and there are messages
    if (conversation.title === 'New Chat' && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        conversation.title = firstUserMessage.content.slice(0, 50) || 'New Chat';
      }
    }

    const updatedConversations = conversations.map(c =>
      c.id === conversation.id ? conversation : c
    );
    
    // If conversation doesn't exist, add it
    if (!conversations.find(c => c.id === conversation.id)) {
      updatedConversations.unshift(conversation);
    }

    setConversations(updatedConversations);
    storage.saveConversations(updatedConversations);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewConversation={handleNewConversation}
      />
      <div className="flex-1 overflow-hidden">
        {activeConversation ? (
          <ChatInterface
            conversation={activeConversation}
            onUpdateConversation={handleUpdateConversation}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-950 text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No conversation selected</p>
              <p className="text-sm">Create a new chat to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
