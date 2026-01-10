import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return res.status(503).json({
      status: 'not_configured',
      message: 'REDIS_URL not set',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { Redis } = await import('ioredis');
    const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 5000 });

    const start = Date.now();
    await redis.connect();
    await redis.ping();
    const latency = Date.now() - start;

    // Get some stats
    const dbSize = await redis.dbsize();
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

    redis.disconnect();

    return res.status(200).json({
      status: 'healthy',
      connected: true,
      latencyMs: latency,
      keyCount: dbSize,
      memoryUsed: memory,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
