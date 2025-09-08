import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import type { AppSettings } from '../types';
import { SettingsContext } from './settings-context';

const defaultSettings: AppSettings = {
  api: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    timeout: 30000,
  },
  streaming: {
    enabled: true,
    bufferSize: 10,
  },
  tools: {
    webSearch: true,
  },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      return {
        ...defaultSettings,
        api: {
          ...defaultSettings.api,
          apiKey,
        },
      };
    }
    return defaultSettings;
  });

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev };

      if (updates.api) {
        newSettings.api = { ...prev.api, ...updates.api };
      }
      if (updates.streaming) {
        newSettings.streaming = { ...prev.streaming, ...updates.streaming };
      }
      if (updates.tools) {
        newSettings.tools = { ...prev.tools, ...updates.tools };
      }

      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
