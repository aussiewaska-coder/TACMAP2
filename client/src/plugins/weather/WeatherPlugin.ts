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
 * Displays rain radar overlay from BOM
 */
class WeatherPluginInstance implements PluginInstance {
    id = 'weather';
    private map: MapLibreGLMap;
    private config: WeatherPluginConfig;
    private sourceId = 'weather-radar-source';
    private layerId = 'weather-radar-layer';
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private imageUrl: string;
    private isVisible = false;

    constructor(map: MapLibreGLMap, config: WeatherPluginConfig) {
        this.map = map;
        this.config = {
            refreshInterval: 10 * 60 * 1000, // 10 minutes
            opacity: 0.6,
            showControls: true,
            ...config,
        };

        // Add cache-busting timestamp
        this.imageUrl = this.getRadarUrl();
    }

    /**
     * Get radar URL with cache-busting
     */
    private getRadarUrl(): string {
        return `${BOM_RADAR_URLS.national}?t=${Date.now()}`;
    }

    /**
     * Initialize radar layer
     */
    private initializeLayer(): void {
        if (!this.map.loaded()) {
            this.map.once('load', () => this.initializeLayer());
            return;
        }

        const bounds = AUSTRALIA_BOUNDS.national;

        // Remove existing if present
        if (this.map.getLayer(this.layerId)) {
            this.map.removeLayer(this.layerId);
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }

        // Add image source
        this.map.addSource(this.sourceId, {
            type: 'image',
            url: this.imageUrl,
            coordinates: [
                [bounds.west, bounds.north], // top-left
                [bounds.east, bounds.north], // top-right
                [bounds.east, bounds.south], // bottom-right
                [bounds.west, bounds.south], // bottom-left
            ],
        });

        // Add raster layer
        this.map.addLayer({
            id: this.layerId,
            type: 'raster',
            source: this.sourceId,
            paint: {
                'raster-opacity': this.config.opacity || 0.6,
                'raster-fade-duration': 0,
            },
        });

        this.isVisible = true;
    }

    /**
     * Show the weather radar overlay
     */
    show(): void {
        if (this.isVisible) return;
        this.initializeLayer();
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
    toggle(): boolean {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
        return this.isVisible;
    }

    /**
     * Refresh the radar image
     */
    refresh(): void {
        this.imageUrl = this.getRadarUrl();

        const source = this.map.getSource(this.sourceId);
        if (source && 'updateImage' in source) {
            (source as any).updateImage({ url: this.imageUrl });
        }

        console.log('[WeatherPlugin] Radar refreshed');
    }

    /**
     * Start auto-refresh timer
     */
    private startAutoRefresh(): void {
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
            this.setOpacity(this.config.opacity);
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
    description: 'Rain radar overlay from Bureau of Meteorology',
    category: 'overlays',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: false,
    defaultConfig: {
        refreshInterval: 10 * 60 * 1000, // 10 minutes
        opacity: 0.6,
        showControls: true,
    },
    initialize: async (map, config) => {
        return new WeatherPluginInstance(map, config as WeatherPluginConfig);
    },
});

export { WeatherPluginInstance, BOM_RADAR_URLS };
