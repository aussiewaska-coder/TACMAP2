// MapTiler Style JSON Proxy with Redis Caching
// Caches style JSON for 1 day, serves stale for 7 days
// Transforms tile URLs to use our tile proxy

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

interface StyleJSON {
  sources?: Record<string, any>;
  [key: string]: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { styleId, key } = req.query;

  if (!styleId || !key) {
    return res.status(400).json({ error: 'Missing styleId or key' });
  }

  const cacheKey = `maptiler:style:${styleId}`;
  const redisUrl = process.env.REDIS_URL;

  // ✅ ALWAYS try Redis first, store result in outer scope for fallback
  let cachedData: string | null = null;
  let cacheTimestamp: number | null = null;

  try {
    console.log('[MapTiler Style Cache] Checking Redis cache first...', { styleId, cacheKey });

    if (redisUrl) {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
      });

      try {
        await redis.connect();
        console.log('[MapTiler Style Cache] ✅ Redis connected');

        // Check cache
        const cached = await redis.get(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);

        if (cached && timestamp) {
          cachedData = cached;
          cacheTimestamp = parseInt(timestamp as string, 10);

          const age = Date.now() - cacheTimestamp;
          const isStale = age > 86400000; // 1 day
          const isExpired = age > 604800000; // 7 days

          console.log('[MapTiler Style Cache] Cache found:', {
            ageSeconds: Math.floor(age / 1000),
            isStale,
            isExpired
          });

          if (!isExpired) {
            console.log('[MapTiler Style Cache] ✅ CACHE HIT - Serving from Redis');

            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            res.setHeader('X-Cache', isStale ? 'STALE' : 'HIT');
            res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());

            // Background refresh if stale
            if (isStale) {
              console.log('[MapTiler Style Cache] Background refresh triggered');
              refreshStyle(styleId as string, key as string, redisUrl).catch(console.error);
            }

            redis.disconnect();
            return res.status(200).json(JSON.parse(cachedData));
          }
        }
      } catch (redisError) {
        console.error('[MapTiler Style Cache] ⚠️ Redis error:', redisError);
      } finally {
        redis.disconnect();
      }
    }

    // Fetch fresh style from MapTiler
    console.log('[MapTiler Style Cache] CACHE MISS - Fetching from MapTiler API');
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
    const response = await fetch(styleUrl);

    // ✅ If API fails, return cached data NO MATTER HOW OLD
    if (!response.ok) {
      console.warn(`[MapTiler Style Cache] ⚠️ API returned ${response.status}`);

      if (cachedData) {
        const age = cacheTimestamp ? Date.now() - cacheTimestamp : 0;
        const ageHours = Math.floor(age / (1000 * 60 * 60));
        console.log(`[MapTiler Style Cache] ✅ FALLBACK: Returning cached (${ageHours}h old)`);

        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('X-Cache', 'FALLBACK');
        res.setHeader('X-Cache-Age', ageHours.toString());

        return res.status(200).json(JSON.parse(cachedData));
      }

      throw new Error(`MapTiler API error: ${response.status}`);
    }

    const styleJson: StyleJSON = await response.json();

    // Transform tile URLs to use our proxy
    const transformedStyle = transformStyleToUseProxy(styleJson, req.headers.host || '');

    // Cache in Redis
    if (redisUrl) {
      console.log('[MapTiler Style Cache] Writing to Redis cache');
      const redis = new Redis(redisUrl, { lazyConnect: true });
      try {
        await redis.connect();
        await redis.set(cacheKey, JSON.stringify(transformedStyle), 'EX', 604800); // 7 days
        await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', 604800);
        console.log('[MapTiler Style Cache] ✅ Cached in Redis (TTL: 7 days)');
      } catch (err) {
        console.error('[MapTiler Style Cache] ❌ Failed to write to Redis:', err);
        console.warn('[MapTiler Style Cache] ⚠️ Style served but not cached - will fetch again next time');
      } finally {
        redis.disconnect();
      }
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-Cache', 'MISS');

    console.log('[MapTiler Style Cache] Response sent to client');
    return res.status(200).json(transformedStyle);

  } catch (error) {
    console.error('Style proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch style',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Transform style JSON to use our tile proxy instead of direct MapTiler URLs
 */
function transformStyleToUseProxy(style: StyleJSON, host: string): StyleJSON {
  const transformed = { ...style };

  if (transformed.sources) {
    for (const [sourceName, source] of Object.entries(transformed.sources)) {
      if (source.type === 'vector' && source.url) {
        // Transform TileJSON URL to use our proxy
        const tileJsonUrl = source.url.replace('maptiler://', 'https://api.maptiler.com/');
        transformed.sources[sourceName] = {
          ...source,
          url: `https://${host}/api/maptiler/tilejson?url=${encodeURIComponent(tileJsonUrl)}`
        };
      } else if (source.tiles && Array.isArray(source.tiles)) {
        // Transform tile URLs to use our proxy
        transformed.sources[sourceName] = {
          ...source,
          tiles: source.tiles.map((tileUrl: string) => {
            if (tileUrl.includes('api.maptiler.com')) {
              return `https://${host}/api/maptiler/tile?url=${encodeURIComponent(tileUrl)}`;
            }
            return tileUrl;
          })
        };
      }
    }
  }

  // ⚠️ DO NOT transform sprite/glyph URLs - they have template variables {id}, {range}, etc.
  // URL-encoding breaks the template syntax. Let them hit MapTiler directly.
  // If CORS blocked, the SDK falls back to built-in default style.
  // (tile URLs are already transformed above, which is what matters most)

  return transformed;
}

/**
 * Background refresh of style JSON
 */
async function refreshStyle(styleId: string, key: string, redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl, { lazyConnect: true });
  try {
    await redis.connect();

    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
    const response = await fetch(styleUrl);

    if (!response.ok) return;

    const styleJson = await response.json();
    const cacheKey = `maptiler:style:${styleId}`;

    await redis.set(cacheKey, JSON.stringify(styleJson), 'EX', 604800);
    await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', 604800);
    console.log('[MapTiler Style Cache] Background refresh completed');
  } catch (error) {
    console.error('Background style refresh failed:', error);
  } finally {
    redis.disconnect();
  }
}
