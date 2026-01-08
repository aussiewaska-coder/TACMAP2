// Weather Plugin - Rain radar overlay using BOM (Bureau of Meteorology) Australia
// Free radar imagery with animation support

import type { Map as MapLibreGLMap } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';

export interface WeatherPluginConfig extends PluginConfig {
    /** Auto-refresh interval in ms (0 = disabled) */
    refreshInterval?: number;
    /** Radar opacity (0-1) */
    opacity?: number;
    /** Show animation controls */
    showControls?: boolean;
}

// BOM Radar image URLs (free, no API key needed)
// These are the publicly accessible rain radar composite images
const BOM_RADAR_URLS = {
    // National composite (Australia-wide)
    national: 'https://www.bom.gov.au/radar/radar.national.gif',
    // IDR files by region
    sydney: 'https://www.bom.gov.au/radar/IDR714.gif',
    melbourne: 'https://www.bom.gov.au/radar/IDR024.gif',
    brisbane: 'https://www.bom.gov.au/radar/IDR664.gif',
    perth: 'https://www.bom.gov.au/radar/IDR703.gif',
    adelaide: 'https://www.bom.gov.au/radar/IDR644.gif',
};

// Radar bounds for overlay positioning
const AUSTRALIA_BOUNDS = {
    // Approximate bounds for the national radar composite
    national: {
        north: -10.0,
        south: -45.0,
        west: 110.0,
        east: 155.0,
    },
};

/**
 * Weather Plugin
 * Displays rain radar overlay using RainViewer API
 * Resolved CORS issues found with direct BOM GIF fetching
 */
class WeatherPluginInstance implements PluginInstance {
    id = 'weather';
    private map: MapLibreGLMap;
    private config: WeatherPluginConfig;
    private sourceId = 'weather-radar-source';
    private layerId = 'weather-radar-layer';
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private isVisible = false;
    private currentTimestamp: number | null = null;

    constructor(map: MapLibreGLMap, config: WeatherPluginConfig) {
        this.map = map;
        this.config = {
            refreshInterval: 5 * 60 * 1000, // 5 minutes (RainViewer updates every 5-10m)
            opacity: 0.6,
            showControls: true,
            ...config,
        };
    }

    /**
     * Fetch the latest radar metadata from RainViewer
     */
    private async fetchMetadata(): Promise<{ timestamp: number; host: string } | null> {
        try {
            const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            if (!response.ok) throw new Error('Failed to fetch RainViewer metadata');

            const data = await response.json();
            if (!data.radar || !data.radar.past || data.radar.past.length === 0) {
                return null;
            }

            // Get the latest "past" radar image
            const latest = data.radar.past[data.radar.past.length - 1];
            return {
                timestamp: latest.time,
                host: data.host
            };
        } catch (error) {
            console.error('[WeatherPlugin] Metadata error:', error);
            return null;
        }
    }

    /**
     * Initialize radar layer using RainViewer tiles
     */
    private async initializeLayer(): Promise<void> {
        if (!this.map.loaded()) {
            this.map.once('load', () => this.initializeLayer());
            return;
        }

        const metadata = await this.fetchMetadata();
        if (!metadata) {
            console.warn('[WeatherPlugin] No radar data available');
            return;
        }

        this.currentTimestamp = metadata.timestamp;
        const tileUrl = `${metadata.host}/v2/radar/${metadata.timestamp}/256/{z}/{x}/{y}/2/1_1.png`;

        // Remove existing if present
        if (this.map.getLayer(this.layerId)) {
            this.map.removeLayer(this.layerId);
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }

        // Add raster tile source
        this.map.addSource(this.sourceId, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '© <a href="https://www.rainviewer.com/api.html">RainViewer</a>',
        });

        // Add raster layer
        this.map.addLayer({
            id: this.layerId,
            type: 'raster',
            source: this.sourceId,
            paint: {
                'raster-opacity': this.config.opacity || 0.6,
                'raster-fade-duration': 300,
            },
        });

        this.isVisible = true;
        console.log(`[WeatherPlugin] Radar active (timestamp: ${metadata.timestamp})`);
    }

    /**
     * Show the weather radar overlay
     */
    async show(): Promise<void> {
        if (this.isVisible) return;
        await this.initializeLayer();
        this.startAutoRefresh();
    }

    /**
     * Hide the weather radar overlay
     */
    hide(): void {
        if (!this.isVisible) return;

        this.stopAutoRefresh();

        if (this.map.getLayer(this.layerId)) {
            this.map.removeLayer(this.layerId);
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }

        this.isVisible = false;
    }

    /**
     * Toggle visibility
     */
    async toggle(): Promise<boolean> {
        if (this.isVisible) {
            this.hide();
        } else {
            await this.show();
        }
        return this.isVisible;
    }

    /**
     * Refresh the radar tiles with latest metadata
     */
    async refresh(): Promise<void> {
        const metadata = await this.fetchMetadata();
        if (!metadata || metadata.timestamp === this.currentTimestamp) return;

        this.currentTimestamp = metadata.timestamp;
        const tileUrl = `${metadata.host}/v2/radar/${metadata.timestamp}/256/{z}/{x}/{y}/2/1_1.png`;

        const source = this.map.getSource(this.sourceId) as any;
        if (source && 'setTiles' in source) {
            source.setTiles([tileUrl]);
            console.log('[WeatherPlugin] Radar tiles updated:', metadata.timestamp);
        }
    }

    /**
     * Start auto-refresh timer
     */
    private startAutoRefresh(): void {
        this.stopAutoRefresh();
        if (this.config.refreshInterval && this.config.refreshInterval > 0) {
            this.refreshTimer = setInterval(() => {
                this.refresh();
            }, this.config.refreshInterval);
        }
    }

    /**
     * Stop auto-refresh timer
     */
    private stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Set radar opacity
     */
    setOpacity(opacity: number): void {
        this.config.opacity = Math.max(0, Math.min(1, opacity));

        if (this.map.getLayer(this.layerId)) {
            this.map.setPaintProperty(this.layerId, 'raster-opacity', this.config.opacity);
        }
    }

    /**
     * Check if radar is visible
     */
    isRadarVisible(): boolean {
        return this.isVisible;
    }

    updateConfig(config: PluginConfig): void {
        this.config = { ...this.config, ...config };

        if (this.config.opacity !== undefined) {
            this.setOpacity(this.config.opacity as number);
        }
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        this.hide();
    }
}

// Export plugin definition
export const weatherPlugin = definePlugin({
    id: 'weather',
    name: 'Weather Radar',
    description: 'Global rain radar overlay using RainViewer API',
    category: 'overlays',
    version: '1.1.0',
    dependencies: [],
    defaultEnabled: false,
    defaultConfig: {
        refreshInterval: 5 * 60 * 1000, // 5 minutes
        opacity: 0.6,
        showControls: true,
    },
    initialize: async (map, config) => {
        const instance = new WeatherPluginInstance(map, config as WeatherPluginConfig);
        // Automatically show if this is being initialized (which happens when enabled)
        await instance.show();
        return instance;
    },
});

export { WeatherPluginInstance };
