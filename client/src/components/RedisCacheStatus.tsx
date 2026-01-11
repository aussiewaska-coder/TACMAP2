import { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

interface RedisHealth {
  status: 'healthy' | 'unhealthy' | 'not_configured';
  connected: boolean;
  latencyMs?: number;
  keyCount?: number;
  memoryUsed?: string;
  error?: string;
}

interface CacheMetrics {
  cache: {
    tilesStored: number;
    storageType: string;
    note: string;
  };
  instance: {
    note: string;
    uptime: number;
  };
}

/**
 * Redis Cache Status Widget
 * Shows connection health, tile count, and memory usage
 * Click to refresh
 */
export function RedisCacheStatus() {
  const isLoaded = useMapStore((state) => state.isLoaded);
  const [health, setHealth] = useState<RedisHealth | null>(null);
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fetchStatus = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch('/api/health/redis'),
        fetch('/api/health/metrics'),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }

      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }
    } catch (err) {
      console.error('[RedisCacheStatus] Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    if (!isLoaded) return;
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  if (!isLoaded || !health) return null;

  const isHealthy = health.status === 'healthy' && health.connected;
  const statusIcon = isHealthy ? '🟢' : '🔴';
  const tileCount = metrics?.cache.tilesStored || 0;

  return (
    <div
      className="fixed left-4 bottom-20 z-40 cursor-pointer"
      onClick={() => {
        setShowDetails(!showDetails);
        if (!showDetails) fetchStatus();
      }}
    >
      {/* Minimized view */}
      {!showDetails && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded px-3 py-2 text-xs font-mono text-cyan-400 hover:border-cyan-500/60 transition-colors">
          {statusIcon} Redis
          <br />
          {tileCount.toLocaleString()} tiles
        </div>
      )}

      {/* Expanded view */}
      {showDetails && (
        <div className="bg-slate-950/95 border border-cyan-500/50 rounded p-3 text-xs font-mono text-cyan-400 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">REDIS CACHE</span>
            <span className="text-cyan-300/60 cursor-pointer hover:text-cyan-300" onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}>
              ✕
            </span>
          </div>

          {/* Connection Status */}
          <div className="border-b border-cyan-500/20 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span>{statusIcon}</span>
              <span>{health.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {health.latencyMs !== undefined && (
              <div className="text-cyan-300/60 text-xs">
                Latency: {health.latencyMs}ms
              </div>
            )}
            {health.error && (
              <div className="text-red-400 text-xs">{health.error}</div>
            )}
          </div>

          {/* Cache Stats */}
          <div className="border-b border-cyan-500/20 pb-2 mb-2">
            <div className="text-cyan-300/80">
              <div>Tiles Cached: {tileCount.toLocaleString()}</div>
              {health.memoryUsed && (
                <div className="text-cyan-300/60">Memory: {health.memoryUsed}</div>
              )}
              {health.keyCount !== undefined && (
                <div className="text-cyan-300/60">
                  Total Keys: {health.keyCount.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Storage Info */}
          {metrics && (
            <div className="text-cyan-300/60 text-xs">
              <div>{metrics.cache.storageType}</div>
              <div className="text-cyan-300/40">{metrics.cache.note}</div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchStatus();
            }}
            disabled={loading}
            className="mt-2 w-full bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/30 rounded px-2 py-1 text-cyan-400 transition-colors text-xs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  );
}
