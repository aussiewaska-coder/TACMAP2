/**
 * Redis client singleton with exponential backoff reconnection
 * Uses REDIS_URL only - no Vercel KV fallback
 */
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionAttempts = 0;

/**
 * Get Redis client singleton
 * Never throws - returns null on failure
 */
export async function getRedisClient(): Promise<Redis | null> {
  try {
    // Already connected and ready
    if (redisClient && redisClient.status === 'ready') {
      return redisClient;
    }

    // Already connecting
    if (redisClient && redisClient.status === 'connecting') {
      // Wait for connection with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(redisClient?.status === 'ready' ? redisClient : null);
        }, 3000);

        redisClient!.once('ready', () => {
          clearTimeout(timeout);
          resolve(redisClient);
        });

        redisClient!.once('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[Redis Cache] REDIS_URL not configured');
      return null;
    }

    console.log('[Redis Cache] Initializing connection...');

    redisClient = new Redis(redisUrl, {
      // Infinite retries for serverless - let it keep trying
      maxRetriesPerRequest: null,
      // Enable offline queue so commands queue while reconnecting
      enableOfflineQueue: true,
      // Don't connect immediately - let first command trigger it
      lazyConnect: false,
      // Connection timeout
      connectTimeout: 5000,
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3000ms max
      retryStrategy: (times: number) => {
        connectionAttempts = times;
        const baseDelay = 100;
        const maxDelay = 3000;
        const delay = Math.min(baseDelay * Math.pow(2, times - 1), maxDelay);
        console.log(`[Redis Cache] Reconnecting attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      // Reconnect on error
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
        const shouldReconnect = targetErrors.some((e) => err.message.includes(e));
        if (shouldReconnect) {
          console.log('[Redis Cache] Reconnecting due to error:', err.message);
        }
        return shouldReconnect;
      },
    });

    redisClient.on('error', (err) => {
      console.error('[Redis Cache] Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis Cache] Connected');
      connectionAttempts = 0;
    });

    redisClient.on('ready', () => {
      console.log('[Redis Cache] Ready');
    });

    redisClient.on('close', () => {
      console.log('[Redis Cache] Connection closed');
    });

    // Wait for initial connection with timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Redis Cache] Initial connection timeout');
        resolve(redisClient?.status === 'ready' ? redisClient : null);
      }, 5000);

      redisClient!.once('ready', () => {
        clearTimeout(timeout);
        resolve(redisClient);
      });

      redisClient!.once('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('[Redis Cache] Failed to initialize:', error);
    return null;
  }
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
  connected: boolean;
  status: string;
  attempts: number;
} {
  return {
    connected: redisClient?.status === 'ready',
    status: redisClient?.status || 'disconnected',
    attempts: connectionAttempts,
  };
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Ignore quit errors
    }
    redisClient = null;
    connectionAttempts = 0;
  }
}
