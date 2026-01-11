import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = {
    redis: 'unknown',
    maptiler: 'unknown',
  };

  // Check Redis
  try {
    const { Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
      await redis.connect();
      await redis.ping();
      checks.redis = 'healthy';
      redis.disconnect();
    } else {
      checks.redis = 'not_configured';
    }
  } catch (e) {
    checks.redis = 'unhealthy';
  }

  // Check MapTiler
  try {
    const apiKey = process.env.VITE_MAPTILER_API_KEY;
    const styleId = process.env.VITE_MAPTILER_STYLE;
    if (apiKey && styleId) {
      const response = await fetch(`https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      checks.maptiler = response.ok ? 'healthy' : 'unhealthy';
    } else {
      checks.maptiler = 'not_configured';
    }
  } catch (e) {
    checks.maptiler = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every(v => v === 'healthy' || v === 'not_configured');
  const status = allHealthy ? 'healthy' : 'degraded';

  return res.status(status === 'healthy' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    service: 'TacMap Critical Infrastructure',
    checks,
  });
}
