import { getRedisClient } from '../lib/cache/client';

const inflight = new Map<string, Promise<Buffer>>();
const fallbackTile = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,0x89,0x00,0x00,0x00,0x0a,0x49,0x44,0x41,0x54,0x78,0x9c,0x63,0x00,0x01,0x00,0x00,0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]);

export async function getTile(z: number, x: number, y: number): Promise<Buffer> {
  const key = `${z}-${x}-${y}`;
  if (inflight.has(key)) return inflight.get(key)!;
  
  const promise = (async () => {
    const redisKey = `tile:maptiler:${key}`;
    try {
      const redis = await getRedisClient();
      if (redis) {
        const cached = await redis.get(redisKey);
        if (cached) {
          console.log(`[Tile] REDIS CACHE ${key}`);
          return Buffer.from(cached, 'base64');
        }
      }

      console.log(`[Tile] FETCHING MAPTILER ${key}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const apiKey = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;
      const res = await fetch(`https://api.maptiler.com/tiles/v3/${z}/${x}/${y}.png?key=${apiKey}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`MapTiler ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`[Tile] MAPTILER OK ${key} (${buf.length} bytes)`);

      if (redis) {
        redis.set(redisKey, buf.toString('base64')).catch(console.error);
        console.log(`[Tile] CACHED TO REDIS ${key}`);
      }
      return buf;
    } catch (e) {
      console.error(`[Tile] FALLBACK ${key}:`, e);
      return fallbackTile;
    }
    finally { inflight.delete(key); }
  })();
  
  inflight.set(key, promise);
  return promise;
}
