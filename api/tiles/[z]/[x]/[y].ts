/**
 * Fortress Tile API Endpoint
 * 5-tier fallback system: Redis -> MapTiler -> AWS Terrain -> Static -> Emergency
 * NEVER fails - always returns a valid PNG
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Redis from 'ioredis';

// STATIC FALLBACK TILE - 256x256 transparent gray PNG (minimal valid PNG)
// This is a 256x256 solid gray (#808080) PNG encoded in base64
const STATIC_FALLBACK_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAADklEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAeA0AAADgCwI0AAF+cbCVAAAAAElFTkSuQmCC';

let STATIC_FALLBACK_BUFFER: Buffer | null = null;

// Get static fallback buffer (lazy initialized)
function getStaticFallback(): Buffer {
  if (!STATIC_FALLBACK_BUFFER) {
    STATIC_FALLBACK_BUFFER = Buffer.from(STATIC_FALLBACK_BASE64, 'base64');
  }
  return STATIC_FALLBACK_BUFFER;
}

// Send tile response with proper headers
function sendTile(
  res: VercelResponse,
  buffer: Buffer,
  source: string,
  startTime: number
): void {
  const responseTime = Date.now() - startTime;

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', buffer.length);
  // Cache for 1 week, immutable
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Cache', source);
  res.setHeader('X-Response-Time', `${responseTime}ms`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  res.status(200).send(buffer);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Extract z, x, y from path params
  const { z, x, y: yRaw } = req.query;

  // Handle .png extension in y parameter
  const yStr = String(yRaw).replace(/\.png$/i, '');

  const zNum = parseInt(String(z), 10);
  const xNum = parseInt(String(x), 10);
  const yNum = parseInt(yStr, 10);

  // Validate coordinates
  if (isNaN(zNum) || isNaN(xNum) || isNaN(yNum)) {
    res.status(400).json({
      error: 'Invalid coordinates',
      received: { z, x, y: yRaw },
    });
    return;
  }

  // Validate zoom level (0-22 is standard)
  if (zNum < 0 || zNum > 22) {
    res.status(400).json({
      error: 'Invalid zoom level',
      zoom: zNum,
      valid: '0-22',
    });
    return;
  }

  // Validate x/y are within bounds for zoom level
  const maxTile = Math.pow(2, zNum);
  if (xNum < 0 || xNum >= maxTile || yNum < 0 || yNum >= maxTile) {
    res.status(400).json({
      error: 'Coordinates out of bounds',
      coordinates: { z: zNum, x: xNum, y: yNum },
      maxTile: maxTile - 1,
    });
    return;
  }

  const cacheKey = `tile:${zNum}:${xNum}:${yNum}`;
  const TOTAL_TIMEOUT = 10000; // 10 seconds total
  const SOURCE_TIMEOUT = 5000; // 5 seconds per source

  let redis: Redis | null = null;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: REDIS CACHE
    // ═══════════════════════════════════════════════════════════════════
    try {
      const { getRedisClient } = await import(
        '../../../../server/lib/cache/client'
      );
      redis = await getRedisClient();

      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[Tile API] REDIS HIT: ${cacheKey}`);
          sendTile(res, Buffer.from(cached, 'base64'), 'HIT', startTime);
          return;
        }
        console.log(`[Tile API] REDIS MISS: ${cacheKey}`);
      }
    } catch (e) {
      console.error('[Tile API] Redis error:', e);
    }

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: MAPTILER API
    // ═══════════════════════════════════════════════════════════════════
    if (Date.now() - startTime < TOTAL_TIMEOUT - 3000) {
      try {
        const apiKey = process.env.VITE_MAPTILER_API_KEY;
        const styleId = process.env.VITE_MAPTILER_STYLE || 'streets-v2';

        if (apiKey) {
          const url = `https://api.maptiler.com/maps/${styleId}/256/${zNum}/${xNum}/${yNum}.png?key=${apiKey}`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);

          const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'TacMap/1.0' },
          });
          clearTimeout(timeout);

          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            console.log(
              `[Tile API] MAPTILER SUCCESS: ${cacheKey} (${buffer.length} bytes)`
            );

            // Write to Redis PERMANENTLY (fire and forget)
            if (redis) {
              redis
                .set(cacheKey, buffer.toString('base64'))
                .then(() =>
                  console.log(`[Tile API] CACHED: ${cacheKey}`)
                )
                .catch((e) =>
                  console.error('[Tile API] Cache write failed:', e)
                );
            }

            sendTile(res, buffer, 'MAPTILER', startTime);
            return;
          } else {
            console.error(
              `[Tile API] MapTiler HTTP ${response.status}: ${response.statusText}`
            );
          }
        } else {
          console.warn('[Tile API] No MapTiler API key configured');
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.error('[Tile API] MapTiler timeout');
        } else {
          console.error('[Tile API] MapTiler error:', e);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 3: AWS TERRAIN TILES (elevation data, grayscale)
    // ═══════════════════════════════════════════════════════════════════
    if (Date.now() - startTime < TOTAL_TIMEOUT - 1000) {
      try {
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zNum}/${xNum}/${yNum}.png`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'TacMap/1.0' },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          console.log(
            `[Tile API] AWS SUCCESS: ${cacheKey} (${buffer.length} bytes)`
          );

          // Write to Redis PERMANENTLY (fire and forget)
          if (redis) {
            redis
              .set(cacheKey, buffer.toString('base64'))
              .then(() =>
                console.log(`[Tile API] CACHED from AWS: ${cacheKey}`)
              )
              .catch((e) =>
                console.error('[Tile API] Cache write failed:', e)
              );
          }

          sendTile(res, buffer, 'AWS', startTime);
          return;
        } else {
          console.error(
            `[Tile API] AWS HTTP ${response.status}: ${response.statusText}`
          );
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.error('[Tile API] AWS timeout');
        } else {
          console.error('[Tile API] AWS error:', e);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 4: STATIC FALLBACK (GUARANTEED)
    // ═══════════════════════════════════════════════════════════════════
    console.error(`[Tile API] ALL SOURCES FAILED for ${cacheKey}`);
    sendTile(res, getStaticFallback(), 'FALLBACK', startTime);
    return;
  } catch (e) {
    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 5: EMERGENCY FALLBACK (CATASTROPHIC ERROR)
    // ═══════════════════════════════════════════════════════════════════
    console.error('[Tile API] CATASTROPHIC ERROR:', e);
    sendTile(res, getStaticFallback(), 'EMERGENCY', startTime);
    return;
  }
}
