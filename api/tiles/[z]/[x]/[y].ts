/**
 * Fortress Tile API Endpoint
 * 5-tier fallback system: Redis -> MapTiler -> AWS Terrain -> Static -> Emergency
 * NEVER fails - always returns a valid PNG
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Redis from 'ioredis';

// Inline Redis client factory for serverless (can't import from /server)
async function createRedisClient(): Promise<any> {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[Tile API] ❌ REDIS_URL not configured in Vercel env vars');
      return null;
    }

    console.log('[Tile API] 🔄 Attempting Redis connection...');
    const { Redis: RedisClass } = await import('ioredis');
    const redis = new RedisClass(redisUrl, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // Don't retry after first failure
    });

    // Connect with timeout
    const connectPromise = redis.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connect timeout')), 2000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('[Tile API] ✅ Redis connected successfully');
    return redis;
  } catch (err) {
    console.error('[Tile API] ❌ Redis connection failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

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
  startTime: number,
  debugCascade?: string
): void {
  const responseTime = Date.now() - startTime;

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', buffer.length);
  // Cache for 1 week, immutable
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Cache', source);
  res.setHeader('X-Response-Time', `${responseTime}ms`);
  if (debugCascade) {
    res.setHeader('X-Cache-Cascade', debugCascade);
  }
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
  const cascade: string[] = [];

  try {
    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: REDIS CACHE
    // ═══════════════════════════════════════════════════════════════════
    try {
      redis = await createRedisClient();

      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[Tile API] REDIS HIT: ${cacheKey}`);
          cascade.push('redis_hit');
          sendTile(res, Buffer.from(cached, 'base64'), 'HIT', startTime, cascade.join(','));
          return;
        }
        console.log(`[Tile API] REDIS MISS: ${cacheKey}`);
        cascade.push('redis_miss');
      }
    } catch (e) {
      console.error('[Tile API] Redis error:', e);
      cascade.push(`redis_error:${e instanceof Error ? e.message : 'unknown'}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: MAPTILER API
    // ═══════════════════════════════════════════════════════════════════
    if (Date.now() - startTime < TOTAL_TIMEOUT - 3000) {
      try {
        // Note: Use MAPTILER_* (not VITE_*) for server-side env vars
        // VITE_ prefix is for frontend only and not available on server
        const apiKey = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;
        const styleId = process.env.MAPTILER_STYLE || process.env.VITE_MAPTILER_STYLE;

        console.log('[Tile API] MapTiler attempt:', {
          hasApiKey: !!apiKey,
          apiKeySource: process.env.MAPTILER_API_KEY ? 'MAPTILER_API_KEY' : (process.env.VITE_MAPTILER_API_KEY ? 'VITE_MAPTILER_API_KEY' : 'NONE'),
          hasStyleId: !!styleId,
          styleIdSource: process.env.MAPTILER_STYLE ? 'MAPTILER_STYLE' : (process.env.VITE_MAPTILER_STYLE ? 'VITE_MAPTILER_STYLE' : 'NONE'),
        });

        if (apiKey && styleId) {
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
            cascade.push('maptiler_hit');

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

            sendTile(res, buffer, 'MAPTILER', startTime, cascade.join(','));
            return;
          } else {
            console.error(
              `[Tile API] MapTiler HTTP ${response.status}: ${response.statusText}`
            );
            cascade.push(`maptiler_${response.status}`);
          }
        } else {
          if (!apiKey) {
            console.warn('[Tile API] No MapTiler API key configured');
            cascade.push('maptiler_nokey');
          } else {
            console.warn('[Tile API] No MapTiler style ID configured');
            cascade.push('maptiler_nostyle');
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.error('[Tile API] MapTiler timeout');
          cascade.push('maptiler_timeout');
        } else {
          console.error('[Tile API] MapTiler error:', e);
          cascade.push(`maptiler_error:${e instanceof Error ? e.message : 'unknown'}`);
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
          cascade.push('aws_hit');

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

          sendTile(res, buffer, 'AWS', startTime, cascade.join(','));
          return;
        } else {
          console.error(
            `[Tile API] AWS HTTP ${response.status}: ${response.statusText}`
          );
          cascade.push(`aws_${response.status}`);
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.error('[Tile API] AWS timeout');
          cascade.push('aws_timeout');
        } else {
          console.error('[Tile API] AWS error:', e);
          cascade.push(`aws_error:${e instanceof Error ? e.message : 'unknown'}`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 4: STATIC FALLBACK (GUARANTEED)
    // ═══════════════════════════════════════════════════════════════════
    console.error(`[Tile API] ALL SOURCES FAILED for ${cacheKey}`);
    cascade.push('fallback');
    sendTile(res, getStaticFallback(), 'FALLBACK', startTime, cascade.join(','));
    return;
  } catch (e) {
    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 5: EMERGENCY FALLBACK (CATASTROPHIC ERROR)
    // ═══════════════════════════════════════════════════════════════════
    console.error('[Tile API] CATASTROPHIC ERROR:', e);
    cascade.push(`emergency:${e instanceof Error ? e.message : 'unknown'}`);
    sendTile(res, getStaticFallback(), 'EMERGENCY', startTime, cascade.join(','));
    return;
  }
}
