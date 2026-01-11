import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { lngLatToTile } from '@/utils/mapUtils';
import { toast } from 'sonner';

/**
 * Debug hook: Shows tile z/x/y and source (Redis HIT vs MAPTILER) on map hover
 * Helps verify whether Redis cache is serving tiles or falling back to MapTiler
 */
export function useTileSourceDebug() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  // Cache recent tile lookups to avoid spamming requests
  const tileCache = useRef<Map<string, { source: string; timestamp: number }>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastToastId = useRef<string | number | null>(null);

  // Cleanup old cache entries (older than 60 seconds)
  const cleanOldCache = () => {
    const now = Date.now();
    for (const [key, value] of tileCache.current.entries()) {
      if (now - value.timestamp > 60000) {
        tileCache.current.delete(key);
      }
    }
  };

  const fetchTileSource = async (z: number, x: number, y: number): Promise<{ source: string; cascade: string }> => {
    const cacheKey = `${z}:${x}:${y}`;
    const cached = tileCache.current.get(cacheKey);

    // Return cached value if fresh (less than 60 seconds old)
    if (cached && Date.now() - cached.timestamp < 60000) {
      return { source: cached.source.split('|')[0], cascade: cached.source.split('|')[1] || '' };
    }

    try {
      // Use GET with minimal timeout to just read headers
      // Abort after 2 seconds to avoid loading entire tile
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(`/api/tiles/${z}/${x}/${y}.png`, {
          signal: controller.signal,
          // Add cache-busting to avoid browser cache interfering
          headers: { 'Cache-Control': 'no-cache' }
        });

        clearTimeout(timeout);
        const source = response.headers.get('X-Cache') || 'UNKNOWN';
        const cascade = response.headers.get('X-Cache-Cascade') || '';

        // Store in cache (join with | to keep both pieces)
        const cacheValue = cascade ? `${source}|${cascade}` : source;
        tileCache.current.set(cacheKey, { source: cacheValue, timestamp: Date.now() });
        cleanOldCache();

        return { source, cascade };
      } catch (fetchErr) {
        clearTimeout(timeout);
        // Check if it was an abort or real error
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          // Timeout or abort - still got headers before abort
          const cacheVal = tileCache.current.get(cacheKey);
          if (cacheVal) {
            const parts = cacheVal.source.split('|');
            return { source: parts[0], cascade: parts[1] || '' };
          }
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('[TileSourceDebug] Failed to fetch tile source:', err);
      return { source: 'ERROR', cascade: '' };
    }
  };

  const handleMapMouseMove = async (e: any) => {
    if (!map) return;

    // Debounce: only check every 500ms
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const lngLat = e.lngLat;
        const zoom = Math.floor(map.getZoom());

        const tile = lngLatToTile(lngLat.lng, lngLat.lat, zoom);
        const { source, cascade } = await fetchTileSource(tile.z, tile.x, tile.y);

        // Determine color based on source
        const sourceColors: Record<string, string> = {
          'HIT': '✅ Redis HIT',
          'MAPTILER': '🌐 MapTiler',
          'AWS': '☁️ AWS Terrarium',
          'FALLBACK': '⚠️ Fallback',
          'EMERGENCY': '🚨 Emergency',
          'UNKNOWN': '❓ Unknown',
          'ERROR': '❌ Error',
        };

        const label = sourceColors[source] || source;

        // Parse cascade to show why it fell through
        let cascadeInfo = '';
        if (cascade) {
          const steps = cascade.split(',');
          cascadeInfo = `\n${steps.join(' → ')}`;
        }

        // Show toast (update last one instead of stacking)
        if (lastToastId.current) {
          toast.dismiss(lastToastId.current);
        }

        lastToastId.current = toast.info(
          `z:${tile.z} x:${tile.x} y:${tile.y}\n${label}${cascadeInfo}`,
          {
            duration: 3000,
            position: 'bottom-left',
            style: {
              minWidth: '320px',
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
            },
          }
        );
      } catch (err) {
        console.error('[TileSourceDebug] Error:', err);
      }
    }, 500);
  };

  useEffect(() => {
    if (!map || !isLoaded) return;

    map.on('mousemove', handleMapMouseMove);

    return () => {
      map.off('mousemove', handleMapMouseMove);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [map, isLoaded]);
}
