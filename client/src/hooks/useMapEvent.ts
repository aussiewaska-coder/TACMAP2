// useMapEvent hook - Subscribe to map events with automatic cleanup

import { useEffect, useRef } from 'react';
import type { MapInstance } from '@/types/mapEngine';
import { useMapStore } from '@/stores';

type MapEventHandler = (event: unknown) => void;

/**
 * Hook to subscribe to MapLibre map events
 * Automatically handles cleanup on unmount or when map changes
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useMapEvent('click', (e) => {
 *     console.log('Map clicked at:', e.lngLat);
 *   });
 *   
 *   useMapEvent('moveend', () => {
 *     console.log('Map finished moving');
 *   });
 *   
 *   return null;
 * }
 * ```
 */
export function useMapEvent(
    eventType: string,
    handler: MapEventHandler,
    dependencies: unknown[] = []
): void {
    const map = useMapStore((state) => state.map);
    const handlerRef = useRef(handler);

    // Keep handler ref up to date
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!map) return;

        const eventHandler = (event: unknown) => {
            handlerRef.current(event);
        };

        // Use string type for event - MapLibre accepts string event names
        map.on(eventType as never, eventHandler as never);

        return () => {
            map.off(eventType as never, eventHandler as never);
        };
    }, [map, eventType, ...dependencies]);
}

/**
 * Hook to subscribe to map events only once
 */
export function useMapEventOnce(
    eventType: string,
    handler: MapEventHandler
): void {
    const map = useMapStore((state) => state.map);
    const hasRun = useRef(false);

    useEffect(() => {
        if (!map || hasRun.current) return;

        const eventHandler = (event: unknown) => {
            if (!hasRun.current) {
                hasRun.current = true;
                handler(event);
            }
        };

        map.once(eventType as never, eventHandler as never);

        return () => {
            map.off(eventType as never, eventHandler as never);
        };
    }, [map, eventType, handler]);
}

/**
 * Hook to get map instance directly
 * Prefer using useMapStore selectors for specific state
 */
export function useMapInstance(): MapInstance | null {
    return useMapStore((state) => state.map);
}

/**
 * Hook that runs callback when map is loaded
 */
export function useOnMapLoad(callback: (map: MapInstance) => void): void {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);
    const hasRun = useRef(false);

    useEffect(() => {
        if (map && isLoaded && !hasRun.current) {
            hasRun.current = true;
            callback(map);
        }
    }, [map, isLoaded, callback]);
}
