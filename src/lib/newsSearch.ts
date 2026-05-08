import { loadBraveApiKey, loadBraveProxyUrl } from './apiConfig';
import { getCountryByCode, continents } from '../data/countries';


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
  goggles?: string;
}): Promise<NewsArticle[]> {
  const apiKey = await loadBraveApiKey();
  if (!apiKey.trim()) {
    throw new Error('Brave Search API key is missing. Go to Configure API to add one.');
  }

  const proxyUrl = await loadBraveProxyUrl();

  const braveUrl = new URL(BRAVE_BASE_URL);
  braveUrl.searchParams.set('q', params.query);
  braveUrl.searchParams.set('count', String(Math.min(params.count || 10, 20)));
  braveUrl.searchParams.set('safesearch', 'off');
  if (params.freshness) braveUrl.searchParams.set('freshness', params.freshness);
  if (params.searchLang) braveUrl.searchParams.set('search_lang', params.searchLang);
  if (params.country && BRAVE_SUPPORTED_COUNTRIES.has(params.country.toUpperCase())) {
    braveUrl.searchParams.set('country', params.country.toLowerCase());
  }
  if (params.offset !== undefined && params.offset > 0) {
    braveUrl.searchParams.set('offset', String(params.offset));
  }
  if (params.goggles) {
    braveUrl.searchParams.set('goggles', params.goggles);
  }

  const targetUrl = proxyUrl.trim()
    ? `${proxyUrl.trim()}?url=${encodeURIComponent(braveUrl.toString())}`
    : braveUrl.toString();

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey.trim(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brave Search error: HTTP ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as BraveResponse;
  const results = data.web?.results ?? [];
  return results.map((r) => normalizeArticle(r, params.country || 'XX'));
}

// ============================================================================
// Goggles helpers
// ============================================================================

/**
 * Build a Brave Goggles string from a country's trusted news source domains.
 * Format: `$boost=5,site=domain1|$boost=5,site=domain2|...`
 * Only includes sources that have a mapped domain.
 */
export function buildCountryGoggles(countryCode: string): string | undefined {
  const country = getCountryByCode(countryCode);
  if (!country) return undefined;
  const domains = country.newsSources
    .map((s) => typeof s === 'string' ? undefined : s.domain)
    .filter((d): d is string => !!d);
  if (domains.length === 0) return undefined;
  return domains.map((d) => `$boost=5,site=${d}`).join('|');
}

/**
 * Build a Brave Goggles string from a continent's trusted news source domains.
 * Format: `$boost=3,site=domain1|$boost=3,site=domain2|...`
 * Only includes sources that have a mapped domain.
 */
export function buildContinentGoggles(continentCode: string): string | undefined {
  const continent = (continents as Record<string, typeof continents[keyof typeof continents]>)[continentCode];
  if (!continent) return undefined;
  const domains = continent.newsSources
    .map((s) => s.domain)
    .filter((d): d is string => !!d);
  if (domains.length === 0) return undefined;
  return domains.map((d) => `$boost=3,site=${d}`).join('|');
}

// ============================================================================
// Exported search functions
// ============================================================================

export interface SearchTopicParams {
  countryCode: string;
  countryName: string;
  topicQuery: string;
  freshness: string;
  pageSize?: number;
  offset?: number;
  goggles?: string;
}

/**
 * Search Brave for a specific topic in a country.
 * Falls back to general news if insufficient results.
 * If goggles is provided and returns zero results, retries without goggles.
 */
export async function searchTopicLocal(params: SearchTopicParams): Promise<NewsArticle[]> {
  const { countryCode, countryName, topicQuery, freshness, pageSize = 10, offset, goggles } = params;

  async function tryWithGoggles(g: string | undefined): Promise<NewsArticle[]> {
    // Attempt 1: topic + country name
    const attempt1 = await fetchBraveSearch({
      query: `${topicQuery} ${countryName} news`,
      count: pageSize,
      freshness,
      country: countryCode,
      offset,
      goggles: g,
    });
    if (attempt1.length >= 5) return attempt1;

    // Attempt 2: broader search with just country + topic
    const attempt2 = await fetchBraveSearch({
      query: `${topicQuery} ${countryName}`,
      count: pageSize,
      freshness,
      country: countryCode,
      offset,
      goggles: g,
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

    // Fallback: general news for this country (never uses goggles)
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

  if (goggles) {
    const results = await tryWithGoggles(goggles);
    if (results.length > 0) return results;
    // Fallback to no-goggles search
    return tryWithGoggles(undefined);
  }

  return tryWithGoggles(undefined);
}

/**
 * Search Brave for a specific topic at continent level.
 * If goggles is provided and returns zero results, retries without goggles.
 */
export async function searchTopicContinent(params: {
  continentName: string;
  topicQuery: string;
  freshness: string;
  pageSize?: number;
  offset?: number;
  goggles?: string;
}): Promise<NewsArticle[]> {
  const { continentName, topicQuery, freshness, pageSize = 10, offset, goggles } = params;

  async function tryWithGoggles(g: string | undefined): Promise<NewsArticle[]> {
    const results = await fetchBraveSearch({
      query: `${topicQuery} ${continentName} news`,
      count: pageSize,
      freshness,
      searchLang: 'en',
      offset,
      goggles: g,
    });

    if (results.length >= 5) return results;

    // Fallback: general continent news (never uses goggles)
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

  if (goggles) {
    const results = await tryWithGoggles(goggles);
    if (results.length > 0) return results;
    // Fallback to no-goggles search
    return tryWithGoggles(undefined);
  }

  return tryWithGoggles(undefined);
}
