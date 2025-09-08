import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { Loader2, Search, Send, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InputAreaProps {
  onSendMessage: (message: string) => Promise<void>;
  isGenerating: boolean;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onCancelGeneration?: () => void;
}

export function InputArea({
  onSendMessage,
  isGenerating,
  webSearchEnabled,
  onToggleWebSearch,
  onCancelGeneration,
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const message = input.trim();
    if (!message || isGenerating || isSending) return;

    setIsSending(true);
    setInput('');

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div className="border-t bg-background px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="web-search" className="flex items-center gap-2 cursor-pointer">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Web Search</span>
              </Label>
              <Switch
                id="web-search"
                checked={webSearchEnabled}
                onCheckedChange={onToggleWebSearch}
              />
            </div>

            {input.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {input.length} characters
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isGenerating || isSending}
              className="flex-1 resize-none min-h-[52px] max-h-[200px]"
              rows={1}
            />

            {isGenerating && onCancelGeneration ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={onCancelGeneration}
                    variant="destructive"
                    size="icon"
                    className="h-[52px] w-[52px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel generation</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    disabled={!input.trim() || isGenerating || isSending}
                    size="icon"
                    className="h-[52px] w-[52px]"
                  >
                    {isGenerating || isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isGenerating ? 'Generating...' : 'Send message (Enter)'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </form>
      </div>
    </div>
  );
}
