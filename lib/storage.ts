import { Conversation } from './types';

const STORAGE_KEY = 'chatgpt-clone-conversations';

export const storage = {
  getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  },

  getConversation(id: string): Conversation | null {
    const conversations = this.getConversations();
    return conversations.find(c => c.id === id) || null;
  },

  saveConversation(conversation: Conversation): void {
    const conversations = this.getConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.push(conversation);
    }
    
    this.saveConversations(conversations);
  },

  deleteConversation(id: string): void {
    const conversations = this.getConversations();
    const filtered = conversations.filter(c => c.id !== id);
    this.saveConversations(filtered);
  },
};
