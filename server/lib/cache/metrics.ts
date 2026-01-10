/**
 * Tile cache metrics tracking
 * In-memory metrics for monitoring cache performance
 */

export const tileMetrics = {
  // Cache operations
  redisHits: 0,
  redisMisses: 0,
  cacheWriteSuccess: 0,
  cacheWriteFailures: 0,

  // Source operations
  maptilerSuccess: 0,
  maptilerFailures: 0,
  awsTerrainSuccess: 0,
  awsTerrainFailures: 0,

  // Fallbacks
  staticFallbacks: 0,
  emergencyFallbacks: 0,

  // Totals
  totalRequests: 0,
  totalBytesServed: 0,
  totalResponseTimeMs: 0,

  // Queue metrics
  queueDeduped: 0,
};

export type MetricType = keyof typeof tileMetrics;

/**
 * Record a metric increment
 */
export function recordMetric(type: MetricType, value: number = 1): void {
  if (type in tileMetrics) {
    tileMetrics[type] += value;
  }
}

/**
 * Get a snapshot of all metrics
 */
export function getMetricsSnapshot(): typeof tileMetrics & {
  avgResponseTimeMs: number;
  cacheHitRate: number;
} {
  const cacheTotal = tileMetrics.redisHits + tileMetrics.redisMisses;
  const cacheHitRate = cacheTotal > 0 ? tileMetrics.redisHits / cacheTotal : 0;

  const avgResponseTimeMs =
    tileMetrics.totalRequests > 0
      ? tileMetrics.totalResponseTimeMs / tileMetrics.totalRequests
      : 0;

  return {
    ...tileMetrics,
    avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
    cacheHitRate: Math.round(cacheHitRate * 10000) / 100, // percentage with 2 decimals
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  Object.keys(tileMetrics).forEach((key) => {
    tileMetrics[key as MetricType] = 0;
  });
}

/**
 * Format metrics as a human-readable string
 */
export function formatMetrics(): string {
  const snapshot = getMetricsSnapshot();
  return [
    `Total Requests: ${snapshot.totalRequests}`,
    `Cache Hit Rate: ${snapshot.cacheHitRate}%`,
    `Redis Hits: ${snapshot.redisHits}`,
    `Redis Misses: ${snapshot.redisMisses}`,
    `MapTiler Success: ${snapshot.maptilerSuccess}`,
    `MapTiler Failures: ${snapshot.maptilerFailures}`,
    `AWS Success: ${snapshot.awsTerrainSuccess}`,
    `AWS Failures: ${snapshot.awsTerrainFailures}`,
    `Static Fallbacks: ${snapshot.staticFallbacks}`,
    `Avg Response Time: ${snapshot.avgResponseTimeMs}ms`,
    `Total Bytes Served: ${(snapshot.totalBytesServed / 1024 / 1024).toFixed(2)} MB`,
  ].join('\n');
}
