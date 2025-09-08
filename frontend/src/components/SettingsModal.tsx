import { useEffect, useState } from 'react';

import { Eye, EyeOff, Loader2, TestTube } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your OpenAI API settings and preferences.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">API Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your OpenAI API key. Get one from platform.openai.com
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-url">Base URL</Label>
              <Input
                id="base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                API endpoint URL (use default for OpenAI)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
              />
              <p className="text-xs text-muted-foreground">The model to use for responses</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testApiConnection}
                disabled={isTesting || !apiKey}
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Dark mode and theme settings coming soon...
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
