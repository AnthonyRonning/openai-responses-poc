import { createContext } from 'react';

import type { ActiveSession, Conversation, LogEntry } from '../types';

export interface ConversationContextType {
  conversations: Conversation[];
  activeConversation?: string;
  currentSession?: ActiveSession;
  logs: LogEntry[];
  createConversation: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  switchConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearLogs: () => void;
  isGenerating: boolean;
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);
