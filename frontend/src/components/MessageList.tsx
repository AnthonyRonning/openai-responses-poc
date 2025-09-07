import { useEffect, useRef, useState } from 'react';

import { Bot, Clock, Trash2, User } from 'lucide-react';

import type { Message } from '../types';

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
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && !isGenerating && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome to OpenAI Responses & Conversations Demo
            </h2>
            <p className="text-gray-600">Start a conversation by typing a message below</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`group flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-green-600" />
              </div>
            )}

            <div className="relative">
              <div
                className={`max-w-[70%] ${
                  message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                } rounded-lg px-4 py-3`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                {message.status === 'streaming' && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                  </div>
                )}
                {message.timestamp > 0 && (
                  <div
                    className={`mt-2 text-xs flex items-center gap-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {formatTime(message.timestamp)}
                  </div>
                )}
              </div>

              {onDeleteMessage &&
                hoveredMessageId === message.id &&
                message.status !== 'streaming' && (
                  <button
                    onClick={() => onDeleteMessage(message.id)}
                    className={`absolute top-2 ${
                      message.role === 'user' ? '-left-8' : '-right-8'
                    } p-1 rounded hover:bg-gray-200 transition-colors`}
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                  </button>
                )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
