import { useEffect, useState } from 'react';

import { Eye, EyeOff, TestTube, X } from 'lucide-react';

import { useSettings } from '../hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [apiKey, setApiKey] = useState(settings.api.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.api.baseUrl);
  const [model, setModel] = useState(settings.api.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.api.apiKey);
      setBaseUrl(settings.api.baseUrl);
      setModel(settings.api.model);
      setTestResult(null);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    updateSettings({
      api: {
        ...settings.api,
        apiKey,
        baseUrl,
        model,
      },
    });
    onClose();
  };

  const testApiConnection = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'API key is required' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: errorData.error?.message || `Error: ${response.status} ${response.statusText}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your OpenAI API key. Get one from platform.openai.com
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  API endpoint URL (for custom deployments)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Model to use for responses (e.g., gpt-4o, gpt-4o-mini)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={testApiConnection}
                  disabled={isTesting || !apiKey}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult && (
                  <div
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Streaming</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.streaming.enabled}
                onChange={(e) =>
                  updateSettings({
                    streaming: {
                      ...settings.streaming,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Enable streaming responses</span>
            </label>
            <p className="mt-1 ml-7 text-xs text-gray-500">
              Show AI responses as they're generated (recommended)
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tools</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.tools.webSearch}
                onChange={(e) =>
                  updateSettings({
                    tools: {
                      ...settings.tools,
                      webSearch: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Enable web search</span>
            </label>
            <p className="mt-1 ml-7 text-xs text-gray-500">
              Allow AI to search the web for current information
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Developer Options</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.developer.showLogs}
                onChange={(e) =>
                  updateSettings({
                    developer: {
                      ...settings.developer,
                      showLogs: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Show API logs</span>
            </label>
            <p className="mt-1 ml-7 text-xs text-gray-500">
              Display request/response logs in developer console
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
