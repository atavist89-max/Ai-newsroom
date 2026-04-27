import { Preferences } from '@capacitor/preferences';
import type { ApiConfig, ApiProvider } from '../types';

const API_CONFIG_KEY = 'api_config';

export const defaultApiConfig: ApiConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o',
};

export async function loadApiConfig(): Promise<ApiConfig> {
  try {
    const { value } = await Preferences.get({ key: API_CONFIG_KEY });
    if (value) {
      const parsed = JSON.parse(value) as Partial<ApiConfig>;
      return { ...defaultApiConfig, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...defaultApiConfig };
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  await Preferences.set({
    key: API_CONFIG_KEY,
    value: JSON.stringify(config),
  });
}

export const providerOptions: { value: ApiProvider; label: string; defaultModel: string; defaultBaseUrl: string }[] = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o', defaultBaseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', defaultBaseUrl: 'https://api.anthropic.com/v1' },
  { value: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-pro', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'openrouter', label: 'OpenRouter', defaultModel: 'openai/gpt-4o', defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  { value: 'custom', label: 'Custom / Local', defaultModel: '', defaultBaseUrl: '' },
];

export async function testApiConnection(config: ApiConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey.trim()) {
      return { success: false, message: 'API key is required' };
    }

    const url = config.baseUrl.trim()
      ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Connection successful!' };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    return { success: false, message: `Connection failed: ${errorMessage}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
