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

  const fetchTileSource = async (z: number, x: number, y: number): Promise<string> => {
    const cacheKey = `${z}:${x}:${y}`;
    const cached = tileCache.current.get(cacheKey);

    // Return cached value if fresh (less than 60 seconds old)
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.source;
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

        // Store in cache
        tileCache.current.set(cacheKey, { source, timestamp: Date.now() });
        cleanOldCache();

        return source;
      } catch (fetchErr) {
        clearTimeout(timeout);
        // Check if it was an abort or real error
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          // Timeout or abort - still got headers before abort
          const cacheVal = tileCache.current.get(cacheKey);
          if (cacheVal) return cacheVal.source;
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('[TileSourceDebug] Failed to fetch tile source:', err);
      return 'ERROR';
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
        const source = await fetchTileSource(tile.z, tile.x, tile.y);

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

        // Show toast (update last one instead of stacking)
        if (lastToastId.current) {
          toast.dismiss(lastToastId.current);
        }

        lastToastId.current = toast.info(
          `z:${tile.z} x:${tile.x} y:${tile.y}\n${label}`,
          {
            duration: 2000,
            position: 'bottom-left',
            style: {
              minWidth: '280px',
              whiteSpace: 'pre-wrap',
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
