import { useCallback } from 'react';

import { Bot, MessageSquare, Plus, Search, Settings, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useConversation } from '../hooks/useConversation';
import { useSettings } from '../hooks/useSettings';
import { InputArea } from './InputArea';
import { MessageList } from './MessageList';

interface ChatInterfaceProps {
  onOpenSettings: () => void;
}

export function ChatInterface({ onOpenSettings }: ChatInterfaceProps) {
  const {
    conversations,
    activeConversation,
    currentSession,
    createConversation,
    switchConversation,
    deleteConversation,
    deleteMessage,
    sendMessage,
    isGenerating,
    cancelGeneration,
  } = useConversation();

  const { settings, updateSettings } = useSettings();

  const handleSendMessage = useCallback(
    async (content: string) => {
      await sendMessage(content);
    },
    [sendMessage],
  );

  const handleToggleWebSearch = useCallback(() => {
    updateSettings({
      tools: {
        ...settings.tools,
        webSearch: !settings.tools.webSearch,
      },
    });
  }, [settings.tools, updateSettings]);

  const handleNewConversation = useCallback(async () => {
    try {
      await createConversation();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [createConversation]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    },
    [deleteConversation],
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/10 flex flex-col">
          <div className="p-3 border-b">
            <Button
              onClick={handleNewConversation}
              className="w-full justify-start gap-2"
              variant="default"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group relative p-3 rounded-lg cursor-pointer transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    activeConversation === conv.id && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => switchConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || `Conversation ${conv.id.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {conv.messageCount} messages
                        </span>
                        {conv.status === 'generating' && (
                          <Badge variant="secondary" className="h-4 text-xs px-1">
                            Generating
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete conversation</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Bot className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">OpenAI Responses & Conversations</h1>
                {settings.tools.webSearch && (
                  <Badge variant="secondary" className="gap-1">
                    <Search className="h-3 w-3" />
                    Web Search
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {settings.api.apiKey && (
                  <Badge variant="outline" className="text-xs">
                    {settings.api.model}
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          {!settings.api.apiKey ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Configure API Key</h2>
                  <p className="text-sm text-muted-foreground">
                    Please configure your OpenAI API key in settings to start chatting.
                  </p>
                </div>
                <Button onClick={onOpenSettings}>Open Settings</Button>
              </div>
            </div>
          ) : (
            <>
              <MessageList
                messages={currentSession?.messages || []}
                isGenerating={isGenerating}
                onDeleteMessage={deleteMessage}
              />
              <InputArea
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                webSearchEnabled={settings.tools.webSearch}
                onToggleWebSearch={handleToggleWebSearch}
                onCancelGeneration={cancelGeneration}
              />
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
