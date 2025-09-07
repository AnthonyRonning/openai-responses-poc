import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useSettings } from '../hooks/useSettings';
import { OpenAIClient } from '../lib/openai-client';
import { StreamManager } from '../lib/streaming';
import type { ActiveSession, Conversation, LogEntry, Message } from '../types';
import { ConversationContext } from './conversation-context';

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>();
  const [currentSession, setCurrentSession] = useState<ActiveSession>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSeenItemId, setLastSeenItemId] = useState<string | undefined>();
  const streamManagerRef = useRef<StreamManager>(new StreamManager());
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const client = useMemo(() => {
    if (!settings.api.apiKey) return null;

    return new OpenAIClient(settings, (entry) => {
      if (settings.developer.showLogs) {
        setLogs((prev) => [...prev.slice(-99), entry]);
      }
    });
  }, [settings]);

  const createConversation = useCallback(async () => {
    // Just reset the UI to a fresh state
    // Don't actually create a conversation until the first message is sent
    setActiveConversation(undefined);
    setCurrentSession(undefined);
    setLastSeenItemId(undefined);

    // Clear the URL parameter
    const params = new URLSearchParams(window.location.search);
    params.delete('conversation_id');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  const loadConversationItems = useCallback(
    async (id: string, after?: string) => {
      if (!client) return { messages: [], lastId: undefined };

      try {
        const result = await client.getConversationItems(id, after);
        const messages: Message[] = result.items
          .filter((item) => item.type === 'message' && item.role && item.content)
          .map((item) => {
            // Extract text from content array
            let text = '';
            if (Array.isArray(item.content)) {
              for (const part of item.content) {
                if (typeof part === 'object' && part.text) {
                  text += part.text;
                }
              }
            } else if (typeof item.content === 'string') {
              text = item.content;
            }

            return {
              id: item.id,
              role: item.role as 'user' | 'assistant' | 'system',
              content: text,
              timestamp: 0, // API doesn't provide timestamps for loaded messages
              status: 'complete' as const,
            };
          }); // API now returns in ascending order (oldest first)

        return { messages, lastId: result.lastId };
      } catch (error) {
        console.error('Failed to load conversation items:', error);
        return { messages: [], lastId: undefined };
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
        const { messages, lastId } = await loadConversationItems(id);

        const conv: Conversation = {
          id: conversation.id,
          createdAt: conversation.created_at * 1000,
          lastActive: Date.now(),
          messageCount: messages.length,
          status: 'active',
          title: conversation.metadata?.title,
        };

        setLastSeenItemId(lastId);

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

        // Update URL with conversation ID
        const params = new URLSearchParams(window.location.search);
        params.set('conversation_id', id);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
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

  const generateTitle = useCallback(
    async (conversationId: string, firstUserMessageContent?: string) => {
      if (!client) return;

      try {
        // Use provided content or try to find it in current session
        let messageContent = firstUserMessageContent;
        if (!messageContent && currentSession) {
          const firstUserMessage = currentSession.messages.find((msg) => msg.role === 'user');
          messageContent = firstUserMessage?.content;
        }

        if (!messageContent) {
          console.log('No user message found for title generation');
          return;
        }

        console.log('Generating title for conversation:', conversationId);

        // Generate a title using the Responses API
        const response = await client.createResponse({
          model: settings.api.model,
          input: [
            {
              role: 'system',
              content:
                'Generate a very short title (3-5 words max) for this conversation based on the first user message. Respond with ONLY the title, no quotes or extra text.',
            },
            {
              role: 'user',
              content: messageContent,
            },
          ],
          stream: false,
          store: false,
        });

        const responseData = response as { output?: Array<{ content?: Array<{ text?: string }> }> };
        const title = responseData.output?.[0]?.content?.[0]?.text || 'New Chat';
        console.log('Generated title:', title);

        // Update conversation metadata with the title
        await client.updateConversation(conversationId, { title: title.trim() });

        // Update local state
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title: title.trim() } : c)),
        );
      } catch (error) {
        console.error('Failed to generate title:', error);
      }
    },
    [client, currentSession, settings.api.model],
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

          // Update URL with conversation ID
          const params = new URLSearchParams(window.location.search);
          params.set('conversation_id', conversation.id);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

          // Generate title for new conversation immediately
          console.log('New conversation created, generating title for:', conversation.id);
          generateTitle(conversation.id, content).catch((error) => {
            console.error('Failed to generate title for new conversation:', error);
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

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await client.createResponse({
          model: settings.api.model,
          conversation: conversationId,
          input: [{ role: 'user', content }],
          stream: settings.streaming.enabled,
          store: true,
          tools: settings.tools.webSearch ? [{ type: 'web_search' }] : undefined,
          signal: abortControllerRef.current.signal,
        });

        // Check if this is a streaming response
        if (settings.streaming.enabled && response instanceof Response) {
          // Streaming response
          const localAssistantId = crypto.randomUUID();
          let serverItemId: string | undefined;
          const assistantMessage: Message = {
            id: localAssistantId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            status: 'streaming',
          };

          setCurrentSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, assistantMessage],
            };
          });

          await streamManagerRef.current.startStream(
            response,
            (content) => {
              // Update the streaming message content
              setCurrentSession((prev) => {
                if (!prev) return prev;
                const messages = prev.messages.map((msg, idx) => {
                  if (idx === prev.messages.length - 1 && msg.role === 'assistant') {
                    return { ...msg, content: msg.content + content };
                  }
                  return msg;
                });
                return { ...prev, messages };
              });
            },
            () => {
              // Mark message as complete and update ID if we have server ID
              setCurrentSession((prev) => {
                if (!prev) return prev;
                const messages = prev.messages.map((msg, idx) => {
                  if (idx === prev.messages.length - 1 && msg.role === 'assistant') {
                    return {
                      ...msg,
                      id: serverItemId || msg.id,
                      status: 'complete' as const,
                    };
                  }
                  return msg;
                });
                return { ...prev, messages };
              });

              // Update lastSeenItemId if we got a server ID
              if (serverItemId) {
                setLastSeenItemId(serverItemId);
              }

              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationId
                    ? { ...c, status: 'active', messageCount: c.messageCount + 1 }
                    : c,
                ),
              );
              setIsGenerating(false);
            },
            (error) => {
              console.error('Streaming error:', error);
              setConversations((prev) =>
                prev.map((c) => (c.id === conversationId ? { ...c, status: 'error' } : c)),
              );
              setIsGenerating(false);
            },
            (chunk) => {
              // Extract server item ID from the stream
              if (chunk.item_id && !serverItemId) {
                serverItemId = chunk.item_id;
              }
            },
          );
        } else {
          // Non-streaming response
          const responseData = response as {
            id: string;
            output?: Array<{ content?: Array<{ text?: string }> }>;
          };
          const assistantMessage: Message = {
            id: responseData.id,
            role: 'assistant',
            content: responseData.output?.[0]?.content?.[0]?.text || 'No response generated',
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
        }
      } catch (error) {
        // Don't log error if it was an abort
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to send message:', error);
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, status: 'error' } : c)),
          );
          throw error;
        }
      } finally {
        if (!settings.streaming.enabled) {
          setIsGenerating(false);
        }
      }
    },
    [client, currentSession, settings, generateTitle],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const cancelGeneration = useCallback(() => {
    // Cancel the HTTP request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Cancel the streaming
    streamManagerRef.current.cancel();
    setIsGenerating(false);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation && c.status === 'generating' ? { ...c, status: 'active' } : c,
      ),
    );
  }, [activeConversation]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeConversation || !currentSession || !client) return;

      try {
        // Call API to delete the message
        await client.deleteConversationItem(activeConversation, messageId);

        // Update local state by removing the message
        setCurrentSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter((msg) => msg.id !== messageId),
          };
        });

        // Update message count
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation
              ? { ...c, messageCount: Math.max(0, c.messageCount - 1) }
              : c,
          ),
        );

        // If we deleted the last message that we were using for polling, update lastSeenItemId
        if (messageId === lastSeenItemId && currentSession.messages.length > 1) {
          // Find the second-to-last message ID
          const remainingMessages = currentSession.messages.filter((msg) => msg.id !== messageId);
          if (remainingMessages.length > 0) {
            const newLastId = remainingMessages[remainingMessages.length - 1].id;
            // Only update if it's a server ID (not a local UUID)
            // Server IDs typically start with "item_" or similar pattern, while local IDs are UUIDs
            if (!newLastId.includes('-') || newLastId.startsWith('item_')) {
              setLastSeenItemId(newLastId);
            } else {
              // If it's a local UUID, try to find the last server ID
              const lastServerMessage = remainingMessages
                .slice()
                .reverse()
                .find((msg) => !msg.id.includes('-') || msg.id.startsWith('item_'));
              setLastSeenItemId(lastServerMessage?.id);
            }
          } else {
            setLastSeenItemId(undefined);
          }
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
        throw error;
      }
    },
    [activeConversation, currentSession, client, lastSeenItemId],
  );

  // Poll for new conversation items
  const pollForNewItems = useCallback(async () => {
    if (!client || !activeConversation) return;

    try {
      const { messages: newMessages, lastId } = await loadConversationItems(
        activeConversation,
        lastSeenItemId,
      );

      if (newMessages.length > 0) {
        // Add new messages to the current session
        setCurrentSession((prev) => {
          if (!prev) return prev;

          // More robust deduplication:
          // 1. Check by ID (for messages that have server IDs)
          // 2. Check by content + role + rough timestamp (for local messages not yet synced)
          const existingIds = new Set(prev.messages.map((m) => m.id));
          const existingSignatures = new Set(
            prev.messages.map((m) => `${m.role}:${m.content.substring(0, 100)}`),
          );

          const uniqueNewMessages = newMessages.filter((m) => {
            // Skip if we already have this ID
            if (existingIds.has(m.id)) return false;

            // Skip if we have a message with same role and similar content (likely a local duplicate)
            const signature = `${m.role}:${m.content.substring(0, 100)}`;
            if (existingSignatures.has(signature)) return false;

            return true;
          });

          if (uniqueNewMessages.length === 0) return prev;

          // Replace local messages with server versions when they match
          const updatedMessages = prev.messages.map((msg) => {
            // If this is a local message (random UUID), check if we have a server version
            if (msg.id.includes('-') && msg.id.length === 36) {
              // UUID format
              const serverVersion = uniqueNewMessages.find(
                (newMsg) => newMsg.role === msg.role && newMsg.content === msg.content,
              );
              if (serverVersion) {
                // Mark this server version as already processed
                uniqueNewMessages.splice(uniqueNewMessages.indexOf(serverVersion), 1);
                return { ...msg, id: serverVersion.id }; // Update with server ID
              }
            }
            return msg;
          });

          // Add any truly new messages
          return {
            ...prev,
            messages: [...updatedMessages, ...uniqueNewMessages],
          };
        });

        // Update message count in conversations
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation
              ? { ...c, messageCount: (currentSession?.messages.length || 0) + newMessages.length }
              : c,
          ),
        );

        // Update last seen item ID
        if (lastId) {
          setLastSeenItemId(lastId);
        }

        // Check if we're no longer generating based on new messages
        if (isGenerating && newMessages.some((m) => m.role === 'assistant')) {
          setIsGenerating(false);
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversation ? { ...c, status: 'active' } : c)),
          );
        }
      }
    } catch (error) {
      console.error('Failed to poll for new items:', error);
    }
  }, [
    client,
    activeConversation,
    lastSeenItemId,
    loadConversationItems,
    isGenerating,
    currentSession,
  ]);

  // Set up polling interval
  useEffect(() => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Only poll if we have an active conversation
    if (activeConversation && client) {
      // Poll immediately
      pollForNewItems();

      // Then set up interval for every 5 seconds
      pollingIntervalRef.current = setInterval(pollForNewItems, 5000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeConversation, client, pollForNewItems]);

  // Check for conversation on mount
  useEffect(() => {
    // Only run once on mount when client is ready
    if (!client) return;

    const initializeFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const conversationId = params.get('conversation_id');

      // Load the conversation if we have one in the URL and not already loaded
      if (conversationId && !activeConversation) {
        try {
          await loadConversation(conversationId);
        } catch (error) {
          console.error('Failed to load conversation from URL:', error);
          // Remove invalid conversation_id from URL
          params.delete('conversation_id');
          window.history.replaceState(
            {},
            '',
            params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname,
          );
        }
      }
    };

    initializeFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only depend on client to avoid infinite loops

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
        deleteMessage,
        switchConversation,
        sendMessage,
        clearLogs,
        isGenerating,
        cancelGeneration,
        generateTitle,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
