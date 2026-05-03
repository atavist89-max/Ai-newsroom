import { CapacitorHttp } from '@capacitor/core';
import { loadBraveApiKey } from './apiConfig';

const BRAVE_BASE_URL = 'https://api.search.brave.com/res/v1/web/search';

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  source: string;
  sourceUrl: string;
  url: string;
  publishedAt: string;
  language: string;
  country: string;
}

interface BraveWebResult {
  title: string;
  description: string;
  url: string;
  age?: string;
  page_age?: string;
  language?: string;
  meta_url?: {
    hostname?: string;
    netloc?: string;
  };
}

interface BraveResponse {
  query?: {
    original?: string;
  };
  web?: {
    results?: BraveWebResult[];
  };
}

// Brave Search API only supports these 37 country codes for the `country` parameter.
// For countries outside this list, we omit the param and rely on query terms.
export const BRAVE_SUPPORTED_COUNTRIES = new Set([
  'AR', 'AU', 'AT', 'BE', 'BR', 'CA', 'CL', 'DK', 'FI', 'FR', 'DE', 'GR', 'HK',
  'IN', 'ID', 'IT', 'JP', 'KR', 'MY', 'MX', 'NL', 'NZ', 'NO', 'CN', 'PL', 'PT',
  'PH', 'RU', 'SA', 'ZA', 'ES', 'SE', 'CH', 'TW', 'TR', 'GB', 'US',
]);

function normalizeArticle(raw: BraveWebResult, countryCode: string): NewsArticle {
  const hostname = raw.meta_url?.hostname || raw.meta_url?.netloc || new URL(raw.url).hostname;
  const publishedAt = raw.page_age || raw.age || '';
  return {
    title: raw.title || '',
    description: raw.description || '',
    content: raw.description || '',
    source: hostname,
    sourceUrl: `https://${hostname}`,
    url: raw.url || '',
    publishedAt,
    language: raw.language || 'en',
    country: countryCode,
  };
}

async function fetchBraveSearch(params: {
  query: string;
  count?: number;
  freshness?: string;
  searchLang?: string;
  country?: string;
  offset?: number;
}): Promise<NewsArticle[]> {
  const apiKey = await loadBraveApiKey();
  if (!apiKey.trim()) {
    throw new Error('Brave Search API key is missing. Go to Configure API to add one.');
  }

  const queryParams: Record<string, string> = {
    q: params.query,
    count: String(Math.min(params.count || 10, 20)),
    safesearch: 'off',
  };
  if (params.freshness) queryParams.freshness = params.freshness;
  if (params.searchLang) queryParams.search_lang = params.searchLang;
  if (params.country && BRAVE_SUPPORTED_COUNTRIES.has(params.country.toUpperCase())) {
    queryParams.country = params.country.toLowerCase();
  }
  if (params.offset !== undefined && params.offset > 0) {
    queryParams.offset = String(params.offset);
  }

  const response = await CapacitorHttp.request({
    url: BRAVE_BASE_URL,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey.trim(),
    },
    params: queryParams,
    responseType: 'json',
  });

  if (response.status < 200 || response.status >= 300) {
    const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    throw new Error(`Brave Search error: HTTP ${response.status} ${errorText}`);
  }

  const data = response.data as BraveResponse;
  const results = data.web?.results ?? [];
  return results.map((r) => normalizeArticle(r, params.country || 'XX'));
}

export interface SearchTopicParams {
  countryCode: string;
  countryName: string;
  topicQuery: string;
  freshness: string;
  pageSize?: number;
  offset?: number;
}

/**
 * Search Brave for a specific topic in a country.
 * Falls back to general news if insufficient results.
 */
export async function searchTopicLocal(params: SearchTopicParams): Promise<NewsArticle[]> {
  const { countryCode, countryName, topicQuery, freshness, pageSize = 10, offset } = params;

  // Attempt 1: topic + country name
  const attempt1 = await fetchBraveSearch({
    query: `${topicQuery} ${countryName} news`,
    count: pageSize,
    freshness,
    country: countryCode,
    offset,
  });
  if (attempt1.length >= 5) return attempt1;

  // Attempt 2: broader search with just country + topic
  const attempt2 = await fetchBraveSearch({
    query: `${topicQuery} ${countryName}`,
    count: pageSize,
    freshness,
    country: countryCode,
    offset,
  });

  const combined = [...attempt1];
  const seenUrls = new Set(attempt1.map((a) => a.url));
  for (const article of attempt2) {
    if (!seenUrls.has(article.url)) {
      seenUrls.add(article.url);
      combined.push(article);
    }
  }
  if (combined.length >= 5) return combined;

  // Fallback: general news for this country
  const fallback = await fetchBraveSearch({
    query: `${countryName} news`,
    count: pageSize,
    freshness,
    country: countryCode,
    offset,
  });
  for (const article of fallback) {
    if (!seenUrls.has(article.url)) {
      seenUrls.add(article.url);
      combined.push(article);
    }
  }

  return combined;
}

/**
 * Search Brave for a specific topic at continent level.
 */
export async function searchTopicContinent(params: {
  continentName: string;
  topicQuery: string;
  freshness: string;
  pageSize?: number;
  offset?: number;
}): Promise<NewsArticle[]> {
  const { continentName, topicQuery, freshness, pageSize = 10, offset } = params;

  const results = await fetchBraveSearch({
    query: `${topicQuery} ${continentName} news`,
    count: pageSize,
    freshness,
    searchLang: 'en',
    offset,
  });

  if (results.length >= 5) return results;

  // Fallback: general continent news
  const fallback = await fetchBraveSearch({
    query: `${continentName} news`,
    count: pageSize,
    freshness,
    searchLang: 'en',
    offset,
  });

  const seenUrls = new Set(results.map((a) => a.url));
  const combined = [...results];
  for (const article of fallback) {
    if (!seenUrls.has(article.url)) {
      seenUrls.add(article.url);
      combined.push(article);
    }
  }

  return combined;
}
