/**
 * MapTiler Style Interceptor
 * Rewrites tile source URLs from api.maptiler.com → /api/tiles/[z]/[x]/[y]
 * This forces the map to use the Redis-backed tile proxy instead of hitting MapTiler directly
 */

interface TileSource {
  type: 'raster' | 'vector' | 'geojson' | 'image' | 'video';
  url?: string;
  tiles?: string[];
  [key: string]: any;
}

interface MapStyle {
  sources?: Record<string, TileSource>;
  [key: string]: any;
}

/**
 * Rewrite tile URLs to use local Redis-backed proxy
 * Converts: https://api.maptiler.com/maps/{styleId}/256/{z}/{x}/{y}.png?key={apiKey}
 * To:       /api/tiles/{z}/{x}/{y}
 */
function rewriteTileUrl(url: string): string {
  // Match MapTiler tile URLs
  // https://api.maptiler.com/maps/{styleId}/256/{z}/{x}/{y}.png?key={apiKey}
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|webp)/);
  if (match) {
    const [, z, x, y, ext] = match;
    return `/api/tiles/${z}/${x}/${y}`;
  }
  return url;
}

/**
 * Intercept and rewrite MapTiler style to use local tile proxy
 */
export async function interceptStyle(styleUrl: string): Promise<MapStyle> {
  try {
    console.log('[StyleInterceptor] Fetching style:', styleUrl);

    const response = await fetch(styleUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.status}`);
    }

    const style: MapStyle = await response.json();

    // Rewrite all tile sources
    if (style.sources) {
      for (const [sourceId, source] of Object.entries(style.sources)) {
        if (source.type === 'raster' || source.type === 'vector') {
          // Rewrite tiles array (for vector/raster sources)
          if (Array.isArray(source.tiles)) {
            console.log(`[StyleInterceptor] Rewriting source: ${sourceId} (${source.tiles.length} tiles)`);
            source.tiles = source.tiles.map(tile => {
              const rewritten = rewriteTileUrl(tile);
              if (rewritten !== tile) {
                console.log(`  ${tile} → ${rewritten}`);
              }
              return rewritten;
            });
          }

          // Rewrite url (for single source)
          if (source.url) {
            source.url = rewriteTileUrl(source.url);
          }
        }
      }
    }

    console.log('[StyleInterceptor] Style rewritten, using Redis proxy for tiles');

    // Return as blob URL so MapTiler can use it
    const blob = new Blob([JSON.stringify(style)], { type: 'application/json' });
    return style;
  } catch (err) {
    console.error('[StyleInterceptor] Error:', err);
    throw err;
  }
}

/**
 * Fetch and rewrite style to use Redis tile proxy
 * Returns the style object directly (MapTiler SDK accepts objects)
 */
export async function getRedisProxiedStyle(styleId: string): Promise<MapStyle> {
  try {
    // Fetch style directly from MapTiler API
    // Let MapTiler SDK handle sprites, fonts, etc normally
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_MAPTILER_API_KEY not configured');
    }

    // Fetch directly from MapTiler - no proxy for style itself
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`;

    console.log('[StyleInterceptor] Fetching style directly from MapTiler');
    const response = await fetch(styleUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.status}`);
    }

    const style: MapStyle = await response.json();

    // ONLY rewrite tile URLs to use Redis-backed /api/tiles proxy
    // Leave sprites, fonts, tilejson alone - let SDK fetch normally
    if (style.sources) {
      for (const [sourceId, source] of Object.entries(style.sources)) {
        if (source.type === 'raster' || source.type === 'vector') {
          if (Array.isArray(source.tiles)) {
            source.tiles = source.tiles.map(tile => {
              const rewritten = rewriteTileUrl(tile);
              console.log(`[StyleInterceptor] Rewrite tile: ${tile.substring(0, 80)}... → ${rewritten}`);
              return rewritten;
            });
          }
          // Don't rewrite TileJSON URLs - let them go to MapTiler
          // if (source.url) {
          //   const rewritten = rewriteTileUrl(source.url);
          //   console.log(`[StyleInterceptor] Rewrite source URL: ${source.url} → ${rewritten}`);
          //   source.url = rewritten;
          // }
        }
      }
    }

    console.log('[StyleInterceptor] ✓ Tile URLs rewritten to use Redis proxy');
    return style;
  } catch (err) {
    console.error('[StyleInterceptor] Failed to fetch style:', err);
    throw err;
  }
}
