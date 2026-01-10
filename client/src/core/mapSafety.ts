export const FALLBACK_TILE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
export function isMapHealthy(map: unknown): boolean {
  if (!map) return false;
  return typeof (map as any).getCenter === 'function' && typeof (map as any).getZoom === 'function';
}
export async function safeMapOperation<T>(operation: () => Promise<T>, fallback: T, name: string): Promise<T> {
  try { return await operation(); } catch (e) { console.error(`[MapSafety] ${name} failed:`, e); return fallback; }
}
export function getTileUrl(z: number, x: number, y: number): string { return `/api/tiles/${z}/${x}/${y}`; }
