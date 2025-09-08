import { createContext } from 'react';

import type { ActiveSession, Conversation } from '../types';

export interface ConversationContextType {
  conversations: Conversation[];
  activeConversation?: string;
  currentSession?: ActiveSession;
  createConversation: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  switchConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  isGenerating: boolean;
  cancelGeneration: () => void;
  generateTitle: (conversationId: string) => Promise<void>;
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);
