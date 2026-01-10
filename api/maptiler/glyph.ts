// MapTiler Glyph (Font) Proxy with Redis Caching
// Font glyphs never change, cache for 30 days

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing glyph URL' });
  }

  const cacheKey = `maptiler:glyph:${url}`;

  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });

      const cached = await redis.get(cacheKey);

      if (cached) {
        const buffer = Buffer.from(cached as string, 'base64');
        res.setHeader('Content-Type', 'application/x-protobuf');
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).send(buffer);
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch glyph' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (kvUrl && kvToken) {
      const redis = createClient({ url: kvUrl, token: kvToken });
      const base64 = buffer.toString('base64');

      await redis.set(cacheKey, base64);
      await redis.expire(cacheKey, 2592000);
    }

    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Glyph proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch glyph' });
  }
}
