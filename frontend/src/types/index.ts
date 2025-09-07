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

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
}

export interface ActiveSession {
  conversationId: string;
  messages: Message[];
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
