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
 * Fetch and cache the rewritten style as JSON
 * This bypasses MapTiler's style loading and uses our Redis proxy
 */
export async function getRedisProxiedStyle(styleId: string): Promise<string> {
  try {
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`;

    const response = await fetch(styleUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.status}`);
    }

    const style: MapStyle = await response.json();

    // Rewrite all tile sources to use /api/tiles proxy
    if (style.sources) {
      for (const [sourceId, source] of Object.entries(style.sources)) {
        if (source.type === 'raster' || source.type === 'vector') {
          if (Array.isArray(source.tiles)) {
            source.tiles = source.tiles.map(tile => rewriteTileUrl(tile));
          }
          if (source.url) {
            source.url = rewriteTileUrl(source.url);
          }
        }
      }
    }

    // Return as data URL
    const dataUrl = `data:application/json;base64,${btoa(JSON.stringify(style))}`;
    console.log('[StyleInterceptor] Style rewritten with Redis proxy URLs');
    return dataUrl;
  } catch (err) {
    console.error('[StyleInterceptor] Failed to rewrite style:', err);
    throw err;
  }
}
