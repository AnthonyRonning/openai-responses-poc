import { ReactNode, useCallback, useMemo, useState } from 'react';

import { useSettings } from '../hooks/useSettings';
import { OpenAIClient } from '../lib/openai-client';
import type { ActiveSession, Conversation, LogEntry, Message } from '../types';
import { ConversationContext } from './conversation-context';

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>();
  const [currentSession, setCurrentSession] = useState<ActiveSession>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const client = useMemo(() => {
    if (!settings.api.apiKey) return null;

    return new OpenAIClient(settings, (entry) => {
      if (settings.developer.showLogs) {
        setLogs((prev) => [...prev.slice(-99), entry]);
      }
    });
  }, [settings]);

  const createConversation = useCallback(async () => {
    if (!client) {
      throw new Error('API key not configured');
    }

    try {
      const conversation = await client.createConversation();
      const newConv: Conversation = {
        id: conversation.id,
        createdAt: conversation.created_at * 1000,
        lastActive: Date.now(),
        messageCount: 0,
        status: 'active',
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(conversation.id);
      setCurrentSession({
        conversationId: conversation.id,
        messages: [],
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }, [client]);

  const loadConversationItems = useCallback(
    async (id: string) => {
      if (!client) return [];

      try {
        const items = await client.getConversationItems(id);
        const messages: Message[] = items
          .filter((item) => item.type === 'message' && item.role && item.content)
          .map((item) => ({
            id: item.id,
            role: item.role as 'user' | 'assistant' | 'system',
            content: item.content!,
            timestamp: item.created_at * 1000,
            status: 'complete' as const,
          }));

        return messages;
      } catch (error) {
        console.error('Failed to load conversation items:', error);
        return [];
      }
    },
    [client],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      if (!client) {
        throw new Error('API key not configured');
      }

      try {
        const conversation = await client.getConversation(id);
        const messages = await loadConversationItems(id);

        const conv: Conversation = {
          id: conversation.id,
          createdAt: conversation.created_at * 1000,
          lastActive: Date.now(),
          messageCount: messages.length,
          status: 'active',
        };

        setConversations((prev) => {
          const existing = prev.find((c) => c.id === id);
          if (existing) {
            return prev.map((c) => (c.id === id ? conv : c));
          }
          return [conv, ...prev];
        });

        setActiveConversation(id);
        setCurrentSession({
          conversationId: id,
          messages,
        });
      } catch (error) {
        console.error('Failed to load conversation:', error);
        throw error;
      }
    },
    [client, loadConversationItems],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!client) {
        throw new Error('API key not configured');
      }

      try {
        await client.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));

        if (activeConversation === id) {
          setActiveConversation(undefined);
          setCurrentSession(undefined);
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        throw error;
      }
    },
    [client, activeConversation],
  );

  const switchConversation = useCallback(
    async (id: string) => {
      await loadConversation(id);
    },
    [loadConversation],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!client) {
        throw new Error('API key not configured');
      }

      let conversationId = currentSession?.conversationId;

      // Create a new conversation if we don't have one
      if (!conversationId) {
        try {
          const conversation = await client.createConversation();
          const newConv: Conversation = {
            id: conversation.id,
            createdAt: conversation.created_at * 1000,
            lastActive: Date.now(),
            messageCount: 0,
            status: 'active',
          };

          setConversations((prev) => [newConv, ...prev]);
          setActiveConversation(conversation.id);
          conversationId = conversation.id;

          // Initialize the session
          setCurrentSession({
            conversationId: conversation.id,
            messages: [],
          });
        } catch (error) {
          console.error('Failed to create conversation:', error);
          throw error;
        }
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'complete',
      };

      setCurrentSession((prev) => {
        if (!prev) {
          return {
            conversationId: conversationId!,
            messages: [userMessage],
          };
        }
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
        };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status: 'generating',
                lastActive: Date.now(),
                messageCount: c.messageCount + 1,
              }
            : c,
        ),
      );

      setIsGenerating(true);

      try {
        const response = await client.createResponse({
          model: settings.api.model,
          conversation: conversationId,
          input: [{ role: 'user', content }],
          stream: false,
          store: true,
          tools: settings.tools.webSearch ? [{ type: 'web_search' }] : undefined,
        });

        const assistantMessage: Message = {
          id: response.id,
          role: 'assistant',
          content: response.output?.[0]?.content?.[0]?.text || 'No response generated',
          timestamp: Date.now(),
          status: 'complete',
        };

        setCurrentSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, assistantMessage],
          };
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, status: 'active', messageCount: c.messageCount + 1 }
              : c,
          ),
        );
      } catch (error) {
        console.error('Failed to send message:', error);

        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, status: 'error' } : c)),
        );

        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [client, currentSession, settings],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Remove auto-creation of conversation on mount

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeConversation,
        currentSession,
        logs,
        createConversation,
        loadConversation,
        deleteConversation,
        switchConversation,
        sendMessage,
        clearLogs,
        isGenerating,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
