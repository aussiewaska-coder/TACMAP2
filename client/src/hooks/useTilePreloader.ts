import { useEffect } from 'react';
import { useMapStore } from '@/stores/mapStore';

/**
 * Preload tiles for current viewport to eliminate jankiness
 * Only preloads during idle time to avoid animating during flight/orbit modes
 */
export function useTilePreloader() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Don't preload during animations - it causes jank with flight/orbit animations
    // Check if map is moving by monitoring move events
    let isAnimating = false;
    let animationTimeout: ReturnType<typeof setTimeout> | null = null;

    const onMapMove = () => {
      isAnimating = true;
      // Clear pending preload if animating
      if (animationTimeout) clearTimeout(animationTimeout);
      // Set timeout to resume preloading after animation stops (500ms idle)
      animationTimeout = setTimeout(() => {
        isAnimating = false;
      }, 500);
    };

    map.on('move', onMapMove);

    const preloadTiles = async () => {
      // Skip if currently animating
      if (isAnimating) {
        console.log('[TilePreloader] Skipping during animation');
        return;
      }

      try {
        const bounds = map.getBounds();
        const zoom = Math.floor(map.getZoom());

        // Calculate tile coordinates for current viewport
        const tiles = getTilesInBounds(bounds, zoom);

        console.log(`[TilePreloader] Preloading ${tiles.length} tiles for zoom ${zoom}`);

        // Fetch tiles with 1 per frame to avoid blocking animation
        for (const [z, x, y] of tiles) {
          if (isAnimating) break; // Stop if animation starts
          fetch(`/api/tiles/${z}/${x}/${y}?format=pbf`).catch(() => {});
          // Small delay between requests to not block
          await new Promise(r => setTimeout(r, 5));
        }

        console.log(`[TilePreloader] ✅ Preload complete`);
      } catch (err) {
        console.warn('[TilePreloader] Error:', err);
      }
    };

    // Preload after map is idle (no animation)
    const timeout = setTimeout(() => {
      preloadTiles();
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (animationTimeout) clearTimeout(animationTimeout);
      map.off('move', onMapMove);
    };
  }, [map, isLoaded]);
}

/**
 * Get all tile coordinates visible in bounds at given zoom level
 * Includes 1-tile buffer around viewport
 */
function getTilesInBounds(
  bounds: { _sw: { lng: number; lat: number }; _ne: { lng: number; lat: number } },
  zoom: number
): Array<[number, number, number]> {
  const tiles: Array<[number, number, number]> = [];
  const maxTile = Math.pow(2, zoom);

  // Web Mercator projection
  const lngToTile = (lng: number) => {
    return Math.floor(((lng + 180) / 360) * maxTile);
  };

  const latToTile = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    const y = Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI);
    return Math.floor((1 - y) / 2 * maxTile);
  };

  // Get tile coordinates for bounds
  const minX = Math.max(0, lngToTile(bounds._sw.lng) - 1);
  const maxX = Math.min(maxTile - 1, lngToTile(bounds._ne.lng) + 1);
  const minY = Math.max(0, latToTile(bounds._ne.lat) - 1);
  const maxY = Math.min(maxTile - 1, latToTile(bounds._sw.lat) + 1);

  // Generate tile coordinates
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push([zoom, x, y]);
    }
  }

  return tiles;
}
