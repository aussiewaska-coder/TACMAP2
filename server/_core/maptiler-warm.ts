/**
 * MapTiler Cache Warming
 *
 * Pre-caches the default MapTiler style on server startup.
 * This ensures that even if the very first request hits a rate limit,
 * we have a cached version to serve.
 */

import { getRedisClient } from '../lib/redis';

/**
 * Warm the MapTiler cache with the default style
 */
export async function warmMapTilerCache(): Promise<void> {
  const apiKey = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;
  const styleId = process.env.MAPTILER_STYLE || process.env.VITE_MAPTILER_STYLE;

  if (!apiKey || !styleId) {
    console.warn('[MapTiler Cache] Missing MAPTILER_API_KEY or MAPTILER_STYLE, skipping cache warming');
    return;
  }

  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[MapTiler Cache] Redis not available, skipping cache warming');
      return;
    }

    const cacheKey = `maptiler:${Buffer.from(`/maps/${styleId}/style.json`).toString('hex')}`;
    const TTL = 7 * 24 * 60 * 60; // 7 days

    // Check if already cached
    const existing = await (redis as any).getBuffer(cacheKey);
    if (existing) {
      console.log('[MapTiler Cache] ✅ Style already cached, skipping refresh');
      return;
    }

    // Fetch fresh from MapTiler
    console.log(`[MapTiler Cache] 🔄 Warming cache for style ${styleId}...`);
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`;

    const response = await fetch(styleUrl, {
      headers: {
        'User-Agent': 'TACMAP2-Server-Warming/1.0',
      },
    });

    if (!response.ok) {
      console.warn(
        `[MapTiler Cache] ⚠️  Failed to warm cache: ${response.status} ${response.statusText}`
      );
      return;
    }

    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer);

    // Cache it
    await (redis as any).set(cacheKey, data, 'EX', TTL);
    await redis.set(`${cacheKey}:timestamp`, Date.now().toString(), 'EX', TTL);

    console.log(
      `[MapTiler Cache] ✅ Cache warmed! Cached ${(data.length / 1024).toFixed(1)}KB style.json`
    );
  } catch (error) {
    // Don't block server startup on cache warming failure
    console.warn('[MapTiler Cache] ⚠️  Cache warming failed (non-blocking):', error);
  }
}
