import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In serverless, metrics are per-instance and reset on cold start
  // For persistent metrics, we'd need to store in Redis
  // This endpoint shows current instance stats + Redis key count

  let tileCount = 0;

  try {
    const { Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
      await redis.connect();

      // Count tile keys
      const keys = await redis.keys('tile:*');
      tileCount = keys.filter(k => !k.includes(':timestamp') && !k.includes(':type')).length;

      redis.disconnect();
    }
  } catch (e) {
    console.error('[Metrics] Redis error:', e);
  }

  return res.status(200).json({
    status: 'ok',
    cache: {
      tilesStored: tileCount,
      storageType: 'permanent',
      note: 'Tiles never expire'
    },
    instance: {
      note: 'Per-instance metrics reset on cold start',
      uptime: process.uptime(),
    },
    timestamp: new Date().toISOString(),
  });
}
