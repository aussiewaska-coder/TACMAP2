/**
 * Redis tile cache infrastructure
 * Re-exports all cache modules
 */

// Redis client
export {
  getRedisClient,
  getConnectionStatus,
  closeRedisCache,
} from './client';

// Tile cache operations
export {
  getTile,
  setTileVerified,
  hasTile,
  deleteTile,
  getTileCacheKey,
  getCacheStats,
} from './tileCache';

// Request queue for race condition prevention
export {
  fetchTileWithQueue,
  isRequestInFlight,
  getInFlightCount,
  clearInFlightRequests,
} from './tileQueue';

// Metrics tracking
export {
  tileMetrics,
  recordMetric,
  getMetricsSnapshot,
  resetMetrics,
  formatMetrics,
  type MetricType,
} from './metrics';
