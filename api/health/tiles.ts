import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Test tile for Byron Bay at zoom 12
  const testZ = 12;
  const testX = 3768; // Approximate x for Byron Bay at z12
  const testY = 2492; // Approximate y for Byron Bay at z12

  const results = {
    redis: { status: 'unknown', latency: 0 },
    maptiler: { status: 'unknown', latency: 0 },
    awsTerrain: { status: 'unknown', latency: 0 },
  };

  // Test Redis cache
  try {
    const { Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
      await redis.connect();

      const start = Date.now();
      const cached = await redis.get(`tile:${testZ}:${testX}:${testY}`);
      results.redis.latency = Date.now() - start;
      results.redis.status = cached ? 'hit' : 'miss';

      redis.disconnect();
    }
  } catch (e) {
    results.redis.status = 'error';
  }

  // Test MapTiler
  try {
    const apiKey = process.env.VITE_MAPTILER_API_KEY;
    const styleId = process.env.VITE_MAPTILER_STYLE || 'streets-v2';
    if (apiKey) {
      const url = `https://api.maptiler.com/maps/${styleId}/256/${testZ}/${testX}/${testY}.png?key=${apiKey}`;
      const start = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      results.maptiler.latency = Date.now() - start;
      results.maptiler.status = response.ok ? 'available' : `error_${response.status}`;
    }
  } catch (e) {
    results.maptiler.status = 'error';
  }

  // Test AWS Terrain
  try {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${testZ}/${testX}/${testY}.png`;
    const start = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    results.awsTerrain.latency = Date.now() - start;
    results.awsTerrain.status = response.ok ? 'available' : `error_${response.status}`;
  } catch (e) {
    results.awsTerrain.status = 'error';
  }

  const allOk = results.maptiler.status === 'available' || results.awsTerrain.status === 'available';

  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    testTile: { z: testZ, x: testX, y: testY, location: 'Byron Bay' },
    sources: results,
    timestamp: new Date().toISOString(),
  });
}
