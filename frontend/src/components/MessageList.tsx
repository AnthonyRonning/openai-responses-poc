import { useEffect, useRef, useState } from 'react';

import { Bot, Clock, Sparkles, Trash2, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { Message } from '../types';
import { WebSearchIndicator } from './WebSearchIndicator';

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageList({ messages, isGenerating, onDeleteMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {messages.length === 0 && !isGenerating && (
            <div className="text-center py-12 space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Welcome to OpenAI Conversations</h2>
              <p className="text-muted-foreground">
                Start a conversation by typing a message below
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'group flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="relative flex-1 max-w-[70%]">
                <div className="flex flex-col gap-2">
                  {message.webSearchCalls && message.webSearchCalls.length > 0 && (
                    <WebSearchIndicator searches={message.webSearchCalls} />
                  )}

                  <Card
                    className={cn(
                      'relative overflow-hidden',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50',
                    )}
                  >
                    <div className="px-4 py-3">
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {message.status === 'streaming' && (
                        <div className="mt-2 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse delay-75" />
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse delay-150" />
                        </div>
                      )}
                    </div>

                    {message.timestamp > 0 && (
                      <div
                        className={cn(
                          'px-4 pb-2 text-xs flex items-center gap-1',
                          message.role === 'user'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground',
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {formatTime(message.timestamp)}
                      </div>
                    )}
                  </Card>
                </div>

                {onDeleteMessage &&
                  hoveredMessageId === message.id &&
                  message.status !== 'streaming' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'absolute top-0 h-8 w-8',
                            message.role === 'user' ? '-left-10' : '-right-10',
                          )}
                          onClick={() => onDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete message</TooltipContent>
                    </Tooltip>
                  )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isGenerating && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted/50">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </ScrollArea>
  );
}
