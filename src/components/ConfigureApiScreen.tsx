import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Settings, Key, Globe, Cpu, Save, TestTube, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { loadApiConfig, saveApiConfig, testApiConnection, providerOptions } from '../lib/apiConfig';
import type { ApiConfig, ApiProvider } from '../types';

export default function ConfigureApiScreen() {
  const [config, setConfig] = useState<ApiConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-4o',
  });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadApiConfig().then((loaded) => {
      if (!cancelled) {
        setConfig(loaded);
        setIsLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleProviderChange = (provider: ApiProvider) => {
    const option = providerOptions.find((o) => o.value === provider);
    setConfig((prev) => ({
      ...prev,
      provider,
      model: option?.defaultModel ?? '',
      baseUrl: option?.defaultBaseUrl ?? '',
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveApiConfig(config);
      toast.success('API configuration saved!');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testApiConnection(config);
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Configure API</h1>
              <p className="text-sm text-slate-400">Set up your LLM provider for audio generation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Provider */}
        <Section icon={Cpu} title="API Provider">
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">
            Select the LLM provider you want to use for generating podcast scripts and audio.
          </p>
        </Section>

        {/* API Key */}
        <Section icon={Key} title="API Key">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
              title={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Your API key is stored locally on your device and never sent anywhere except to the provider you select above.
          </p>
        </Section>

        {/* Base URL */}
        <Section icon={Globe} title="Base URL (Optional)">
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="https://api.example.com/v1"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            Leave empty to use the provider's default endpoint. Use this for proxies, local models (Ollama), or Azure OpenAI.
          </p>
        </Section>

        {/* Model */}
        <Section icon={Cpu} title="Model">
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
            placeholder="gpt-4o"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            The model identifier used for chat completions, e.g. gpt-4o, claude-3-5-sonnet, etc.
          </p>
        </Section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>

          <button
            onClick={handleTest}
            disabled={isTesting || !config.apiKey.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <TestTube className="w-5 h-5" />}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border',
              testResult.success
                ? 'bg-green-900/20 border-green-500/30 text-green-300'
                : 'bg-red-900/20 border-red-500/30 text-red-300'
            )}
          >
            {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}
