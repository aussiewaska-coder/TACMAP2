// MapTiler Tile Proxy with Redis Caching
// Caches tiles for 7 days, serves stale for 30 days
// Reduces MapTiler API requests by 95%+

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing tile URL' });
  }

  // Extract tile coordinates for cache key
  const tileKey = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '');
  const cacheKey = `maptiler:tile:${tileKey}`;

  try {
    // Try Redis cache first
    const redisUrl = process.env.REDIS_URL;

    console.log('[MapTiler Tile Cache] Request:', {
      hasRedis: !!redisUrl,
      cacheKey: tileKey.substring(0, 100) + '...'
    });

    if (redisUrl) {
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
      });

      try {
        await redis.connect();

        // Check cache - store as base64 string
        const cached = await redis.get(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);
        const contentType = await redis.get(`${cacheKey}:type`);

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          const isStale = age > 604800000; // 7 days
          const isExpired = age > 2592000000; // 30 days

          if (!isExpired) {
            // Serve from cache
            const buffer = Buffer.from(cached, 'base64');

            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
            res.setHeader('X-Cache', isStale ? 'STALE' : 'HIT');
            res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());

            console.log('[MapTiler Tile Cache] ✅ CACHE HIT', {
              ageSeconds: Math.floor(age / 1000),
              sizeBytes: buffer.length,
              isStale
            });

            // Background refresh if stale
            if (isStale) {
              console.log('[MapTiler Tile Cache] Background refresh triggered (stale)');
              refreshTile(url, cacheKey, redisUrl).catch(console.error);
            }

            redis.disconnect();
            return res.status(200).send(buffer);
          }
        }
      } catch (redisError) {
        console.error('[MapTiler Tile Cache] ❌ Redis connection failed:', redisError);
        console.warn('[MapTiler Tile Cache] ⚠️ Falling back to direct MapTiler API (no caching)');
        // Continue to fetch from MapTiler if Redis fails
      } finally {
        redis.disconnect();
      }
    }

    // Fetch from MapTiler
    console.log('[MapTiler Tile Cache] ❌ CACHE MISS - Fetching from MapTiler API');
    const response = await fetch(url);

    if (!response.ok) {
      // Don't cache errors
      console.error('[MapTiler Tile Cache] MapTiler API error:', response.status);
      return res.status(response.status).json({ error: 'Failed to fetch tile' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Cache in Redis as base64
    if (redisUrl) {
      const redis = new Redis(redisUrl, { lazyConnect: true });
      try {
        await redis.connect();
        const base64 = buffer.toString('base64');

        // Only cache if tile is reasonable size (< 500KB)
        if (base64.length < 500000) {
          console.log('[MapTiler Tile Cache] Writing to Redis', {
            sizeBytes: buffer.length,
            sizeBase64: base64.length
          });
          await redis.set(cacheKey, base64, 'EX', 2592000); // 30 days
          await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', 2592000);
          await redis.set(`${cacheKey}:type`, contentType, 'EX', 2592000);
          console.log('[MapTiler Tile Cache] ✅ Cached in Redis (TTL: 30 days)');
        } else {
          console.warn('[MapTiler Tile Cache] ⚠️ Tile too large to cache:', base64.length);
        }
      } catch (err) {
        console.error('[MapTiler Tile Cache] ❌ Failed to write to Redis:', err);
        console.warn('[MapTiler Tile Cache] ⚠️ Tile served but not cached - will fetch again next time');
      } finally {
        redis.disconnect();
      }
    }

    // Set aggressive cache headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Tile proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch tile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Background refresh of tile
 */
async function refreshTile(url: string, cacheKey: string, redisUrl: string): Promise<void> {
  const redis = new Redis(redisUrl, { lazyConnect: true });
  try {
    await redis.connect();

    const response = await fetch(url);
    if (!response.ok) return;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const base64 = buffer.toString('base64');

    if (base64.length < 500000) {
      await redis.set(cacheKey, base64, 'EX', 2592000);
      await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', 2592000);
      await redis.set(`${cacheKey}:type`, contentType, 'EX', 2592000);
      console.log('[MapTiler Tile Cache] Background refresh completed');
    }
  } catch (error) {
    console.error('Background tile refresh failed:', error);
  } finally {
    redis.disconnect();
  }
}
