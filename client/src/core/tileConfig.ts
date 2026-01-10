export const TILE_CONFIG = {
  primary: '/api/tiles/{z}/{x}/{y}',
  bounds: { minLat: -45, maxLat: -10, minLon: 110, maxLon: 155 },
  tileSize: 256,
  maxCacheZoom: 14,
} as const;
