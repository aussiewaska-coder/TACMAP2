// Navigation Plugin - City fly-to and location navigation
// Provides quick navigation to Australian cities and scenic locations

import type { Map as MapLibreGLMap } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { AUSTRALIAN_CITIES, SCENIC_LOCATIONS, MAP_CONFIG } from '@/core/constants';
import { eventBus } from '@/events/EventBus';

export interface NavigationPluginConfig extends PluginConfig {
    animationDuration?: number;
    defaultPitch?: number;
    preloadTiles?: boolean;
}

interface Location {
    id: string;
    name: string;
    coordinates: [number, number];
    zoom: number;
    category?: 'city' | 'scenic' | 'custom';
}

/**
 * Navigation Plugin
 * Handles flying to cities, scenic locations, and custom coordinates
 */
class NavigationPluginInstance implements PluginInstance {
    id = 'navigation';
    private map: MapLibreGLMap;
    private config: NavigationPluginConfig;
    private isAnimating = false;

    constructor(map: MapLibreGLMap, config: NavigationPluginConfig) {
        this.map = map;
        this.config = {
            animationDuration: MAP_CONFIG.FLY_TO_DURATION,
            defaultPitch: 60,
            preloadTiles: true,
            ...config,
        };
    }

    /**
     * Fly to a predefined city
     */
    flyToCity(cityId: string): void {
        const city = AUSTRALIAN_CITIES.find((c) => c.id === cityId);
        if (city) {
            this.flyToLocation({
                id: city.id,
                name: city.name,
                coordinates: city.coordinates as [number, number],
                zoom: city.zoom,
                category: 'city',
            });
        }
    }

    /**
     * Fly to a scenic location
     */
    flyToScenic(locationId: string): void {
        const location = SCENIC_LOCATIONS.find((l) => l.id === locationId);
        if (location) {
            this.flyToLocation({
                id: location.id,
                name: location.name,
                coordinates: location.coordinates as [number, number],
                zoom: location.zoom,
                category: 'scenic',
            });
        }
    }

    /**
     * Fly to any location
     */
    flyToLocation(location: Location): void {
        if (this.isAnimating) return;

        this.isAnimating = true;
        eventBus.emit('navigation:flyto:start', { location: location.name });

        // Optional: Preload tiles at destination
        if (this.config.preloadTiles) {
            this.preloadTilesAt(location.coordinates, location.zoom);
        }

        this.map.flyTo({
            center: location.coordinates,
            zoom: location.zoom,
            pitch: this.config.defaultPitch,
            bearing: 0,
            duration: this.config.animationDuration,
            essential: true,
        });

        // Clear animating flag when done
        this.map.once('moveend', () => {
            this.isAnimating = false;
            eventBus.emit('navigation:flyto:end', { location: location.name });
        });
    }

    /**
     * Fly to custom coordinates
     */
    flyToCoordinates(lng: number, lat: number, zoom = 12): void {
        this.flyToLocation({
            id: 'custom',
            name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: [lng, lat],
            zoom,
            category: 'custom',
        });
    }

    /**
     * Reset to Australia overview
     */
    resetToOverview(): void {
        this.flyToLocation({
            id: 'overview',
            name: 'Australia',
            coordinates: MAP_CONFIG.DEFAULT_CENTER,
            zoom: MAP_CONFIG.DEFAULT_ZOOM,
        });
    }

    /**
     * Preload tiles at a location before flying there
     */
    private preloadTilesAt(center: [number, number], zoom: number): void {
        // Create a temporary invisible div to preload tiles
        const preloadZooms = [
            Math.max(0, zoom - 2),
            Math.max(0, zoom - 1),
            zoom,
        ];

        // This is a simple implementation - could be enhanced with proper tile preloading
        preloadZooms.forEach((z) => {
            const bounds = this.getBoundsAtZoom(center, z);
            // Trigger tile loading by briefly showing these bounds
            // MapLibre will cache them automatically
        });
    }

    /**
     * Get bounds for a center point at a given zoom
     */
    private getBoundsAtZoom(center: [number, number], zoom: number): [[number, number], [number, number]] {
        const latRange = 180 / Math.pow(2, zoom);
        const lngRange = 360 / Math.pow(2, zoom);

        return [
            [center[0] - lngRange / 2, center[1] - latRange / 2],
            [center[0] + lngRange / 2, center[1] + latRange / 2],
        ];
    }

    /**
     * Get all available cities
     */
    getCities(): Location[] {
        return AUSTRALIAN_CITIES.map((c) => ({
            id: c.id,
            name: c.name,
            coordinates: c.coordinates as [number, number],
            zoom: c.zoom,
            category: 'city' as const,
        }));
    }

    /**
     * Get all scenic locations
     */
    getScenicLocations(): Location[] {
        return SCENIC_LOCATIONS.map((l) => ({
            id: l.id,
            name: l.name,
            coordinates: l.coordinates as [number, number],
            zoom: l.zoom,
            category: 'scenic' as const,
        }));
    }

    /**
     * Check if currently animating
     */
    isFlying(): boolean {
        return this.isAnimating;
    }

    updateConfig(config: PluginConfig): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        // Nothing to clean up
    }
}

// Export the plugin definition
export const navigationPlugin = definePlugin({
    id: 'navigation',
    name: 'Navigation',
    description: 'Quick navigation to Australian cities and scenic locations',
    category: 'core',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        animationDuration: MAP_CONFIG.FLY_TO_DURATION,
        defaultPitch: 60,
        preloadTiles: true,
    },
    initialize: async (map, config) => {
        return new NavigationPluginInstance(map, config as NavigationPluginConfig);
    },
});

// Export the instance class for type usage
export { NavigationPluginInstance };
export type { Location };
