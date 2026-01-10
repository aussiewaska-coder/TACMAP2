// Map store - Shared state for the MapTiler SDK map instance and view state
// This store is SHARED between mobile and desktop views

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Map as MapTilerMap } from '@maptiler/sdk';
import { MAP_CONFIG } from '@/core/constants';
import { eventBus } from '@/events/EventBus';

interface MapState {
    // Map instance
    map: MapTilerMap | null;
    isLoaded: boolean;
    isInitializing: boolean;
    error: Error | null;

    // View state (camera)
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;

    // Terrain state
    terrainEnabled: boolean;
    terrainExaggeration: number;

    // Actions
    setMap: (map: MapTilerMap | null) => void;
    setLoaded: (loaded: boolean) => void;
    setInitializing: (initializing: boolean) => void;
    setError: (error: Error | null) => void;

    // View actions
    updateViewState: () => void;
    flyTo: (center: [number, number], zoom?: number, options?: Partial<FlyToOptions>) => void;
    easeTo: (options: EaseToOptions) => void;
    resetView: () => void;

    // Terrain actions
    setTerrainEnabled: (enabled: boolean) => void;
    setTerrainExaggeration: (exaggeration: number) => void;
}

interface FlyToOptions {
    pitch: number;
    bearing: number;
    duration: number;
}

interface EaseToOptions {
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
}

export const useMapStore = create<MapState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        map: null,
        isLoaded: false,
        isInitializing: false,
        error: null,

        center: MAP_CONFIG.DEFAULT_CENTER,
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
        pitch: MAP_CONFIG.DEFAULT_PITCH,
        bearing: MAP_CONFIG.DEFAULT_BEARING,

        terrainEnabled: true,
        terrainExaggeration: MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,

        // Map instance actions
        setMap: (map) => set({ map }),
        setLoaded: (isLoaded) => {
            set({ isLoaded });
            if (isLoaded) {
                eventBus.emit('map:load', { map: get().map });
            }
        },
        setInitializing: (isInitializing) => set({ isInitializing }),
        setError: (error) => {
            set({ error });
            if (error) {
                eventBus.emit('map:error', { error });
            }
        },

        // View state actions
        updateViewState: () => {
            const { map } = get();
            if (!map) return;

            const center = map.getCenter();
            set({
                center: [center.lng, center.lat],
                zoom: map.getZoom(),
                pitch: map.getPitch(),
                bearing: map.getBearing(),
            });
        },

        flyTo: (center, zoom = 12, options = {}) => {
            const { map } = get();
            if (!map) return;

            const {
                pitch = 60,
                bearing = 0,
                duration = MAP_CONFIG.FLY_TO_DURATION,
            } = options;

            map.flyTo({
                center,
                zoom,
                pitch,
                bearing,
                duration,
                essential: true,
            });
        },

        easeTo: (options) => {
            const { map } = get();
            if (!map) return;

            map.easeTo({
                ...options,
                duration: options.duration ?? MAP_CONFIG.EASE_TO_DURATION,
            });
        },

        resetView: () => {
            const { flyTo } = get();
            flyTo(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM, {
                pitch: MAP_CONFIG.DEFAULT_PITCH,
                bearing: MAP_CONFIG.DEFAULT_BEARING,
                duration: 2000,
            });
        },

        // Terrain actions
        setTerrainEnabled: (enabled) => {
            const { map, terrainExaggeration } = get();
            set({ terrainEnabled: enabled });

            if (map && map.loaded()) {
                if (enabled) {
                    try {
                        if (map.getSource('terrain-source')) {
                            map.setTerrain({
                                source: 'terrain-source',
                                exaggeration: terrainExaggeration,
                            });
                        }
                    } catch (error) {
                        console.warn('Failed to enable terrain:', error);
                    }
                } else {
                    try {
                        map.setTerrain(null);
                    } catch (error) {
                        console.warn('Failed to disable terrain:', error);
                    }
                }
            }
        },

        setTerrainExaggeration: (exaggeration) => {
            const { map, terrainEnabled } = get();
            const clampedValue = Math.max(
                MAP_CONFIG.TERRAIN.MIN_EXAGGERATION,
                Math.min(MAP_CONFIG.TERRAIN.MAX_EXAGGERATION, exaggeration)
            );

            set({ terrainExaggeration: clampedValue });

            if (map && map.loaded() && terrainEnabled) {
                try {
                    if (map.getSource('terrain-source')) {
                        map.setTerrain({
                            source: 'terrain-source',
                            exaggeration: clampedValue,
                        });
                    }
                } catch (error) {
                    console.warn('Failed to update terrain exaggeration:', error);
                }
            }
        },
    }))
);

// Selector hooks for performance optimization
export const useMap = () => useMapStore((state) => state.map);
export const useMapLoaded = () => useMapStore((state) => state.isLoaded);
export const useViewState = () => useMapStore((state) => ({
    center: state.center,
    zoom: state.zoom,
    pitch: state.pitch,
    bearing: state.bearing,
}));
export const useTerrainState = () => useMapStore((state) => ({
    enabled: state.terrainEnabled,
    exaggeration: state.terrainExaggeration,
}));
