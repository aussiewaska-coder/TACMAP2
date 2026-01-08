// Basemap store - Manages current basemap style selection
// This store is SHARED between mobile and desktop views

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Map as MapLibreGLMap, StyleSpecification } from 'maplibre-gl';
import { MAP_CONFIG } from '@/core/constants';

export interface BasemapStyle {
    id: string;
    name: string;
    thumbnail?: string;
    description?: string;
    terrain: boolean;
}

// Available basemap styles
export const BASEMAP_STYLES: BasemapStyle[] = [
    {
        id: 'osm-terrain',
        name: 'OSM + Terrain',
        description: 'OpenStreetMap with 3D terrain',
        terrain: true,
    },
    {
        id: 'osm-standard',
        name: 'OpenStreetMap',
        description: 'Standard OSM tiles',
        terrain: false,
    },
    {
        id: 'carto-light',
        name: 'Light',
        description: 'Clean light basemap',
        terrain: false,
    },
    {
        id: 'carto-dark',
        name: 'Dark',
        description: 'Dark mode basemap',
        terrain: false,
    },
    {
        id: 'carto-voyager',
        name: 'Voyager',
        description: 'Colorful detailed map',
        terrain: false,
    },
];

interface BasemapState {
    currentStyleId: string;
    isChanging: boolean;

    // Actions
    setStyle: (styleId: string, map: MapLibreGLMap | null) => Promise<void>;
    getCurrentStyle: () => BasemapStyle | undefined;
}

// Style specifications
const getStyleSpec = (styleId: string): StyleSpecification => {
    switch (styleId) {
        case 'osm-terrain':
            return {
                version: 8,
                sources: {
                    'osm-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors',
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
            };
        case 'osm-standard':
            return {
                version: 8,
                sources: {
                    'osm-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors',
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
            };
        case 'carto-light':
            return {
                version: 8,
                sources: {
                    'carto-tiles': {
                        type: 'raster',
                        tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
                        tileSize: 256,
                        attribution: '© CARTO',
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
            };
        case 'carto-dark':
            return {
                version: 8,
                sources: {
                    'carto-tiles': {
                        type: 'raster',
                        tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
                        tileSize: 256,
                        attribution: '© CARTO',
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
            };
        case 'carto-voyager':
            return {
                version: 8,
                sources: {
                    'carto-tiles': {
                        type: 'raster',
                        tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
                        tileSize: 256,
                        attribution: '© CARTO',
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
            };
        default:
            return getStyleSpec('osm-terrain');
    }
};

export const useBasemapStore = create<BasemapState>()(
    subscribeWithSelector((set, get) => ({
        currentStyleId: 'osm-terrain',
        isChanging: false,

        setStyle: async (styleId, map) => {
            if (!map || get().currentStyleId === styleId) return;

            set({ isChanging: true });

            const style = BASEMAP_STYLES.find((s) => s.id === styleId);
            if (!style) {
                set({ isChanging: false });
                return;
            }

            // Save current camera
            const center = map.getCenter();
            const zoom = map.getZoom();
            const pitch = map.getPitch();
            const bearing = map.getBearing();

            // Apply new style
            const styleSpec = getStyleSpec(styleId);
            map.setStyle(styleSpec);

            // Wait for style to load and restore camera
            map.once('styledata', () => {
                map.jumpTo({ center, zoom, pitch, bearing });

                // Add sky layer for styles with terrain
                if (style.terrain) {
                    map.once('load', () => {
                        try {
                            map.addLayer({
                                id: 'sky',
                                type: 'sky',
                                paint: {
                                    'sky-type': 'atmosphere',
                                    'sky-atmosphere-sun': [0.0, 0.0],
                                    'sky-atmosphere-sun-intensity': 15,
                                },
                            } as unknown as maplibregl.LayerSpecification);
                        } catch (e) {
                            // Sky layer may already exist
                        }
                    });
                }

                set({ currentStyleId: styleId, isChanging: false });
            });
        },

        getCurrentStyle: () => {
            return BASEMAP_STYLES.find((s) => s.id === get().currentStyleId);
        },
    }))
);

// Selector hooks
export const useCurrentBasemap = () => useBasemapStore((state) => state.currentStyleId);
export const useBasemapChanging = () => useBasemapStore((state) => state.isChanging);
