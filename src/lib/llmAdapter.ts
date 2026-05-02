/**
 * Model-independent LLM API adapter.
 *
 * Problem: every provider/model has slightly different parameter names and
 * restrictions. Hard-coding per-model quirks is a maintenance nightmare.
 *
 * Solution: send a reasonable default body, and if the API rejects a
 * parameter, parse the error message, fix the body automatically, and retry.
 * This is completely provider-agnostic and self-healing.
 */

export interface LlmRequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  [key: string]: unknown;
}

interface ParameterFix {
  pattern: RegExp;
  fix: (body: Record<string, unknown>) => Record<string, unknown> | null;
}

const KNOWN_FIXES: ParameterFix[] = [
  // OpenAI newer models (o1, o3, gpt-5.x) reject max_tokens
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?max_tokens['"]?(?:[\s\S]*?Use ['"]?max_completion_tokens['"]? instead)?/i,
    fix: (body) => {
      if (!('max_tokens' in body)) return null;
      const { max_tokens, ...rest } = body;
      return { ...rest, max_completion_tokens: max_tokens };
    },
  },
  // Some older models or non-OpenAI providers reject max_completion_tokens
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?max_completion_tokens['"]?(?:[\s\S]*?Use ['"]?max_tokens['"]? instead)?/i,
    fix: (body) => {
      if (!('max_completion_tokens' in body)) return null;
      const { max_completion_tokens, ...rest } = body;
      return { ...rest, max_tokens: max_completion_tokens };
    },
  },
  // Reasoning models often reject temperature
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?temperature['"]?/i,
    fix: (body) => {
      if (!('temperature' in body)) return null;
      const { temperature, ...rest } = body;
      return rest;
    },
  },
  // Reasoning models often reject top_p
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?top_p['"]?/i,
    fix: (body) => {
      if (!('top_p' in body)) return null;
      const { top_p, ...rest } = body;
      return rest;
    },
  },
  // Some providers reject thinking/thinking_type
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?thinking['"]?/i,
    fix: (body) => {
      if (!('thinking' in body)) return null;
      const { thinking, ...rest } = body;
      return rest;
    },
  },
  // Frequency penalty / presence penalty
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?(?:frequency_penalty|presence_penalty)['"]?/i,
    fix: (body) => {
      const { frequency_penalty, presence_penalty, ...rest } = body;
      return rest;
    },
  },
  // Some providers (e.g. Ollama) don't support reasoning_effort
  {
    pattern: /(?:Unsupported|Unknown|Unrecognized)\s+(?:parameter|request argument(?:\s+supplied)?):?\s*['"]?reasoning_effort['"]?/i,
    fix: (body) => {
      if (!('reasoning_effort' in body)) return null;
      const { reasoning_effort, ...rest } = body;
      return rest;
    },
  },
];

/**
 * Try to fix a parameter error by applying known fixes.
 * Returns the fixed body, or null if no fix applied.
 */
function tryFixParameterError(
  errorMessage: string,
  body: Record<string, unknown>
): Record<string, unknown> | null {
  for (const { pattern, fix } of KNOWN_FIXES) {
    if (pattern.test(errorMessage)) {
      const fixed = fix(body);
      if (fixed) {
        console.log(`[llmAdapter] Applied fix for: ${errorMessage.slice(0, 120)}`);
        return fixed;
      }
    }
  }
  return null;
}

/**
 * Fetch with adaptive retry. If the API rejects a parameter, automatically
 * fixes the request body and retries (up to maxRetries times).
 */
export async function fetchWithAdaptiveRetry(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  maxRetries = 2
): Promise<{ response: Response; finalBody: Record<string, unknown> }> {
  let currentBody = { ...body };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(currentBody),
    });

    if (response.ok) {
      return { response, finalBody: currentBody };
    }

    // Only attempt fixes for 4xx errors (bad request / unsupported parameter)
    if (response.status < 400 || response.status >= 500) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage: string = errorData.error?.message || `HTTP ${response.status}`;

    const fixedBody = tryFixParameterError(errorMessage, currentBody);
    if (fixedBody) {
      currentBody = fixedBody;
      continue; // Retry with fixed body
    }

    // Not a fixable parameter error
    throw new Error(errorMessage);
  }

  throw new Error('Max adaptive retries exceeded');
}

/**
 * Build a model-agnostic request body.
 * Uses the most modern / widely-supported parameter names by default.
 * The adaptive retry will fix them if the model doesn't support them.
 */
export function buildLlmBody(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    stream?: boolean;
    maxTokens?: number;
    enableThinking?: boolean;
  } = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages,
  };

  if (options.stream) {
    body.stream = true;
  }

  // Default to max_completion_tokens (newer OpenAI standard).
  // If the model doesn't support it, the adaptive retry will rename to max_tokens.
  if (options.maxTokens && options.maxTokens > 0) {
    body.max_completion_tokens = options.maxTokens;
  }

  // Thinking / reasoning extensions.
  // If the model doesn't support it, the adaptive retry will remove it.
  if (options.enableThinking) {
    body.thinking = { type: 'enabled' };
  }

  return body;
}
