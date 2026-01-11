// mapUtils - Safe map operation utilities
// Prevents errors when map is destroyed before React cleanup runs

import type { MapInstance } from '@/types/mapEngine';

/**
 * Check if a map instance is valid and ready for operations
 * Returns false if map is null, undefined, or has been destroyed
 */
export function isMapValid(map: MapInstance | null | undefined): map is MapInstance {
    if (!map) return false;
    try {
        // getStyle() throws if map is destroyed
        return !!map.getStyle();
    } catch {
        return false;
    }
}

/**
 * Safely execute a map operation with fallback
 * Returns fallback value if map is invalid or operation throws
 */
export function safeMapOp<T>(
    map: MapInstance | null | undefined,
    operation: (m: MapInstance) => T,
    fallback: T
): T {
    if (!isMapValid(map)) return fallback;
    try {
        return operation(map);
    } catch {
        return fallback;
    }
}

/**
 * Safely remove a layer from the map
 * Does nothing if map is invalid or layer doesn't exist
 */
export function safeRemoveLayer(map: MapInstance | null | undefined, layerId: string): void {
    if (!isMapValid(map)) return;
    try {
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
    } catch {
        // Ignore - map may be in invalid state
    }
}

/**
 * Safely remove a source from the map
 * Does nothing if map is invalid or source doesn't exist
 */
export function safeRemoveSource(map: MapInstance | null | undefined, sourceId: string): void {
    if (!isMapValid(map)) return;
    try {
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    } catch {
        // Ignore - map may be in invalid state
    }
}

/**
 * Safely remove event listener from map
 * Does nothing if map is invalid
 */
export function safeOffEvent(
    map: MapInstance | null | undefined,
    event: string,
    handler: (...args: unknown[]) => void
): void {
    if (!isMapValid(map)) return;
    try {
        map.off(event as never, handler as never);
    } catch {
        // Ignore - map may be in invalid state
    }
}
