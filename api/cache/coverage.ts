import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { Redis } = await import('ioredis');
  const { STRATEGIC_LOCATIONS } = await import('../../server/lib/cache/strategicLocations');
  const { latLonToTile, getTilesInRadius } = await import('../../server/lib/cache/tileUtils');

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return res.status(500).json({ error: 'REDIS_URL not configured' });
  }

  const redis = new Redis(redisUrl, { lazyConnect: true });
  await redis.connect();

  const coverage: { id: string; name: string; total: number; cached: number; percent: number }[] = [];

  for (const location of STRATEGIC_LOCATIONS) {
    const centerTile = latLonToTile(location.coordinates[1], location.coordinates[0], location.zoom);
    const tiles = getTilesInRadius(centerTile, location.radiusTiles);

    // Check existence in pipeline
    const pipeline = redis.pipeline();
    for (const tile of tiles) {
      pipeline.exists(`tile:${tile.z}:${tile.x}:${tile.y}`);
    }
    const results = await pipeline.exec();

    const cachedCount = results?.filter(r => r && r[1] === 1).length || 0;

    coverage.push({
      id: location.id,
      name: location.name,
      total: tiles.length,
      cached: cachedCount,
      percent: Math.round((cachedCount / tiles.length) * 100),
    });
  }

  redis.disconnect();

  const totalTiles = coverage.reduce((sum, c) => sum + c.total, 0);
  const totalCached = coverage.reduce((sum, c) => sum + c.cached, 0);

  return res.status(200).json({
    overall: {
      totalTiles,
      totalCached,
      coveragePercent: Math.round((totalCached / totalTiles) * 100),
    },
    locations: coverage,
    timestamp: new Date().toISOString(),
  });
}
