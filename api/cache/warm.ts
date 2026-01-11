import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { Redis } = await import('ioredis');
  const { STRATEGIC_LOCATIONS, CACHE_WARM_CONCURRENCY } = await import('../../server/lib/cache/strategicLocations');
  const { latLonToTile, getTilesInRadius } = await import('../../server/lib/cache/tileUtils');

  const redisUrl = process.env.REDIS_URL;
  const apiKey = process.env.VITE_MAPTILER_API_KEY;
  const styleId = process.env.VITE_MAPTILER_STYLE;

  if (!redisUrl || !apiKey || !styleId) {
    return res.status(500).json({ error: 'Missing REDIS_URL, VITE_MAPTILER_API_KEY, or VITE_MAPTILER_STYLE' });
  }

  const { locationId, priority } = req.body as { locationId?: string; priority?: number };

  let locations = STRATEGIC_LOCATIONS;
  if (locationId) {
    locations = locations.filter(l => l.id === locationId);
  }
  if (priority) {
    locations = locations.filter(l => l.priority === priority);
  }

  const redis = new Redis(redisUrl, { lazyConnect: true });
  await redis.connect();

  const results: { location: string; cached: number; skipped: number; failed: number }[] = [];

  for (const location of locations) {
    const centerTile = latLonToTile(location.coordinates[1], location.coordinates[0], location.zoom);
    const tiles = getTilesInRadius(centerTile, location.radiusTiles);

    let cached = 0, skipped = 0, failed = 0;

    // Process in batches
    for (let i = 0; i < tiles.length; i += CACHE_WARM_CONCURRENCY) {
      const batch = tiles.slice(i, i + CACHE_WARM_CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map(async (tile) => {
          const cacheKey = `tile:${tile.z}:${tile.x}:${tile.y}`;

          // Check if already cached
          const exists = await redis.exists(cacheKey);
          if (exists) return 'skipped';

          // Fetch from MapTiler
          const url = `https://api.maptiler.com/maps/${styleId}/256/${tile.z}/${tile.x}/${tile.y}.png?key=${apiKey}`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'TacMap-CacheWarming/1.0' },
            signal: AbortSignal.timeout(8000)
          });

          if (!response.ok) return 'failed';

          const buffer = Buffer.from(await response.arrayBuffer());
          await redis.set(cacheKey, buffer.toString('base64'));
          return 'cached';
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          if (r.value === 'cached') cached++;
          else if (r.value === 'skipped') skipped++;
          else failed++;
        } else {
          failed++;
        }
      }

      // Small delay between batches
      await new Promise(r => setTimeout(r, 100));
    }

    results.push({ location: location.name, cached, skipped, failed });
  }

  redis.disconnect();

  const totalCached = results.reduce((sum, r) => sum + r.cached, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  return res.status(200).json({
    success: true,
    summary: {
      locationsProcessed: results.length,
      totalTilesCached: totalCached,
      totalTilesSkipped: totalSkipped,
    },
    details: results,
    timestamp: new Date().toISOString(),
  });
}
