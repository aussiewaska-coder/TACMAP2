/**
 * Tile request queue for race condition prevention
 * Ensures only one fetch per tile is in-flight at a time
 */

// Map of in-flight requests: "z:x:y" -> Promise<Buffer | null>
const inFlightRequests = new Map<string, Promise<Buffer | null>>();

/**
 * Generate request key for deduplication
 */
function getRequestKey(z: number, x: number, y: number): string {
  return `${z}:${x}:${y}`;
}

/**
 * Fetch a tile with queue deduplication
 * If a request for the same tile is already in-flight, returns that promise
 * Otherwise, starts a new fetch and tracks it
 *
 * @param z - Zoom level
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param fetchFn - Function to actually fetch the tile
 * @returns Buffer or null
 */
export async function fetchTileWithQueue(
  z: number,
  x: number,
  y: number,
  fetchFn: () => Promise<Buffer | null>
): Promise<Buffer | null> {
  const key = getRequestKey(z, x, y);

  // Check for existing in-flight request
  const existing = inFlightRequests.get(key);
  if (existing) {
    console.log(`[TileQueue] Reusing in-flight request for ${key}`);
    return existing;
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      return await fetchFn();
    } finally {
      // Cleanup after 100ms delay to handle rapid retries
      setTimeout(() => {
        inFlightRequests.delete(key);
      }, 100);
    }
  })();

  // Track the request
  inFlightRequests.set(key, requestPromise);

  return requestPromise;
}

/**
 * Check if a request is currently in-flight
 */
export function isRequestInFlight(z: number, x: number, y: number): boolean {
  const key = getRequestKey(z, x, y);
  return inFlightRequests.has(key);
}

/**
 * Get count of in-flight requests (for metrics)
 */
export function getInFlightCount(): number {
  return inFlightRequests.size;
}

/**
 * Clear all in-flight requests (for testing/reset)
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}
