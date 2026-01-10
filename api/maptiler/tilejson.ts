// MapTiler TileJSON Proxy with Redis Caching
// TileJSON metadata rarely changes, cache for 7 days

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/kv';

interface TileJSON {
  tiles?: string[];
  [key: string]: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing TileJSON URL' });
  }

  const cacheKey = `maptiler:tilejson:${url}`;

  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });

      const cached = await redis.get(cacheKey);
      const timestamp = await redis.get(`${cacheKey}:timestamp`);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp as string, 10);
        const isStale = age > 604800000; // 7 days

        if (!isStale) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(cached as string));
        }
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch TileJSON' });
    }

    const tileJson: TileJSON = await response.json();

    // Transform tile URLs to use our proxy
    if (tileJson.tiles && Array.isArray(tileJson.tiles)) {
      const host = req.headers.host || '';
      tileJson.tiles = tileJson.tiles.map(tileUrl => {
        if (tileUrl.includes('api.maptiler.com')) {
          return `https://${host}/api/maptiler/tile?url=${encodeURIComponent(tileUrl)}`;
        }
        return tileUrl;
      });
    }

    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });
      await redis.set(cacheKey, JSON.stringify(tileJson));
      await redis.set(`${cacheKey}:timestamp`, Date.now().toString());
      await redis.expire(cacheKey, 604800);
      await redis.expire(`${cacheKey}:timestamp`, 604800);
    }

    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(tileJson);

  } catch (error) {
    console.error('TileJSON proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch TileJSON' });
  }
}
