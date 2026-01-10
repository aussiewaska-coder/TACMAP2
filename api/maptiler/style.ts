// MapTiler Style JSON Proxy with Redis Caching
// Caches style JSON for 1 day, serves stale for 7 days
// Transforms tile URLs to use our tile proxy

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/kv';

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
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });

      // Check cache
      const cached = await redis.get(cacheKey);
      const timestamp = await redis.get(`${cacheKey}:timestamp`);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp as string, 10);
        const isStale = age > 86400000; // 1 day in ms
        const isExpired = age > 604800000; // 7 days in ms

        if (!isExpired) {
          // Set aggressive cache headers
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
          res.setHeader('X-Cache', isStale ? 'STALE' : 'HIT');
          res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());

          // Background refresh if stale
          if (isStale) {
            refreshStyle(styleId as string, key as string, redis).catch(console.error);
          }

          return res.status(200).json(JSON.parse(cached as string));
        }
      }
    }

    // Fetch fresh style from MapTiler
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
    const response = await fetch(styleUrl);

    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.status}`);
    }

    const styleJson: StyleJSON = await response.json();

    // Transform tile URLs to use our proxy
    const transformedStyle = transformStyleToUseProxy(styleJson, req.headers.host || '');

    // Cache in Redis
    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });
      await redis.set(cacheKey, JSON.stringify(transformedStyle));
      await redis.set(`${cacheKey}:timestamp`, Date.now().toString());
      await redis.expire(cacheKey, 604800); // 7 days
      await redis.expire(`${cacheKey}:timestamp`, 604800);
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-Cache', 'MISS');

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
async function refreshStyle(styleId: string, key: string, redis: any): Promise<void> {
  try {
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
    const response = await fetch(styleUrl);

    if (!response.ok) return;

    const styleJson = await response.json();
    const cacheKey = `maptiler:style:${styleId}`;

    await redis.set(cacheKey, JSON.stringify(styleJson));
    await redis.set(`${cacheKey}:timestamp`, Date.now().toString());
    await redis.expire(cacheKey, 604800);
    await redis.expire(`${cacheKey}:timestamp`, 604800);
  } catch (error) {
    console.error('Background style refresh failed:', error);
  }
}
