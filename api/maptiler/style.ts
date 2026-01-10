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

  try {
    // Try Redis cache first
    const redisUrl = process.env.REDIS_URL;

    console.log('[MapTiler Style Cache] Redis config:', {
      hasRedisUrl: !!redisUrl,
      styleId,
      cacheKey
    });

    if (redisUrl) {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
      });
      console.log('[MapTiler Style Cache] Redis client created');

      try {
        // Check cache
        const cached = await redis.get(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);

        console.log('[MapTiler Style Cache] Cache lookup:', {
          hasCached: !!cached,
          hasTimestamp: !!timestamp
        });

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          const isStale = age > 86400000; // 1 day in ms
          const isExpired = age > 604800000; // 7 days in ms

          console.log('[MapTiler Style Cache] Cache status:', {
            ageSeconds: Math.floor(age / 1000),
            isStale,
            isExpired
          });

          if (!isExpired) {
            // Set aggressive cache headers
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            res.setHeader('X-Cache', isStale ? 'STALE' : 'HIT');
            res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());

            console.log('[MapTiler Style Cache] ✅ CACHE HIT - Serving from Redis');

            // Background refresh if stale
            if (isStale) {
              console.log('[MapTiler Style Cache] Triggering background refresh (stale)');
              refreshStyle(styleId as string, key as string, redisUrl).catch(console.error);
            }

            await redis.quit();
            return res.status(200).json(JSON.parse(cached));
          }
        }
      } finally {
        await redis.quit();
      }
    } else {
      console.warn('[MapTiler Style Cache] ⚠️ Redis not configured - REDIS_URL missing');
    }

    // Fetch fresh style from MapTiler
    console.log('[MapTiler Style Cache] ❌ CACHE MISS - Fetching from MapTiler API');
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
    const response = await fetch(styleUrl);

    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.status}`);
    }

    const styleJson: StyleJSON = await response.json();

    // Transform tile URLs to use our proxy
    const transformedStyle = transformStyleToUseProxy(styleJson, req.headers.host || '');

    // Cache in Redis
    if (redisUrl) {
      console.log('[MapTiler Style Cache] Writing to Redis cache');
      const redis = new Redis(redisUrl);
      try {
        await redis.set(cacheKey, JSON.stringify(transformedStyle), 'EX', 604800); // 7 days
        await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', 604800);
        console.log('[MapTiler Style Cache] ✅ Cached in Redis (TTL: 7 days)');
      } finally {
        await redis.quit();
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

  // Transform sprite URLs
  if (transformed.sprite && typeof transformed.sprite === 'string') {
    if (transformed.sprite.includes('api.maptiler.com')) {
      transformed.sprite = `https://${host}/api/maptiler/sprite?url=${encodeURIComponent(transformed.sprite)}`;
    }
  }

  // Transform glyphs URLs
  if (transformed.glyphs && typeof transformed.glyphs === 'string') {
    if (transformed.glyphs.includes('api.maptiler.com')) {
      transformed.glyphs = `https://${host}/api/maptiler/glyph?url=${encodeURIComponent(transformed.glyphs)}`;
    }
  }

  return transformed;
}

/**
 * Background refresh of style JSON
 */
async function refreshStyle(styleId: string, key: string, redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl);
  try {
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
    await redis.quit();
  }
}
