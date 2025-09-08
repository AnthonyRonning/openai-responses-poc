export interface AppSettings {
  api: {
    baseUrl: string;
    apiKey: string;
    model: string;
    timeout: number;
  };
  streaming: {
    enabled: boolean;
    bufferSize: number;
  };
  tools: {
    webSearch: boolean;
  };
  developer: {
    showLogs: boolean;
    logLevel: 'none' | 'basic' | 'verbose';
  };
}

export interface Conversation {
  id: string;
  title?: string;
  createdAt: number;
  lastActive: number;
  messageCount: number;
  status: 'active' | 'generating' | 'error';
}

export interface WebSearchAction {
  type: 'search' | 'open_page' | 'find_in_page';
  query?: string;
  url?: string;
}

export interface WebSearchCall {
  id: string;
  status: 'in_progress' | 'searching' | 'completed';
  action?: WebSearchAction;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'error' | 'searching';
  webSearchCalls?: WebSearchCall[];
}

export interface WebSearchItem {
  id: string;
  type: 'web_search_call';
  webSearchCall: WebSearchCall;
}

export type ConversationItem = Message | WebSearchItem;

export interface ActiveSession {
  conversationId: string;
  messages: Message[];
  items: ConversationItem[];
  responseId?: string;
  backgroundId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'stream';
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  status?: number;
  duration?: number;
  size?: number;
}
