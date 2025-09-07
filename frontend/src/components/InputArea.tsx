import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Globe, Loader2, Send, X } from 'lucide-react';

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
    <div className="border-t bg-white px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleWebSearch}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                webSearchEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              Web Search {webSearchEnabled ? 'On' : 'Off'}
            </button>

            <div className="text-xs text-gray-500">
              {input.length > 0 && `${input.length} characters`}
            </div>
          </div>

          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isGenerating || isSending}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              rows={1}
            />

            {isGenerating && onCancelGeneration ? (
              <button
                type="button"
                onClick={onCancelGeneration}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isGenerating || isSending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isGenerating || isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isGenerating ? 'Generating...' : 'Send'}
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</div>
        </form>
      </div>
    </div>
  );
}
