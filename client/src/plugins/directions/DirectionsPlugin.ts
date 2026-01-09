// Directions Plugin - Route calculation using OSRM (free, open source)
// https://project-osrm.org/

import type { Map as MapLibreGLMap, GeoJSONSource } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { eventBus } from '@/events/EventBus';
import { isMapValid, safeRemoveLayer, safeRemoveSource } from '@/utils/mapUtils';

export interface RouteStep {
    instruction: string;
    distance: number; // meters
    duration: number; // seconds
    name: string;
}

export interface Route {
    distance: number; // meters
    duration: number; // seconds
    geometry: GeoJSON.LineString;
    steps: RouteStep[];
}

export interface DirectionsResult {
    routes: Route[];
    waypoints: Array<{
        name: string;
        location: [number, number];
    }>;
}

export interface DirectionsPluginConfig extends PluginConfig {
    /** OSRM endpoint */
    endpoint?: string;
    /** Profile: driving, walking, cycling */
    profile?: 'driving' | 'walking' | 'cycling';
    /** Show route on map */
    showRoute?: boolean;
    /** Route line color */
    routeColor?: string;
    /** Route line width */
    routeWidth?: number;
}

const DEFAULT_ENDPOINT = 'https://router.project-osrm.org/route/v1';

/**
 * Directions Plugin using OSRM
 * Free, open-source routing based on OpenStreetMap
 */
class DirectionsPluginInstance implements PluginInstance {
    id = 'directions';
    private map: MapLibreGLMap;
    private config: DirectionsPluginConfig;
    private sourceId = 'directions-route';
    private layerId = 'directions-route-layer';

    constructor(map: MapLibreGLMap, config: DirectionsPluginConfig) {
        this.map = map;
        this.config = {
            endpoint: DEFAULT_ENDPOINT,
            profile: 'driving',
            showRoute: true,
            routeColor: '#3b82f6',
            routeWidth: 5,
            ...config,
        };

        this.initializeLayers();
    }

    /**
     * Initialize map layers for route display
     */
    private initializeLayers(): void {
        if (!this.map.loaded()) {
            this.map.once('load', () => this.initializeLayers());
            return;
        }

        // Add source for route
        if (!this.map.getSource(this.sourceId)) {
            this.map.addSource(this.sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [],
                },
            });
        }

        // Add route layer
        if (!this.map.getLayer(this.layerId)) {
            this.map.addLayer({
                id: this.layerId,
                type: 'line',
                source: this.sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': this.config.routeColor || '#3b82f6',
                    'line-width': this.config.routeWidth || 5,
                    'line-opacity': 0.8,
                },
            });
        }
    }

    /**
     * Get directions between two or more points
     */
    async getRoute(
        waypoints: Array<[number, number]>, // Array of [lng, lat]
        options?: { profile?: 'driving' | 'walking' | 'cycling' }
    ): Promise<DirectionsResult | null> {
        if (waypoints.length < 2) {
            throw new Error('At least 2 waypoints required');
        }

        const profile = options?.profile || this.config.profile || 'driving';

        // Build coordinates string: lng,lat;lng,lat;...
        const coords = waypoints.map(wp => `${wp[0]},${wp[1]}`).join(';');

        try {
            const url = `${this.config.endpoint}/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`OSRM error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                console.warn('[DirectionsPlugin] No route found');
                return null;
            }

            const result: DirectionsResult = {
                routes: data.routes.map((route: any) => ({
                    distance: route.distance,
                    duration: route.duration,
                    geometry: route.geometry,
                    steps: route.legs.flatMap((leg: any) =>
                        leg.steps.map((step: any) => ({
                            instruction: step.maneuver.instruction || this.buildInstruction(step.maneuver),
                            distance: step.distance,
                            duration: step.duration,
                            name: step.name || 'Unnamed road',
                        }))
                    ),
                })),
                waypoints: data.waypoints.map((wp: any) => ({
                    name: wp.name || 'Waypoint',
                    location: wp.location as [number, number],
                })),
            };

            // Display route on map if enabled
            if (this.config.showRoute && result.routes.length > 0) {
                this.displayRoute(result.routes[0]);
            }

            return result;

        } catch (error) {
            console.error('[DirectionsPlugin] Route error:', error);
            throw error;
        }
    }

    /**
     * Build instruction from maneuver
     */
    private buildInstruction(maneuver: any): string {
        const type = maneuver.type || 'continue';
        const modifier = maneuver.modifier || '';

        const instructions: Record<string, string> = {
            'turn-left': 'Turn left',
            'turn-right': 'Turn right',
            'turn-sharp-left': 'Turn sharp left',
            'turn-sharp-right': 'Turn sharp right',
            'turn-slight-left': 'Turn slight left',
            'turn-slight-right': 'Turn slight right',
            'continue': 'Continue straight',
            'depart': 'Start',
            'arrive': 'Arrive at destination',
            'roundabout': `Take the roundabout`,
            'merge': 'Merge',
            'fork-left': 'Keep left at fork',
            'fork-right': 'Keep right at fork',
        };

        return instructions[`${type}-${modifier}`] || instructions[type] || `${type} ${modifier}`.trim();
    }

    /**
     * Display route on map
     */
    private displayRoute(route: Route): void {
        if (!isMapValid(this.map)) return;
        try {
            const source = this.map.getSource(this.sourceId) as GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry,
                });
            }

            // Fit bounds to route
            const coords = route.geometry.coordinates as [number, number][];
            if (coords.length > 0) {
                const bounds = coords.reduce(
                    (bounds, coord) => bounds.extend(coord),
                    new maplibregl.LngLatBounds(coords[0], coords[0])
                );

                this.map.fitBounds(bounds, {
                    padding: 50,
                    duration: 1000,
                });
            }
        } catch {
            // Ignore errors if map is destroyed
        }
    }

    /**
     * Clear the current route from the map
     */
    clearRoute(): void {
        if (!isMapValid(this.map)) return;
        try {
            const source = this.map.getSource(this.sourceId) as GeoJSONSource;
            if (source) {
                source.setData({
                    type: 'FeatureCollection',
                    features: [],
                });
            }
        } catch {
            // Ignore errors if map is destroyed
        }
    }

    /**
     * Format distance for display
     */
    formatDistance(meters: number): string {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    }

    /**
     * Format duration for display
     */
    formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    }

    updateConfig(config: PluginConfig): void {
        this.config = { ...this.config, ...config };

        // Update layer style if needed
        if (!isMapValid(this.map)) return;
        try {
            if (this.map.getLayer(this.layerId)) {
                if (config.routeColor) {
                    this.map.setPaintProperty(this.layerId, 'line-color', config.routeColor);
                }
                if (config.routeWidth) {
                    this.map.setPaintProperty(this.layerId, 'line-width', config.routeWidth);
                }
            }
        } catch {
            // Ignore errors if map is destroyed
        }
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        this.clearRoute();

        // Use safe utilities to avoid errors if map is already destroyed
        safeRemoveLayer(this.map, this.layerId);
        safeRemoveSource(this.map, this.sourceId);
    }
}

// Need to import maplibregl for LngLatBounds
import maplibregl from 'maplibre-gl';

// Export plugin definition
export const directionsPlugin = definePlugin({
    id: 'directions',
    name: 'Directions',
    description: 'Route calculation using OSRM (OpenStreetMap)',
    category: 'tools',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        endpoint: DEFAULT_ENDPOINT,
        profile: 'driving',
        showRoute: true,
        routeColor: '#3b82f6',
        routeWidth: 5,
    },
    initialize: async (map, config) => {
        return new DirectionsPluginInstance(map, config as DirectionsPluginConfig);
    },
});

export { DirectionsPluginInstance };
