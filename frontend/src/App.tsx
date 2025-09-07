import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { ConversationProvider } from './contexts/ConversationContext';
import { SettingsProvider } from './contexts/SettingsContext';

const queryClient = new QueryClient();

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ConversationProvider>
          <ChatInterface onOpenSettings={() => setIsSettingsOpen(true)} />
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </ConversationProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
