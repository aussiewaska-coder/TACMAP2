/**
 * MapTiler Proxy with Redis Caching & Rate Limit Fallback
 *
 * This endpoint:
 * 1. Proxies MapTiler requests (styles, sprites, fonts, etc)
 * 2. Caches responses in Redis with 24-hour TTL
 * 3. Returns cached data on 429 (rate limit) errors
 * 4. Allows graceful degradation when API rate limit is hit
 */

import { Request, Response } from 'express';
import { getRedisClient } from '../lib/redis';

// Use native fetch Response type (not Express Response)
type FetchResponse = Awaited<ReturnType<typeof fetch>>;

interface ProxyOptions {
  ttlSeconds: number; // How long to cache (24 hours = 86400)
  staleWhileRevalidateSeconds: number; // How long to serve stale data (7 days = 604800)
}

const DEFAULT_OPTIONS: ProxyOptions = {
  ttlSeconds: 24 * 60 * 60, // 24 hours
  staleWhileRevalidateSeconds: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Proxy a MapTiler request with caching
 */
export async function handleMaptilerProxy(req: Request, res: Response) {
  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'Missing path parameter' });
      return;
    }

    // Whitelist allowed paths (security)
    const allowedPrefixes = [
      '/maps/',           // Style documents
      '/sprites/',        // Sprite sheets
      '/fonts/',          // Font data
      '/data/',           // Raster/vector data
      '/tiles/',          // Direct tile requests
      '/geocoding/',      // Geocoding (if enabled)
    ];

    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
      res.status(403).json({ error: 'Forbidden: Invalid path' });
      return;
    }

    const apiKey = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'MAPTILER_API_KEY not configured' });
      return;
    }

    // Build full URL to MapTiler
    const fullUrl = `https://api.maptiler.com${path}?key=${apiKey}`;

    // Create cache key from URL (normalized, without timestamps)
    const cacheKey = `maptiler:${Buffer.from(path).toString('hex')}`;

    // Try to get Redis client
    let redis = null;
    try {
      redis = await getRedisClient();
    } catch (e) {
      console.warn('[MapTiler Proxy] Failed to get Redis client:', e);
    }

    // Check cache first
    let cachedData: Buffer | null = null;
    let cacheTimestamp: number | null = null;
    let fromCache = false;

    if (redis) {
      try {
        // ioredis getBuffer returns Buffer directly
        const cached = await (redis as any).getBuffer(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);

        if (cached && timestamp) {
          cachedData = cached;
          cacheTimestamp = parseInt(timestamp as string, 10);
          fromCache = true;
          console.log(`[MapTiler Proxy] Cache HIT for ${path}`);
        }
      } catch (e) {
        console.warn('[MapTiler Proxy] Cache read error:', e);
      }
    }

    // Fetch fresh data from MapTiler
    let fetchResponse: FetchResponse | null = null;
    let fetchError: Error | null = null;

    try {
      fetchResponse = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'TACMAP2-Server/1.0',
        },
      });
    } catch (e) {
      fetchError = e instanceof Error ? e : new Error('Fetch failed');
      console.warn(`[MapTiler Proxy] Fetch error for ${path}:`, fetchError);
    }

    // Handle successful response
    if (fetchResponse && fetchResponse.ok) {
      const buffer = await fetchResponse.arrayBuffer();
      const data = Buffer.from(buffer);

      // Cache the response
      if (redis) {
        try {
          // ioredis set/setex supports Buffer values
          await (redis as any).set(cacheKey, data, 'EX', DEFAULT_OPTIONS.staleWhileRevalidateSeconds);
          await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', DEFAULT_OPTIONS.staleWhileRevalidateSeconds);
          console.log(`[MapTiler Proxy] Cached response for ${path}`);
        } catch (e) {
          console.warn('[MapTiler Proxy] Cache write error:', e);
        }
      }

      // Return fresh data
      const contentType = fetchResponse.headers.get('content-type');
      const cacheControl = fetchResponse.headers.get('cache-control');

      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('X-Cache', 'HIT-FRESH');

      // Allow browser caching for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.send(data);
      return;
    }

    // Handle 429 (rate limit) or other errors - try to return cached data
    if ((fetchResponse?.status === 429) || fetchError) {
      if (cachedData) {
        const age = cacheTimestamp ? Date.now() - cacheTimestamp : 0;
        const ageHours = Math.floor(age / (1000 * 60 * 60));

        console.log(
          `[MapTiler Proxy] Returning cached data (${ageHours}h old) for ${path}` +
          (fetchResponse?.status === 429 ? ' [Rate Limited]' : ' [Fetch Error]')
        );

        const contentType = fetchResponse?.headers.get('content-type') || 'application/json';
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Cache', 'HIT-STALE');
        res.setHeader('X-Cache-Age-Hours', ageHours.toString());

        // Browser should not cache stale data
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Warning', `199 - "MapTiler Cached Response (${ageHours}h old)"`);

        res.status(200).send(cachedData);
        return;
      }

      // No cached data available
      const status = fetchResponse?.status || 500;
      const statusText = fetchResponse?.statusText || 'Unknown Error';

      console.error(`[MapTiler Proxy] No cache available, upstream returned: ${status} ${statusText}`);
      res.status(status).json({
        error: `MapTiler ${statusText}`,
        message: 'No cached response available',
        path,
      });
      return;
    }

    // Handle other non-ok responses (4xx, 5xx)
    if (fetchResponse && !fetchResponse.ok) {
      console.error(`[MapTiler Proxy] Upstream error: ${fetchResponse.status} ${fetchResponse.statusText} for ${path}`);

      // If we have cached data, return it (better than nothing)
      if (cachedData) {
        const age = cacheTimestamp ? Date.now() - cacheTimestamp : 0;
        const ageHours = Math.floor(age / (1000 * 60 * 60));

        console.log(`[MapTiler Proxy] Returning stale cache (${ageHours}h old) due to upstream error`);

        const contentType = fetchResponse.headers.get('content-type') || 'application/json';
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Cache', 'HIT-STALE');
        res.setHeader('X-Cache-Age-Hours', ageHours.toString());
        res.setHeader('Cache-Control', 'no-cache');

        res.status(200).send(cachedData);
        return;
      }

      // No cache, return upstream error
      const errorBody = await fetchResponse.text();
      res.status(fetchResponse.status).send(errorBody);
      return;
    }

  } catch (error) {
    console.error('[MapTiler Proxy] Unhandled error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
