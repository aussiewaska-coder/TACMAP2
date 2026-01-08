// Generic fetch with caching for emergency services feeds
// Uses Redis (Vercel KV) for caching with stale-while-revalidate pattern

interface CacheResult<T> {
    data: T | null;
    stale: boolean;
    error?: string;
}

interface CacheOptions {
    ttlSeconds: number;
    staleWhileRevalidateSeconds?: number;
}

/**
 * Fetch data with caching support
 * Returns last-good data even if stale, with stale indicator
 */
export async function fetchWithCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
): Promise<CacheResult<T>> {
    const { ttlSeconds, staleWhileRevalidateSeconds = ttlSeconds * 2 } = options;

    try {
        // Try to get Redis client
        const redis = await getRedisClient();

        if (redis) {
            // Check cache first
            const cached = await redis.get(cacheKey);
            const cacheTimestamp = await redis.get(`${cacheKey}:timestamp`);

            if (cached && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp as string, 10);
                const isStale = age > ttlSeconds * 1000;
                const isExpired = age > staleWhileRevalidateSeconds * 1000;

                if (!isExpired) {
                    // Return cached data, optionally trigger background refresh
                    if (isStale) {
                        // Background refresh (fire and forget)
                        refreshCache(cacheKey, fetcher, redis, ttlSeconds).catch(console.error);
                    }

                    return {
                        data: JSON.parse(cached as string) as T,
                        stale: isStale,
                    };
                }
            }
        }

        // Fetch fresh data
        const freshData = await fetcher();

        // Cache it
        if (redis) {
            await redis.set(cacheKey, JSON.stringify(freshData));
            await redis.set(`${cacheKey}:timestamp`, Date.now().toString());
            await redis.expire(cacheKey, staleWhileRevalidateSeconds);
            await redis.expire(`${cacheKey}:timestamp`, staleWhileRevalidateSeconds);
        }

        return {
            data: freshData,
            stale: false,
        };

    } catch (error) {
        console.error('fetchWithCache error:', error);

        // Try to return stale data on error
        try {
            const redis = await getRedisClient();
            if (redis) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return {
                        data: JSON.parse(cached as string) as T,
                        stale: true,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            }
        } catch (cacheError) {
            console.error('Failed to retrieve stale cache:', cacheError);
        }

        return {
            data: null,
            stale: true,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Background refresh helper
 */
async function refreshCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    redis: any,
    ttlSeconds: number
): Promise<void> {
    try {
        const freshData = await fetcher();
        await redis.set(cacheKey, JSON.stringify(freshData));
        await redis.set(`${cacheKey}:timestamp`, Date.now().toString());
        await redis.expire(cacheKey, ttlSeconds * 2);
        await redis.expire(`${cacheKey}:timestamp`, ttlSeconds * 2);
    } catch (error) {
        console.error('Background refresh failed:', error);
    }
}

/**
 * Get Redis client (Vercel KV)
 */
async function getRedisClient() {
    try {
        // Check if Redis URL is configured
        const redisUrl = process.env.KV_REST_API_URL || process.env.REDIS_URL;

        if (!redisUrl) {
            console.warn('No Redis URL configured, caching disabled');
            return null;
        }

        // Use Vercel KV
        const { createClient } = await import('@vercel/kv');
        return createClient({
            url: process.env.KV_REST_API_URL!,
            token: process.env.KV_REST_API_TOKEN!,
        });
    } catch (error) {
        console.error('Failed to create Redis client:', error);
        return null;
    }
}
