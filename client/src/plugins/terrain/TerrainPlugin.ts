// Terrain Plugin - 3D terrain controls
// Manages terrain exaggeration and hillshade settings

import type { Map as MapLibreGLMap } from 'maplibre-gl';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { MAP_CONFIG } from '@/core/constants';

export interface TerrainPluginConfig extends PluginConfig {
    enabled?: boolean;
    exaggeration?: number;
    hillshadeExaggeration?: number;
    hillshadeShadowColor?: string;
    hillshadeHighlightColor?: string;
}

/**
 * Terrain Plugin
 * Controls 3D terrain elevation and hillshade effects
 */
class TerrainPluginInstance implements PluginInstance {
    id = 'terrain';
    private map: MapLibreGLMap;
    private config: TerrainPluginConfig;

    constructor(map: MapLibreGLMap, config: TerrainPluginConfig) {
        this.map = map;
        this.config = {
            enabled: true,
            exaggeration: MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,
            hillshadeExaggeration: 0.5,
            hillshadeShadowColor: '#473B24',
            hillshadeHighlightColor: '#FFFFFF',
            ...config,
        };

        // Apply initial terrain settings
        if (this.config.enabled) {
            this.enableTerrain();
        }
    }

    /**
     * Enable 3D terrain
     */
    enableTerrain(): void {
        if (!this.map.loaded()) {
            this.map.once('load', () => this.enableTerrain());
            return;
        }

        try {
            this.map.setTerrain({
                source: 'terrain-source',
                exaggeration: this.config.exaggeration ?? MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,
            });
            this.config.enabled = true;
        } catch (error) {
            console.warn('[TerrainPlugin] Failed to enable terrain:', error);
        }
    }

    /**
     * Disable 3D terrain
     */
    disableTerrain(): void {
        try {
            this.map.setTerrain(null);
            this.config.enabled = false;
        } catch (error) {
            console.warn('[TerrainPlugin] Failed to disable terrain:', error);
        }
    }

    /**
     * Toggle terrain on/off
     */
    toggleTerrain(): boolean {
        if (this.config.enabled) {
            this.disableTerrain();
        } else {
            this.enableTerrain();
        }
        return this.config.enabled ?? false;
    }

    /**
     * Set terrain exaggeration (1.0 = realistic, higher = more dramatic)
     */
    setExaggeration(value: number): void {
        const clampedValue = Math.max(
            MAP_CONFIG.TERRAIN.MIN_EXAGGERATION,
            Math.min(MAP_CONFIG.TERRAIN.MAX_EXAGGERATION, value)
        );

        this.config.exaggeration = clampedValue;

        if (this.config.enabled && this.map.loaded()) {
            try {
                this.map.setTerrain({
                    source: 'terrain-source',
                    exaggeration: clampedValue,
                });
            } catch (error) {
                console.warn('[TerrainPlugin] Failed to update exaggeration:', error);
            }
        }
    }

    /**
     * Get current exaggeration value
     */
    getExaggeration(): number {
        return this.config.exaggeration ?? MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION;
    }

    /**
     * Check if terrain is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled ?? false;
    }

    /**
     * Update hillshade layer settings
     */
    updateHillshade(options: {
        exaggeration?: number;
        shadowColor?: string;
        highlightColor?: string;
    }): void {
        if (!this.map.loaded()) return;

        try {
            if (options.exaggeration !== undefined) {
                this.map.setPaintProperty('hillshade', 'hillshade-exaggeration', options.exaggeration);
                this.config.hillshadeExaggeration = options.exaggeration;
            }
            if (options.shadowColor !== undefined) {
                this.map.setPaintProperty('hillshade', 'hillshade-shadow-color', options.shadowColor);
                this.config.hillshadeShadowColor = options.shadowColor;
            }
            if (options.highlightColor !== undefined) {
                this.map.setPaintProperty('hillshade', 'hillshade-highlight-color', options.highlightColor);
                this.config.hillshadeHighlightColor = options.highlightColor;
            }
        } catch (error) {
            console.warn('[TerrainPlugin] Failed to update hillshade:', error);
        }
    }

    /**
     * Set map pitch for better terrain viewing
     */
    setTerrainViewPitch(pitch = 60): void {
        this.map.easeTo({
            pitch,
            duration: 500,
        });
    }

    /**
     * Reset to top-down view
     */
    setFlatView(): void {
        this.map.easeTo({
            pitch: 0,
            bearing: 0,
            duration: 500,
        });
    }

    updateConfig(config: PluginConfig): void {
        const terrainConfig = config as TerrainPluginConfig;

        if (terrainConfig.exaggeration !== undefined) {
            this.setExaggeration(terrainConfig.exaggeration);
        }
        if (terrainConfig.enabled !== undefined) {
            if (terrainConfig.enabled) {
                this.enableTerrain();
            } else {
                this.disableTerrain();
            }
        }

        this.config = { ...this.config, ...terrainConfig };
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        this.disableTerrain();
    }
}

// Export the plugin definition
export const terrainPlugin = definePlugin({
    id: 'terrain',
    name: '3D Terrain',
    description: 'Adds 3D terrain elevation using AWS Terrain Tiles',
    category: 'core',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        enabled: true,
        exaggeration: MAP_CONFIG.TERRAIN.DEFAULT_EXAGGERATION,
        hillshadeExaggeration: 0.5,
    },
    initialize: async (map, config) => {
        return new TerrainPluginInstance(map, config as TerrainPluginConfig);
    },
});

// Export the instance class for type usage
export { TerrainPluginInstance };
