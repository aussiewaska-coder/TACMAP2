// Basemap Plugin - Switch between different map styles
// Supports OSM, satellite, terrain-focused, and custom styles

import type { Map as MapLibreGLMap, StyleSpecification } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { MAP_CONFIG } from '@/core/constants';
import { eventBus } from '@/events/EventBus';
import { isMapValid } from '@/utils/mapUtils';

export interface BasemapStyle {
    id: string;
    name: string;
    thumbnail?: string;
    style: string | StyleSpecification;
    terrain?: boolean;
}

export interface BasemapPluginConfig extends PluginConfig {
    defaultStyle?: string;
    styles?: BasemapStyle[];
}

// Default basemap styles
const DEFAULT_STYLES: BasemapStyle[] = [
    {
        id: 'osm-terrain',
        name: 'OSM + Terrain',
        terrain: true,
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                },
                'terrain-source': {
                    type: 'raster-dem',
                    tiles: [MAP_CONFIG.TERRAIN.SOURCE_URL],
                    tileSize: MAP_CONFIG.TERRAIN.TILE_SIZE,
                    encoding: MAP_CONFIG.TERRAIN.ENCODING,
                    maxzoom: MAP_CONFIG.TERRAIN.MAX_ZOOM,
                },
            },
            layers: [
                {
                    id: 'osm-layer',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
                {
                    id: 'hillshade',
                    type: 'hillshade',
                    source: 'terrain-source',
                    layout: { visibility: 'visible' },
                    paint: {
                        'hillshade-exaggeration': 0.5,
                        'hillshade-shadow-color': '#473B24',
                        'hillshade-highlight-color': '#FFFFFF',
                    },
                },
            ],
            terrain: {
                source: 'terrain-source',
                exaggeration: MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,
            },
            sky: {},
        } as StyleSpecification,
    },
    {
        id: 'osm-standard',
        name: 'OpenStreetMap',
        terrain: false,
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                },
            },
            layers: [
                {
                    id: 'osm-layer',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
            ],
        } as StyleSpecification,
    },
    {
        id: 'carto-light',
        name: 'Light',
        terrain: false,
        style: {
            version: 8,
            sources: {
                'carto-tiles': {
                    type: 'raster',
                    tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
                    tileSize: 256,
                    attribution: '© <a href="https://carto.com/">CARTO</a>',
                },
            },
            layers: [
                {
                    id: 'carto-layer',
                    type: 'raster',
                    source: 'carto-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
            ],
        } as StyleSpecification,
    },
    {
        id: 'carto-dark',
        name: 'Dark',
        terrain: false,
        style: {
            version: 8,
            sources: {
                'carto-tiles': {
                    type: 'raster',
                    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
                    tileSize: 256,
                    attribution: '© <a href="https://carto.com/">CARTO</a>',
                },
            },
            layers: [
                {
                    id: 'carto-layer',
                    type: 'raster',
                    source: 'carto-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
            ],
        } as StyleSpecification,
    },
    {
        id: 'carto-voyager',
        name: 'Voyager',
        terrain: false,
        style: {
            version: 8,
            sources: {
                'carto-tiles': {
                    type: 'raster',
                    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
                    tileSize: 256,
                    attribution: '© <a href="https://carto.com/">CARTO</a>',
                },
            },
            layers: [
                {
                    id: 'carto-layer',
                    type: 'raster',
                    source: 'carto-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                },
            ],
        } as StyleSpecification,
    },
];

/**
 * Basemap Plugin
 * Handles switching between different map styles
 */
class BasemapPluginInstance implements PluginInstance {
    id = 'basemaps';
    private map: MapLibreGLMap;
    private config: BasemapPluginConfig;
    private currentStyleId: string;
    private styles: BasemapStyle[];

    constructor(map: MapLibreGLMap, config: BasemapPluginConfig) {
        this.map = map;
        this.styles = config.styles || DEFAULT_STYLES;
        this.currentStyleId = config.defaultStyle || 'osm-terrain';
        this.config = config;
    }

    /**
     * Get all available styles
     */
    getStyles(): BasemapStyle[] {
        return this.styles;
    }

    /**
     * Get current style ID
     */
    getCurrentStyleId(): string {
        return this.currentStyleId;
    }

    /**
     * Get current style
     */
    getCurrentStyle(): BasemapStyle | undefined {
        return this.styles.find((s) => s.id === this.currentStyleId);
    }

    /**
     * Set the basemap style
     */
    async setStyle(styleId: string): Promise<void> {
        if (!isMapValid(this.map)) return;

        const style = this.styles.find((s) => s.id === styleId);
        if (!style) {
            console.warn(`[BasemapPlugin] Style "${styleId}" not found`);
            return;
        }

        // Save current camera position
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const pitch = this.map.getPitch();
        const bearing = this.map.getBearing();

        // Apply new style
        this.map.setStyle(style.style);

        // Wait for style to load
        this.map.once('styledata', () => {
            // Restore camera position
            this.map.jumpTo({
                center,
                zoom,
                pitch,
                bearing,
            });

            // Re-add terrain if the style supports it
            if (style.terrain) {
                this.map.once('load', () => {
                    try {
                        // Ensure terrain source exists
                        if (!this.map.getSource('terrain-source')) {
                            this.map.addSource('terrain-source', {
                                type: 'raster-dem',
                                tiles: [MAP_CONFIG.TERRAIN.SOURCE_URL],
                                tileSize: MAP_CONFIG.TERRAIN.TILE_SIZE,
                                encoding: MAP_CONFIG.TERRAIN.ENCODING,
                                maxzoom: MAP_CONFIG.TERRAIN.MAX_ZOOM,
                            });
                        }

                        this.map.setTerrain({
                            source: 'terrain-source',
                            exaggeration: MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,
                        });
                    } catch (error) {
                        console.warn('[BasemapPlugin] Failed to re-enable terrain:', error);
                    }
                });
            }

            this.currentStyleId = styleId;
            console.log(`[BasemapPlugin] Style changed to: ${style.name}`);
        });
    }

    /**
     * Add a custom style
     */
    addStyle(style: BasemapStyle): void {
        const existingIndex = this.styles.findIndex((s) => s.id === style.id);
        if (existingIndex >= 0) {
            this.styles[existingIndex] = style;
        } else {
            this.styles.push(style);
        }
    }

    /**
     * Remove a style
     */
    removeStyle(styleId: string): boolean {
        const index = this.styles.findIndex((s) => s.id === styleId);
        if (index >= 0) {
            this.styles.splice(index, 1);
            return true;
        }
        return false;
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
export const basemapPlugin = definePlugin({
    id: 'basemaps',
    name: 'Basemap Styles',
    description: 'Switch between different map styles',
    category: 'core',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        defaultStyle: 'osm-terrain',
    },
    initialize: async (map, config) => {
        return new BasemapPluginInstance(map, config as BasemapPluginConfig);
    },
});

// Export for use
export { BasemapPluginInstance, DEFAULT_STYLES };
