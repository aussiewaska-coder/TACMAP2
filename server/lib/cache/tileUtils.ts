export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export function latLonToTile(lat: number, lon: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom);
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));

  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = clampedLat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

  return {
    z: zoom,
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

export function getTilesInRadius(center: TileCoord, radius: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  const maxTile = Math.pow(2, center.z) - 1;

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = center.x + dx;
      const y = center.y + dy;

      if (x >= 0 && x <= maxTile && y >= 0 && y <= maxTile) {
        tiles.push({ z: center.z, x, y });
      }
    }
  }

  return tiles;
}
