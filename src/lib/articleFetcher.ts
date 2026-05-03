/**
 * Three-tier article fetcher with fallback chain.
 *
 * Tier 1: Jina AI Reader (primary)
 * Tier 2: Direct fetch with browser headers + HTML stripping
 * Tier 3: Brave description fallback
 */

export interface FetchedArticle {
  url: string;
  title: string;
  source: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
}

const JINA_TIMEOUT_MS = 8000;
const DIRECT_TIMEOUT_MS = 8000;
const MIN_WORDS_JINA = 80;
const MIN_WORDS_DIRECT = 80;
const MIN_WORDS_DESCRIPTION = 20;

/**
 * Fetch article text using the three-tier fallback chain.
 */
export async function fetchArticle(
  url: string,
  title: string,
  braveDescription: string
): Promise<FetchedArticle> {
  const source = extractHostname(url);

  // Tier 1: Jina AI Reader
  const jinaResult = await tryJinaFetch(url);
  if (jinaResult.ok) {
    return {
      url,
      title,
      source,
      text: jinaResult.text,
      wordCount: countWords(jinaResult.text),
      tier: 1,
    };
  }

  // Tier 2: Direct fetch with browser headers
  const directResult = await tryDirectFetch(url);
  if (directResult.ok) {
    return {
      url,
      title,
      source,
      text: directResult.text,
      wordCount: countWords(directResult.text),
      tier: 2,
    };
  }

  // Tier 3: Brave description fallback
  const descWords = countWords(braveDescription);
  if (descWords >= MIN_WORDS_DESCRIPTION) {
    return {
      url,
      title,
      source,
      text: braveDescription,
      wordCount: descWords,
      tier: 3,
    };
  }

  // Total failure — return what we have from the best attempt
  const bestText = jinaResult.text || directResult.text || braveDescription;
  return {
    url,
    title,
    source,
    text: bestText,
    wordCount: countWords(bestText),
    tier: 3,
  };
}

/**
 * Tier 1: Jina AI Reader
 */
async function tryJinaFetch(url: string): Promise<{ ok: boolean; text: string }> {
  const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/plain' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, text: '' };
    }

    const text = await res.text();
    const wordCount = countWords(text);
    const lower = text.toLowerCase();

    if (wordCount < MIN_WORDS_JINA) {
      return { ok: false, text };
    }
    if (
      lower.includes('subscribe to continue') ||
      lower.includes('log in to read') ||
      lower.includes('sign up to read') ||
      lower.includes('please enable javascript') ||
      lower.includes('cookie policy') ||
      lower.includes('terms of service') ||
      lower.includes('access denied')
    ) {
      return { ok: false, text };
    }

    return { ok: true, text };
  } catch {
    return { ok: false, text: '' };
  }
}

/**
 * Tier 2: Direct fetch with browser headers
 */
async function tryDirectFetch(url: string): Promise<{ ok: boolean; text: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, text: '' };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { ok: false, text: '' };
    }

    const html = await res.text();
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const wordCount = countWords(text);
    const lower = text.toLowerCase();

    if (wordCount < MIN_WORDS_DIRECT) {
      return { ok: false, text };
    }
    if (
      lower.includes('subscribe to continue') ||
      lower.includes('log in to read') ||
      lower.includes('sign up to read') ||
      lower.includes('access denied')
    ) {
      return { ok: false, text };
    }

    return { ok: true, text };
  } catch {
    return { ok: false, text: '' };
  }
}

/**
 * Extract hostname from URL
 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Smart truncate: break at sentence boundary, max N words.
 */
export function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  let cutIndex = maxWords;
  // Try to find a sentence boundary within the last 20 words
  for (let i = maxWords; i > maxWords - 20 && i > 0; i--) {
    if (/[.!?]$/.test(words[i - 1])) {
      cutIndex = i;
      break;
    }
  }
  return words.slice(0, cutIndex).join(' ');
}
