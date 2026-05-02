import { Preferences } from '@capacitor/preferences';
import type { ApiConfig, ApiProvider } from '../types';
import { fetchWithAdaptiveRetry, buildLlmBody } from './llmAdapter';

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

export async function callLLM(
  config: ApiConfig,
  prompt: string
): Promise<{ content: string; reasoning?: string }> {
  const url = config.baseUrl.trim()
    ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const body = buildLlmBody(config.model || 'gpt-4o', [
    { role: 'user', content: prompt },
  ], {
    maxTokens: 24000,
    enableThinking: true,
  });

  const { response } = await fetchWithAdaptiveRetry(url, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  }, body);

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  return {
    content: message?.content || '',
    reasoning: message?.reasoning_content,
  };
}

export interface StreamCallbacks {
  onReasoningChunk?: (chunk: string) => void;
  onContentChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export async function streamLLM(
  config: ApiConfig,
  prompt: string,
  callbacks: StreamCallbacks
): Promise<{ diagnostics: string[] }> {
  const url = config.baseUrl.trim()
    ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const diagnostics: string[] = [];
  let contentChunks = 0;
  let reasoningChunks = 0;
  let firstChunkLogged = false;
  let finishReason: string | null = null;
  let doneViaDone = false;

  const requestBody = buildLlmBody(
    config.model || 'gpt-4o',
    [{ role: 'user', content: prompt }],
    {
      stream: true,
      maxTokens: 24000,
      enableThinking: true,
    }
  );

  try {
    const { response } = await fetchWithAdaptiveRetry(url, {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }, requestBody);

    if (!response.body) {
      throw new Error('No response body');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          diagnostics.push('[DONE] signal received');
          callbacks.onDone?.();
          doneViaDone = true;
          return { diagnostics };
        }

        try {
          const chunk = JSON.parse(data);

          // Log first chunk structure to diagnose field names
          if (!firstChunkLogged) {
            const choice0 = chunk.choices?.[0];
            const deltaKeys = choice0?.delta ? Object.keys(choice0.delta) : [];
            diagnostics.push(`First chunk delta keys: [${deltaKeys.join(', ')}]`);
            firstChunkLogged = true;
          }

          const choice = chunk.choices?.[0];
          const delta = choice?.delta;
          if (!delta) continue;

          // Reasoning tokens: check multiple field names used by different providers
          const reasoning = delta.reasoning_content || delta.reasoning || delta.thinking;
          if (reasoning) {
            reasoningChunks++;
            if (reasoningChunks <= 3) {
              diagnostics.push(`REASONING #${reasoningChunks}: ${JSON.stringify(reasoning).slice(0, 200)}`);
            }
            callbacks.onReasoningChunk?.(reasoning);
          }

          // Content tokens: emit even empty strings (some APIs use them as keep-alives)
          if (delta.content !== undefined && delta.content !== null) {
            contentChunks++;
            if (contentChunks <= 3) {
              diagnostics.push(`CONTENT #${contentChunks}: ${JSON.stringify(delta.content).slice(0, 200)}`);
            }
            callbacks.onContentChunk?.(delta.content);
          }

          if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
          }

          // Only finish if there's no more content/reasoning in this chunk
          if (choice?.finish_reason && !reasoning && !delta.content) {
            callbacks.onDone?.();
            doneViaDone = true;
            return { diagnostics };
          }
        } catch {
          // ignore malformed JSON chunks
        }
      }
    }

    if (!doneViaDone) {
      callbacks.onDone?.();
    }
    diagnostics.push(`Stream ended. Content chunks: ${contentChunks}, Reasoning chunks: ${reasoningChunks}, finish_reason: ${finishReason ?? 'none'}`);
    return { diagnostics };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    diagnostics.push(`ERROR: ${error.message}`);
    callbacks.onError?.(error);
    throw error;
  } finally {
    reader?.cancel().catch(() => {});
  }
}

const BRAVE_API_KEY = 'brave_api_key';

export async function loadBraveApiKey(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: BRAVE_API_KEY });
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveBraveApiKey(key: string): Promise<void> {
  await Preferences.set({ key: BRAVE_API_KEY, value: key });
}

const TTS_API_KEY = 'tts_api_key';

export async function loadTtsApiKey(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: TTS_API_KEY });
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveTtsApiKey(key: string): Promise<void> {
  await Preferences.set({ key: TTS_API_KEY, value: key });
}

export async function testTtsApiKey(key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!key.trim()) {
      return { success: false, message: 'TTS API key is required' };
    }
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'onyx',
        input: 'Test.',
        response_format: 'mp3',
      }),
    });
    if (response.ok) {
      return { success: true, message: 'TTS connection successful!' };
    }
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || `HTTP ${response.status}`;
    return { success: false, message: `Connection failed: ${msg}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const TEST_MODE_KEY = 'test_mode_enabled';

export async function loadTestMode(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: TEST_MODE_KEY });
    return value === 'true';
  } catch {
    return false;
  }
}

export async function saveTestMode(enabled: boolean): Promise<void> {
  await Preferences.set({ key: TEST_MODE_KEY, value: String(enabled) });
}

export async function testBraveApiKey(key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!key.trim()) {
      return { success: false, message: 'Brave Search API key is required' };
    }
    const { CapacitorHttp } = await import('@capacitor/core');
    const response = await CapacitorHttp.request({
      url: 'https://api.search.brave.com/res/v1/web/search',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': key.trim(),
      },
      params: { q: 'test', count: '1' },
      responseType: 'json',
    });
    if (response.status >= 200 && response.status < 300) {
      return { success: true, message: 'Brave Search connection successful!' };
    }
    const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return { success: false, message: `Connection failed: HTTP ${response.status} ${errorText}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function getBodyChanges(original: Record<string, unknown>, final: Record<string, unknown>): Array<{ key: string; from: unknown; to: unknown }> {
  const changes: Array<{ key: string; from: unknown; to: unknown }> = [];
  for (const key of Object.keys(original)) {
    if (!(key in final)) {
      changes.push({ key, from: original[key], to: '<removed>' });
    } else if (JSON.stringify(original[key]) !== JSON.stringify(final[key])) {
      changes.push({ key, from: original[key], to: final[key] });
    }
  }
  for (const key of Object.keys(final)) {
    if (!(key in original)) {
      changes.push({ key, from: '<added>', to: final[key] });
    }
  }
  return changes;
}

export async function testApiConnection(config: ApiConfig): Promise<{
  success: boolean;
  message: string;
  requestBody?: Record<string, unknown>;
  changes?: Array<{ key: string; from: unknown; to: unknown }>;
  warning?: string;
}> {
  try {
    if (!config.apiKey.trim()) {
      return { success: false, message: 'API key is required' };
    }

    const url = config.baseUrl.trim()
      ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const body = buildLlmBody(
      config.model || 'gpt-4o',
      [{ role: 'user', content: 'Say "OK" and nothing else.' }],
      { maxTokens: 24000, enableThinking: true }
    );

    const { finalBody } = await fetchWithAdaptiveRetry(url, {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }, body);

    const changes = getBodyChanges(body, finalBody);

    const thinkingRemoved = changes.some(
      (c) =>
        (c.key === 'thinking' || c.key === 'reasoning_effort') &&
        c.to === '<removed>'
    );

    return {
      success: true,
      message: 'Connection successful!',
      requestBody: finalBody,
      changes: changes.length > 0 ? changes : undefined,
      warning: thinkingRemoved
        ? 'This model does not support thinking/reasoning. The app works best with thinking models (e.g. GPT-5.5, Claude 3.7 Sonnet, o3).'
        : undefined,
    };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
