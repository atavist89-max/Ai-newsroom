/**
 * Cloudflare Worker: Brave Search CORS Proxy
 *
 * Deploy this to Cloudflare Workers (free tier):
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Paste this code
 * 4. Deploy
 * 5. Copy the Worker URL and paste it into the AI Newsroom config
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    // Only allow Brave Search API URLs
    if (!targetUrl.startsWith('https://api.search.brave.com/')) {
      return new Response('Only Brave Search API URLs are allowed', { status: 403 });
    }

    try {
      const modified = new Request(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': request.headers.get('Accept') || 'application/json',
          'X-Subscription-Token': request.headers.get('X-Subscription-Token') || '',
        },
      });

      const response = await fetch(modified);

      const corsHeaders = new Headers(response.headers);
      corsHeaders.set('Access-Control-Allow-Origin', '*');
      corsHeaders.set('Access-Control-Expose-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 502 });
    }
  },
};
