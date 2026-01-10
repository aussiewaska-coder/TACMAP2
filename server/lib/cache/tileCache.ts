/**
 * Tile cache operations using Redis
 * Stores tiles permanently (no TTL) with verified writes
 */
import { getRedisClient } from './client';

/**
 * Generate cache key for a tile
 */
export function getTileCacheKey(z: number, x: number, y: number): string {
  return `tile:${z}:${x}:${y}`;
}

/**
 * Get a tile from cache
 * Returns null if not found or on error - never throws
 */
export async function getTile(
  z: number,
  x: number,
  y: number
): Promise<Buffer | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return null;
    }

    const key = getTileCacheKey(z, x, y);
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    // Stored as base64
    return Buffer.from(cached, 'base64');
  } catch (error) {
    console.error(`[TileCache] Error getting tile ${z}/${x}/${y}:`, error);
    return null;
  }
}

/**
 * Store a tile in cache with verification
 * Returns true only if write was verified successful
 * NO TTL - tiles are PERMANENT
 */
export async function setTileVerified(
  z: number,
  x: number,
  y: number,
  buffer: Buffer,
  source: string
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[TileCache] Redis not available for write');
      return false;
    }

    const key = getTileCacheKey(z, x, y);
    const base64Data = buffer.toString('base64');

    // SET with no TTL - permanent storage
    const result = await redis.set(key, base64Data);

    if (result === 'OK') {
      console.log(`[TileCache] Cached ${key} from ${source} (${buffer.length} bytes)`);
      return true;
    }

    console.error(`[TileCache] Write verification failed for ${key}: ${result}`);
    return false;
  } catch (error) {
    console.error(`[TileCache] Error setting tile ${z}/${x}/${y}:`, error);
    return false;
  }
}

/**
 * Check if a tile exists in cache (without fetching the data)
 */
export async function hasTile(
  z: number,
  x: number,
  y: number
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false;
    }

    const key = getTileCacheKey(z, x, y);
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`[TileCache] Error checking tile ${z}/${x}/${y}:`, error);
    return false;
  }
}

/**
 * Delete a tile from cache
 */
export async function deleteTile(
  z: number,
  x: number,
  y: number
): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false;
    }

    const key = getTileCacheKey(z, x, y);
    const result = await redis.del(key);
    return result === 1;
  } catch (error) {
    console.error(`[TileCache] Error deleting tile ${z}/${x}/${y}:`, error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keyCount: number | null;
  memoryUsage: string | null;
}> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return { connected: false, keyCount: null, memoryUsage: null };
    }

    // Count tile keys
    const keys = await redis.keys('tile:*');
    const keyCount = keys.length;

    // Get memory info
    const info = await redis.info('memory');
    const memMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memMatch ? memMatch[1] : null;

    return { connected: true, keyCount, memoryUsage };
  } catch (error) {
    console.error('[TileCache] Error getting stats:', error);
    return { connected: false, keyCount: null, memoryUsage: null };
  }
}
