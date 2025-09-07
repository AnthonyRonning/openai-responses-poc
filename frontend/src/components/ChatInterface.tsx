import { useCallback } from 'react';

import { MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';

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
    sendMessage,
    isGenerating,
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
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  activeConversation === conv.id ? 'bg-gray-800' : 'hover:bg-gray-800'
                }`}
                onClick={() => switchConversation(conv.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title || `Conversation ${conv.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-400">{conv.messageCount} messages</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
                {conv.status === 'generating' && (
                  <div className="mt-1 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                OpenAI Responses & Conversations Demo
              </h1>
            </div>
            <button
              onClick={onOpenSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {!settings.api.apiKey ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">API Key Required</h2>
              <p className="text-gray-600 mb-4">
                Please configure your OpenAI API key in settings to start chatting.
              </p>
              <button
                onClick={onOpenSettings}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Open Settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={currentSession?.messages || []} isGenerating={isGenerating} />
            <InputArea
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              webSearchEnabled={settings.tools.webSearch}
              onToggleWebSearch={handleToggleWebSearch}
            />
          </>
        )}
      </div>
    </div>
  );
}
