// MapCore - Minimal base map component
// This component ONLY handles map initialization and cleanup
// All features are added via plugins

import { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Map as MapLibreGLMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAP_CONFIG } from '@/core/constants';
import { useMapStore } from '@/stores';
import { eventBus } from '@/events/EventBus';

interface MapCoreProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Build the default map style with terrain support
 */
function buildDefaultStyle(): StyleSpecification {
    return {
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
    };
}

/**
 * Core MapLibre map component
 * 
 * This is a minimal component that only handles:
 * - Map initialization
 * - Map cleanup on unmount
 * - Syncing map instance to store
 * 
 * All additional functionality (terrain controls, layers, plugins)
 * is handled by separate components/hooks.
 */
export function MapCore({ className = '' }: MapCoreProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreGLMap | null>(null);

    const setMap = useMapStore((state) => state.setMap);
    const setLoaded = useMapStore((state) => state.setLoaded);
    const setInitializing = useMapStore((state) => state.setInitializing);
    const setError = useMapStore((state) => state.setError);
    const updateViewState = useMapStore((state) => state.updateViewState);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);

    // Initialize map
    const initializeMap = useCallback(() => {
        if (!containerRef.current || mapRef.current) return;

        setInitializing(true);
        setError(null);

        try {
            const map = new maplibregl.Map({
                container: containerRef.current,
                style: buildDefaultStyle(),
                center: MAP_CONFIG.DEFAULT_CENTER,
                zoom: MAP_CONFIG.DEFAULT_ZOOM,
                pitch: 60, // Tilted for 3D terrain visibility
                bearing: MAP_CONFIG.DEFAULT_BEARING,
                minZoom: MAP_CONFIG.MIN_ZOOM,
                maxZoom: MAP_CONFIG.MAX_ZOOM,
                attributionControl: false,
            });

            // Add controls
            map.addControl(
                new maplibregl.NavigationControl({
                    showCompass: true,
                    showZoom: true,
                    visualizePitch: true,
                }),
                'top-right'
            );

            map.addControl(
                new maplibregl.ScaleControl({
                    maxWidth: 200,
                    unit: 'metric',
                }),
                'bottom-left'
            );

            map.addControl(
                new maplibregl.AttributionControl({
                    compact: true,
                }),
                'bottom-right'
            );

            map.addControl(
                new maplibregl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true,
                    },
                    trackUserLocation: true,
                }),
                'top-right'
            );

            // Handle map load
            map.on('load', () => {
                // Add sky layer for 3D atmosphere
                map.addLayer({
                    id: 'sky',
                    type: 'sky',
                    paint: {
                        'sky-type': 'atmosphere',
                        'sky-atmosphere-sun': [0.0, 0.0],
                        'sky-atmosphere-sun-intensity': 15,
                    },
                } as unknown as maplibregl.LayerSpecification);

                // === GOVERNMENT DATA LAYERS (WMS) ===
                // NOTE: We use /api/wms-proxy to avoid CORS issues with these government servers

                // 1. Land Use (Geoscience Australia)
                map.addSource("gov-landuse", {
                    type: "raster",
                    tiles: [
                        `/api/wms-proxy?url=${encodeURIComponent("https://services.ga.gov.au/gis/services/NM_Land_Use_18_19/MapServer/WMSServer")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.3.0&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Land_Use_18_19`
                    ],
                    tileSize: 256,
                    attribution: "Geoscience Australia"
                });

                map.addLayer({
                    id: "gov-landuse-layer",
                    type: "raster",
                    source: "gov-landuse",
                    layout: { visibility: "none" },
                    paint: { "raster-opacity": 0.7 }
                });

                // 2. Surface Geology (Geoscience Australia)
                map.addSource("gov-geology", {
                    type: "raster",
                    tiles: [
                        `/api/wms-proxy?url=${encodeURIComponent("https://services.ga.gov.au/gis/services/GA_Surface_Geology/MapServer/WMSServer")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.3.0&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=GA_Surface_Geology`
                    ],
                    tileSize: 256,
                    attribution: "Geoscience Australia"
                });

                map.addLayer({
                    id: "gov-geology-layer",
                    type: "raster",
                    source: "gov-geology",
                    layout: { visibility: "none" },
                    paint: { "raster-opacity": 0.6 }
                });

                // 3. Bushfire Hotspots (Sentinel)
                map.addSource("gov-bushfire", {
                    type: "raster",
                    tiles: [
                        `/api/wms-proxy?url=${encodeURIComponent("https://sentinel.ga.gov.au/geoserver/public/wms")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=hotspots_72hrs`
                    ],
                    tileSize: 256,
                    attribution: "Sentinel Hotspots"
                });

                map.addLayer({
                    id: "gov-bushfire-layer",
                    type: "raster",
                    source: "gov-bushfire",
                    layout: { visibility: "none" },
                    paint: { "raster-opacity": 0.9 }
                });

                mapRef.current = map;
                setMap(map);
                setLoaded(true);
                setInitializing(false);

                // Initial view state sync
                updateViewState();

                console.log('[MapCore] Map initialized with 3D terrain & Gov layers');
            });

            // Handle map move for view state updates
            map.on('moveend', () => {
                updateViewState();
                const center = map.getCenter();
                eventBus.emit('map:moveend', {
                    center: [center.lng, center.lat],
                    zoom: map.getZoom(),
                });
            });

            // Handle errors
            map.on('error', (e) => {
                console.error('[MapCore] Map error:', e);
                setError(e.error);
            });

        } catch (error) {
            console.error('[MapCore] Failed to initialize map:', error);
            setError(error instanceof Error ? error : new Error('Failed to initialize map'));
            setInitializing(false);
        }
    }, [setMap, setLoaded, setInitializing, setError, updateViewState]);

    // Initialize on mount
    useEffect(() => {
        initializeMap();

        // Cleanup on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMap(null);
                setLoaded(false);
            }
        };
    }, [initializeMap, setMap, setLoaded]);

    // Update terrain exaggeration when it changes
    useEffect(() => {
        if (mapRef.current && mapRef.current.loaded()) {
            try {
                mapRef.current.setTerrain({
                    source: 'terrain-source',
                    exaggeration: terrainExaggeration,
                });
            } catch (error) {
                console.warn('[MapCore] Failed to update terrain:', error);
            }
        }
    }, [terrainExaggeration]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full ${className}`}
            style={{ minHeight: '100%' }}
        />
    );
}

export default MapCore;
