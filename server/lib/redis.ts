// Redis client factory - supports both Vercel KV and Redis Labs
import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get Redis client (singleton)
 * Supports both REDIS_URL (ioredis) and KV_REST_API_URL (Vercel KV)
 */
export async function getRedisClient(): Promise<Redis | null> {
  try {
    // Already initialized
    if (redisClient) {
      return redisClient;
    }

    // Check for Redis Labs URL first (preferred)
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      console.log('[Redis] Connecting to Redis Labs via REDIS_URL');
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: false,
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
      });

      redisClient.on('connect', () => {
        console.log('[Redis] ✅ Connected to Redis Labs');
      });

      return redisClient;
    }

    // Fallback to Vercel KV
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      console.log('[Redis] Using Vercel KV (not recommended for this use case)');
      // For Vercel KV, we'll use the REST API via @vercel/kv
      // This is handled separately in the API routes
      return null;
    }

    console.warn('[Redis] No Redis configuration found (REDIS_URL or KV_REST_API_URL)');
    return null;

  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return null;
  }
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
