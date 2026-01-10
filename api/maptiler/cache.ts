// MapTiler Cache Management API
// Clear Redis cache for MapTiler resources

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

type CacheType = 'style' | 'tile' | 'sprite' | 'glyph' | 'tilejson' | 'all';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST for cache clearing
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body as { type?: CacheType };

  if (!type) {
    return res.status(400).json({ error: 'Missing cache type' });
  }

  const validTypes: CacheType[] = ['style', 'tile', 'sprite', 'glyph', 'tilejson', 'all'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid cache type', validTypes });
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
  });

  try {
    await redis.connect();
    console.log('[Cache Clear] Connected to Redis');

    let pattern: string;
    if (type === 'all') {
      pattern = 'maptiler:*';
    } else {
      pattern = `maptiler:${type}:*`;
    }

    // Find all matching keys
    const keys = await redis.keys(pattern);
    console.log(`[Cache Clear] Found ${keys.length} keys matching pattern: ${pattern}`);

    if (keys.length === 0) {
      redis.disconnect();
      return res.status(200).json({
        success: true,
        message: 'No cached items found',
        cleared: 0
      });
    }

    // Delete all matching keys
    const deleted = await redis.del(...keys);
    console.log(`[Cache Clear] Deleted ${deleted} keys`);

    redis.disconnect();
    return res.status(200).json({
      success: true,
      message: `Cleared ${deleted} cached items`,
      cleared: deleted,
      type
    });

  } catch (error) {
    console.error('[Cache Clear] Error:', error);
    redis.disconnect();
    return res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
