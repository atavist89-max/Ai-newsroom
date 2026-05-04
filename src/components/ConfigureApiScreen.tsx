import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Settings, Cpu, Save, TestTube, Eye, EyeOff, Loader2, CheckCircle, XCircle, Search, FolderOpen, Headphones, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { loadApiConfig, saveApiConfig, testApiConnection, loadBraveApiKey, saveBraveApiKey, testBraveApiKey, loadTtsApiKey, saveTtsApiKey, testTtsApiKey, loadTestMode, saveTestMode, providerOptions, defaultAppApiConfig } from '../lib/apiConfig';
import type { AppApiConfig, ApiProvider } from '../types';

type ConnectionKey = 'main' | 'lightweight' | 'thinking';

const CONNECTION_META: Record<ConnectionKey, { label: string; description: string; icon: typeof Cpu; color: string }> = {
  main: {
    label: 'Main Connection',
    description: 'Used by Segment Editor and Segment Writer for per-article audits and rewrites.',
    icon: Cpu,
    color: 'blue',
  },
  lightweight: {
    label: 'Lightweight Connection',
    description: 'Used by Article Researcher for fast article discovery and scoring. Recommended: gpt-4o-mini, claude-3-5-haiku.',
    icon: Zap,
    color: 'amber',
  },
  thinking: {
    label: 'Thinking Connection',
    description: 'Used by Script Writer and Full Script Editor/Writer for deep reasoning. Recommended: o3-mini, claude-3-7-sonnet, gpt-5.5.',
    icon: Cpu,
    color: 'purple',
  },
};

export default function ConfigureApiScreen() {
  const [config, setConfig] = useState<AppApiConfig>({ ...defaultAppApiConfig });
  const [showKey, setShowKey] = useState<Record<ConnectionKey, boolean>>({ main: false, lightweight: false, thinking: false });
  const [braveApiKey, setBraveApiKey] = useState('');
  const [showBraveKey, setShowBraveKey] = useState(false);
  const [ttsApiKey, setTtsApiKey] = useState('');
  const [showTtsKey, setShowTtsKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testResults, setTestResults] = useState<Record<ConnectionKey, {
    success: boolean;
    message: string;
    requestBody?: Record<string, unknown>;
    changes?: Array<{ key: string; from: unknown; to: unknown }>;
    warning?: string;
  } | null>>({ main: null, lightweight: null, thinking: null });
  const [isTesting, setIsTesting] = useState<Record<ConnectionKey, boolean>>({ main: false, lightweight: false, thinking: false });

  const [isTestingBrave, setIsTestingBrave] = useState(false);
  const [braveTestResult, setBraveTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [ttsTestResult, setTtsTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testMode, setTestMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadApiConfig(), loadBraveApiKey(), loadTtsApiKey(), loadTestMode()]).then(([loaded, braveKey, ttsKey, testModeEnabled]) => {
      if (!cancelled) {
        setConfig(loaded);
        setBraveApiKey(braveKey);
        setTtsApiKey(ttsKey);
        setTestMode(testModeEnabled);
        setIsLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleProviderChange = (connection: ConnectionKey, provider: ApiProvider) => {
    const option = providerOptions.find((o) => o.value === provider);
    const defaultModel = option?.defaultModel ?? '';
    setConfig((prev) => ({
      ...prev,
      [connection]: {
        ...prev[connection],
        provider,
        model: defaultModel,
        baseUrl: option?.defaultBaseUrl ?? '',
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveApiConfig(config),
        saveBraveApiKey(braveApiKey),
        saveTtsApiKey(ttsApiKey),
        saveTestMode(testMode),
      ]);
      toast.success('API configuration saved!');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (connection: ConnectionKey) => {
    setIsTesting((prev) => ({ ...prev, [connection]: true }));
    setTestResults((prev) => ({ ...prev, [connection]: null }));
    try {
      const result = await testApiConnection(config[connection]);
      setTestResults((prev) => ({ ...prev, [connection]: result }));
      if (result.success) {
        toast.success(`${CONNECTION_META[connection].label}: ${result.message}`);
      } else {
        toast.error(`${CONNECTION_META[connection].label}: ${result.message}`);
      }
    } finally {
      setIsTesting((prev) => ({ ...prev, [connection]: false }));
    }
  };

  const handleTestBrave = async () => {
    setIsTestingBrave(true);
    setBraveTestResult(null);
    try {
      const result = await testBraveApiKey(braveApiKey);
      setBraveTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTestingBrave(false);
    }
  };

  const handleTestTts = async () => {
    setIsTestingTts(true);
    setTtsTestResult(null);
    try {
      const result = await testTtsApiKey(ttsApiKey);
      setTtsTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTestingTts(false);
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
              <p className="text-sm text-slate-400">Set up three independent LLM connections for different pipeline stages</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Main Connection */}
        <ConnectionPanel
          connection="main"
          config={config.main}
          showKey={showKey.main}
          onToggleKey={() => setShowKey((prev) => ({ ...prev, main: !prev.main }))}
          onChange={(partial) => setConfig((prev) => ({ ...prev, main: { ...prev.main, ...partial } }))}
          onProviderChange={(provider) => handleProviderChange('main', provider)}
          isTesting={isTesting.main}
          testResult={testResults.main}
          onTest={() => handleTest('main')}
        />

        {/* Lightweight Connection */}
        <ConnectionPanel
          connection="lightweight"
          config={config.lightweight}
          showKey={showKey.lightweight}
          onToggleKey={() => setShowKey((prev) => ({ ...prev, lightweight: !prev.lightweight }))}
          onChange={(partial) => setConfig((prev) => ({ ...prev, lightweight: { ...prev.lightweight, ...partial } }))}
          onProviderChange={(provider) => handleProviderChange('lightweight', provider)}
          isTesting={isTesting.lightweight}
          testResult={testResults.lightweight}
          onTest={() => handleTest('lightweight')}
        />

        {/* Thinking Connection */}
        <ConnectionPanel
          connection="thinking"
          config={config.thinking}
          showKey={showKey.thinking}
          onToggleKey={() => setShowKey((prev) => ({ ...prev, thinking: !prev.thinking }))}
          onChange={(partial) => setConfig((prev) => ({ ...prev, thinking: { ...prev.thinking, ...partial } }))}
          onProviderChange={(provider) => handleProviderChange('thinking', provider)}
          isTesting={isTesting.thinking}
          testResult={testResults.thinking}
          onTest={() => handleTest('thinking')}
        />

        {/* Brave Search API */}
        <Section icon={Search} title="Brave Search API">
          <div className="relative">
            <input
              type={showBraveKey ? 'text' : 'password'}
              value={braveApiKey}
              onChange={(e) => setBraveApiKey(e.target.value)}
              placeholder="BSA..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              onClick={() => setShowBraveKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
              title={showBraveKey ? 'Hide API key' : 'Show API key'}
            >
              {showBraveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Your Brave Search API key for discovering news articles. Free tier: 2,000 queries/month. Get your key at{' '}
            <a href="https://api.search.brave.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              api.search.brave.com
            </a>.
          </p>
          <button
            onClick={handleTestBrave}
            disabled={isTestingBrave || !braveApiKey.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingBrave ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {isTestingBrave ? 'Testing...' : 'Test Brave Search Connection'}
          </button>
          {braveTestResult && (
            <div
              className={cn(
                'mt-2 flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
                braveTestResult.success
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              )}
            >
              {braveTestResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{braveTestResult.message}</span>
            </div>
          )}
        </Section>

        {/* TTS API */}
        <Section icon={Headphones} title="OpenAI TTS API Key">
          <div className="relative">
            <input
              type={showTtsKey ? 'text' : 'password'}
              value={ttsApiKey}
              onChange={(e) => setTtsApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              onClick={() => setShowTtsKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
              title={showTtsKey ? 'Hide API key' : 'Show API key'}
            >
              {showTtsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Your OpenAI API key for text-to-speech generation (gpt-4o-mini-tts model). This can be the same as your LLM key or a separate key. Stored locally on your device.
          </p>
          <button
            onClick={handleTestTts}
            disabled={isTestingTts || !ttsApiKey.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingTts ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {isTestingTts ? 'Testing...' : 'Test TTS Connection'}
          </button>
          {ttsTestResult && (
            <div
              className={cn(
                'mt-2 flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
                ttsTestResult.success
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              )}
            >
              {ttsTestResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{ttsTestResult.message}</span>
            </div>
          )}
        </Section>

        {/* Test Mode */}
        <Section icon={Zap} title="Test Mode">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-slate-200">Skip Editor Loop</div>
              <p className="text-xs text-slate-500">
                When enabled, the pipeline runs Article Research and Script Writer and then jumps straight to Audio Producer,
                skipping all editors, writers, and the assembler. Useful for quickly testing voice and music combinations.
              </p>
            </div>
            <button
              onClick={() => setTestMode((prev) => !prev)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                testMode ? 'bg-amber-500' : 'bg-slate-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  testMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </Section>

        {/* File Storage */}
        <Section icon={FolderOpen} title="File Storage">
          <div className="space-y-1">
            <div className="text-sm text-slate-200">Storage Location</div>
            <p className="text-xs text-slate-500">
              All files are saved to app-private storage. This works without any
              permissions and is the only reliable option on Android 10+ due to
              scoped storage restrictions.
            </p>
          </div>
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
        </div>
      </main>
    </div>
  );
}

function ConnectionPanel({
  connection,
  config,
  showKey,
  onToggleKey,
  onChange,
  onProviderChange,
  isTesting,
  testResult,
  onTest,
}: {
  connection: ConnectionKey;
  config: { provider: ApiProvider; apiKey: string; baseUrl: string; model: string };
  showKey: boolean;
  onToggleKey: () => void;
  onChange: (partial: Partial<{ provider: ApiProvider; apiKey: string; baseUrl: string; model: string }>) => void;
  onProviderChange: (provider: ApiProvider) => void;
  isTesting: boolean;
  testResult: {
    success: boolean;
    message: string;
    requestBody?: Record<string, unknown>;
    changes?: Array<{ key: string; from: unknown; to: unknown }>;
    warning?: string;
  } | null;
  onTest: () => void;
}) {
  const meta = CONNECTION_META[connection];
  const Icon = meta.icon;
  const colorClasses: Record<string, { border: string; title: string; button: string }> = {
    blue: { border: 'border-blue-500/30', title: 'text-blue-300', button: 'hover:bg-blue-900/30' },
    amber: { border: 'border-amber-500/30', title: 'text-amber-300', button: 'hover:bg-amber-900/30' },
    purple: { border: 'border-purple-500/30', title: 'text-purple-300', button: 'hover:bg-purple-900/30' },
  };
  const c = colorClasses[meta.color];

  return (
    <div className={cn('bg-slate-800/50 border rounded-lg p-4', c.border)}>
      <h2 className={cn('text-sm font-medium mb-3 flex items-center gap-2', c.title)}>
        <Icon className="w-4 h-4" />
        {meta.label}
      </h2>
      <p className="text-xs text-slate-500 mb-3">{meta.description}</p>

      <div className="space-y-3">
        {/* Provider */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Provider</label>
          <select
            value={config.provider}
            onChange={(e) => onProviderChange(e.target.value as ApiProvider)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              onClick={onToggleKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
              title={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Base URL (Optional)</label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Model */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Model</label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder="gpt-4o"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Test Button */}
        <button
          onClick={onTest}
          disabled={isTesting || !config.apiKey.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            c.button
          )}
        >
          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {isTesting ? 'Testing...' : `Test ${meta.label}`}
        </button>

        {/* Test Result */}
        {testResult && (
          <div className="space-y-2">
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
                testResult.success
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              )}
            >
              {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.warning && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-yellow-900/20 border-yellow-600/40 text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{testResult.warning}</span>
              </div>
            )}
            {testResult.requestBody && (
              <details className="bg-slate-900/50 border border-slate-700 rounded-lg" open>
                <summary className="px-3 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-300 select-none">
                  Request parameters
                </summary>
                <pre className="px-3 pb-3 text-[11px] text-slate-400 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(testResult.requestBody, null, 2)}
                </pre>
              </details>
            )}
            {testResult.changes && testResult.changes.length > 0 && (
              <details className="bg-amber-900/20 border border-amber-700/40 rounded-lg">
                <summary className="px-3 py-2 text-xs font-medium text-amber-400 cursor-pointer hover:text-amber-300 select-none">
                  Changes applied ({testResult.changes.length})
                </summary>
                <div className="px-3 pb-3 space-y-1">
                  {testResult.changes.map((change) => (
                    <div key={change.key} className="text-[11px] text-amber-400/80">
                      <span className="font-mono text-amber-300">{change.key}</span>{' '}
                      {change.to === '<removed>' ? (
                        <span>removed (was {JSON.stringify(change.from)})</span>
                      ) : change.from === '<added>' ? (
                        <span>added: {JSON.stringify(change.to)}</span>
                      ) : (
                        <span>
                          changed from {JSON.stringify(change.from)} → {JSON.stringify(change.to)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
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
