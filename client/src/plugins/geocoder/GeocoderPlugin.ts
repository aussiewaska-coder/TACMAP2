// Geocoder Plugin - Location search using Photon (OSM-based, free, open source)
// https://photon.komoot.io/

import type { Map as MapLibreGLMap } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { eventBus } from '@/events/EventBus';

export interface GeocoderResult {
    id: string;
    name: string;
    displayName: string;
    coordinates: [number, number]; // [lng, lat]
    type: string;
    country?: string;
    state?: string;
    city?: string;
}

export interface GeocoderPluginConfig extends PluginConfig {
    /** API endpoint - default is Photon */
    endpoint?: string;
    /** Limit results */
    limit?: number;
    /** Bias towards location [lng, lat] */
    biasLocation?: [number, number];
    /** Language for results */
    lang?: string;
    /** Country filter (ISO 3166-1 alpha-2) */
    countryFilter?: string;
}

const DEFAULT_ENDPOINT = 'https://photon.komoot.io/api';

/**
 * Geocoder Plugin using Photon API
 * Free, open-source, based on OpenStreetMap data
 */
class GeocoderPluginInstance implements PluginInstance {
    id = 'geocoder';
    private map: MapLibreGLMap;
    private config: GeocoderPluginConfig;
    private abortController: AbortController | null = null;

    constructor(map: MapLibreGLMap, config: GeocoderPluginConfig) {
        this.map = map;
        this.config = {
            endpoint: DEFAULT_ENDPOINT,
            limit: 5,
            lang: 'en',
            // Bias towards Australia
            biasLocation: [133.7751, -25.2744],
            ...config,
        };
    }

    /**
     * Search for locations
     */
    async search(query: string): Promise<GeocoderResult[]> {
        if (!query || query.length < 2) {
            return [];
        }

        // Cancel any pending request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            const params = new URLSearchParams({
                q: query,
                limit: String(this.config.limit || 5),
                lang: this.config.lang || 'en',
            });

            // Add location bias
            if (this.config.biasLocation) {
                params.set('lon', String(this.config.biasLocation[0]));
                params.set('lat', String(this.config.biasLocation[1]));
            }

            const response = await fetch(
                `${this.config.endpoint}?${params.toString()}`,
                { signal: this.abortController.signal }
            );

            if (!response.ok) {
                throw new Error(`Geocoder error: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform Photon response to our format
            const results: GeocoderResult[] = data.features.map((feature: any, index: number) => {
                const props = feature.properties;
                const coords = feature.geometry.coordinates;

                // Build display name
                const parts = [props.name];
                if (props.city && props.city !== props.name) parts.push(props.city);
                if (props.state) parts.push(props.state);
                if (props.country) parts.push(props.country);

                return {
                    id: `photon-${index}-${Date.now()}`,
                    name: props.name || 'Unknown',
                    displayName: parts.filter(Boolean).join(', '),
                    coordinates: [coords[0], coords[1]] as [number, number],
                    type: props.osm_value || props.type || 'place',
                    country: props.country,
                    state: props.state,
                    city: props.city,
                };
            });

            // Filter by country if configured
            if (this.config.countryFilter) {
                return results.filter(
                    r => r.country?.toLowerCase() === this.config.countryFilter?.toLowerCase()
                );
            }

            return results;

        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return []; // Request was cancelled
            }
            console.error('[GeocoderPlugin] Search error:', error);
            throw error;
        }
    }

    /**
     * Reverse geocode - get address from coordinates
     */
    async reverse(lng: number, lat: number): Promise<GeocoderResult | null> {
        try {
            const params = new URLSearchParams({
                lon: String(lng),
                lat: String(lat),
                lang: this.config.lang || 'en',
            });

            const response = await fetch(
                `${this.config.endpoint}/reverse?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error(`Reverse geocode error: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                return null;
            }

            const feature = data.features[0];
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            const parts = [props.name];
            if (props.city) parts.push(props.city);
            if (props.state) parts.push(props.state);
            if (props.country) parts.push(props.country);

            return {
                id: `reverse-${Date.now()}`,
                name: props.name || 'Unknown',
                displayName: parts.filter(Boolean).join(', '),
                coordinates: [coords[0], coords[1]],
                type: props.osm_value || 'place',
                country: props.country,
                state: props.state,
                city: props.city,
            };

        } catch (error) {
            console.error('[GeocoderPlugin] Reverse geocode error:', error);
            return null;
        }
    }

    /**
     * Fly to a search result
     */
    flyToResult(result: GeocoderResult, zoom = 14): void {
        this.map.flyTo({
            center: result.coordinates,
            zoom,
            pitch: 60,
            duration: 2500,
        });

        eventBus.emit('navigation:flyto:start', { location: result.displayName });
    }

    updateConfig(config: PluginConfig): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
}

// Export plugin definition
export const geocoderPlugin = definePlugin({
    id: 'geocoder',
    name: 'Geocoder',
    description: 'Location search using Photon (OpenStreetMap)',
    category: 'tools',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        endpoint: DEFAULT_ENDPOINT,
        limit: 5,
        lang: 'en',
        biasLocation: [133.7751, -25.2744], // Australia
    },
    initialize: async (map, config) => {
        return new GeocoderPluginInstance(map, config as GeocoderPluginConfig);
    },
});

export { GeocoderPluginInstance };
