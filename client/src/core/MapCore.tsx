// MapCore - Minimal base map component
// This component ONLY handles map initialization and cleanup
// All features are added via plugins

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl, { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAP_CONFIG } from '@/core/constants';
import { useMapStore, useMapProviderStore, type MapProvider } from '@/stores';
import { eventBus } from '@/events/EventBus';
import type { MapEngine, MapInstance } from '@/types/mapEngine';

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

function mapboxTransformRequest(token?: string) {
    return (url: string) => {
        if (!token) return { url };

        let transformedUrl = url;
        if (url.startsWith('mapbox://sprites/')) {
            const path = url.replace('mapbox://sprites/', '');
            const match = path.match(/^([^/]+\\/[^/]+)(.*)$/);
            const base = match ? match[1] : path;
            const suffix = match ? match[2] : '';
            transformedUrl = `https://api.mapbox.com/styles/v1/${base}/sprite${suffix}`;
        } else if (url.startsWith('mapbox://fonts/')) {
            const path = url.replace('mapbox://fonts/', '');
            transformedUrl = `https://api.mapbox.com/fonts/v1/${path}`;
        } else if (url.startsWith('mapbox://styles/')) {
            const path = url.replace('mapbox://styles/', '');
            transformedUrl = `https://api.mapbox.com/styles/v1/${path}`;
        } else if (url.startsWith('mapbox://')) {
            const path = url.replace('mapbox://', '');
            transformedUrl = `https://api.mapbox.com/v4/${path}.json`;
        }

        if (transformedUrl.includes('api.mapbox.com') && !transformedUrl.includes('access_token=')) {
            const separator = transformedUrl.includes('?') ? '&' : '?';
            transformedUrl = `${transformedUrl}${separator}access_token=${token}`;
        }

        return { url: transformedUrl };
    };
}

function resolveMapStyle(provider: MapProvider): StyleSpecification | string {
    if (provider === 'maptiler') {
        const apiKey = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;
        const styleId = (import.meta.env.VITE_MAPTILER_STYLE as string | undefined) || 'streets-v2';
        if (apiKey) {
            return `https://api.maptiler.com/maps/${styleId}/style.json?key=${apiKey}`;
        }
    }

    if (provider === 'mapbox') {
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
        const styleId = (import.meta.env.VITE_MAPBOX_STYLE_ID as string | undefined) || 'mapbox/streets-v12';
        if (token) {
            return `https://api.mapbox.com/styles/v1/${styleId}/style.json?access_token=${token}`;
        }
    }

    return buildDefaultStyle();
}

function getEngine(provider: MapProvider): MapEngine {
    return provider === 'mapbox' ? 'mapbox' : 'maplibre';
}

function ensureBaseOverlays(map: MapInstance) {
    if (!map.getLayer('sky')) {
        map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun': [0.0, 0.0],
                'sky-atmosphere-sun-intensity': 15,
            },
        } as unknown as maplibregl.LayerSpecification);
    }

    if (!map.getSource("gov-landuse")) {
        map.addSource("gov-landuse", {
            type: "raster",
            tiles: [
                `/api/wms-proxy?url=${encodeURIComponent("https://services.ga.gov.au/gis/services/NM_Land_Use_18_19/MapServer/WMSServer")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.3.0&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Land_Use_18_19`
            ],
            tileSize: 256,
            attribution: "Geoscience Australia"
        });
    }

    if (!map.getLayer("gov-landuse-layer")) {
        map.addLayer({
            id: "gov-landuse-layer",
            type: "raster",
            source: "gov-landuse",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.7 }
        });
    }

    if (!map.getSource("gov-geology")) {
        map.addSource("gov-geology", {
            type: "raster",
            tiles: [
                `/api/wms-proxy?url=${encodeURIComponent("https://services.ga.gov.au/gis/services/GA_Surface_Geology/MapServer/WMSServer")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.3.0&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=GA_Surface_Geology`
            ],
            tileSize: 256,
            attribution: "Geoscience Australia"
        });
    }

    if (!map.getLayer("gov-geology-layer")) {
        map.addLayer({
            id: "gov-geology-layer",
            type: "raster",
            source: "gov-geology",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.6 }
        });
    }

    if (!map.getSource("gov-bushfire")) {
        map.addSource("gov-bushfire", {
            type: "raster",
            tiles: [
                `/api/wms-proxy?url=${encodeURIComponent("https://sentinel.ga.gov.au/geoserver/public/wms")}&bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=hotspots_72hrs`
            ],
            tileSize: 256,
            attribution: "Sentinel Hotspots"
        });
    }

    if (!map.getLayer("gov-bushfire-layer")) {
        map.addLayer({
            id: "gov-bushfire-layer",
            type: "raster",
            source: "gov-bushfire",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.9 }
        });
    }
}

/**
 * Core map component
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
    const mapRef = useRef<MapInstance | null>(null);
    const currentEngineRef = useRef<MapEngine | null>(null);

    const setMap = useMapStore((state) => state.setMap);
    const setLoaded = useMapStore((state) => state.setLoaded);
    const setInitializing = useMapStore((state) => state.setInitializing);
    const setError = useMapStore((state) => state.setError);
    const updateViewState = useMapStore((state) => state.updateViewState);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const provider = useMapProviderStore((state) => state.provider);

    // Track current zoom for indicator
    const [currentZoom, setCurrentZoom] = useState<number>(MAP_CONFIG.DEFAULT_ZOOM);

    // Initialize map
    const destroyMap = useCallback(() => {
        if (!mapRef.current) return;
        const mapToDestroy = mapRef.current;
        mapRef.current = null;
        setMap(null);
        setLoaded(false);
        try {
            mapToDestroy.remove();
        } catch {
            // ignore cleanup errors
        }
    }, [setLoaded, setMap]);

    const initializeMap = useCallback(async () => {
        if (!containerRef.current) return;

        const engine = getEngine(provider);

        if (mapRef.current) {
            if (currentEngineRef.current === engine) {
                try {
                    mapRef.current.setStyle(resolveMapStyle(provider));
                } catch (error) {
                    console.warn('[MapCore] Failed to update map style:', error);
                }
                return;
            }
            destroyMap();
        }

        setInitializing(true);
        setError(null);

        try {
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
            let map: MapInstance;

            if (engine === 'mapbox') {
                const { default: mapboxgl } = await import('mapbox-gl');
                await import('mapbox-gl/dist/mapbox-gl.css');
                if (mapboxToken) {
                    mapboxgl.accessToken = mapboxToken;
                }

                map = new mapboxgl.Map({
                    container: containerRef.current,
                    style: resolveMapStyle(provider),
                    center: MAP_CONFIG.DEFAULT_CENTER,
                    zoom: MAP_CONFIG.DEFAULT_ZOOM,
                    pitch: 60,
                    bearing: MAP_CONFIG.DEFAULT_BEARING,
                    minZoom: MAP_CONFIG.MIN_ZOOM,
                    maxZoom: MAP_CONFIG.MAX_ZOOM,
                    maxPitch: 85,
                    attributionControl: false,
                    transformRequest: mapboxTransformRequest(mapboxToken),
                });

                map.addControl(
                    new mapboxgl.NavigationControl({
                        showCompass: true,
                        showZoom: true,
                        visualizePitch: true,
                    }),
                    'top-right'
                );

                map.addControl(
                    new mapboxgl.ScaleControl({
                        maxWidth: 200,
                        unit: 'metric',
                    }),
                    'bottom-left'
                );

                map.addControl(
                    new mapboxgl.AttributionControl({
                        compact: true,
                    }),
                    'bottom-right'
                );
            } else {
                map = new maplibregl.Map({
                    container: containerRef.current,
                    style: resolveMapStyle(provider),
                    center: MAP_CONFIG.DEFAULT_CENTER,
                    zoom: MAP_CONFIG.DEFAULT_ZOOM,
                    pitch: 60,
                    bearing: MAP_CONFIG.DEFAULT_BEARING,
                    minZoom: MAP_CONFIG.MIN_ZOOM,
                    maxZoom: MAP_CONFIG.MAX_ZOOM,
                    maxPitch: 85,
                    attributionControl: false,
                });

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
            }

            currentEngineRef.current = engine;

            // Add controls
            map.on('load', () => {
                ensureBaseOverlays(map);

                mapRef.current = map;
                setMap(map as unknown as maplibregl.Map);
                setLoaded(true);
                setInitializing(false);

                // Initial view state sync
                updateViewState();
                setCurrentZoom(map.getZoom());

                console.log(`[MapCore] ${engine} map initialized with 3D terrain & Gov layers`);
            });

            const handleStyleData = () => {
                if (!map.isStyleLoaded()) return;
                ensureBaseOverlays(map);
            };

            map.on('styledata', handleStyleData);

            // Handle map move for view state updates
            map.on('move', () => {
                setCurrentZoom(map.getZoom());
            });

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
    }, [destroyMap, provider, setMap, setLoaded, setInitializing, setError, updateViewState]);

    // Initialize on mount
    useEffect(() => {
        void initializeMap();

        // Cleanup on unmount
        // IMPORTANT: Set store to null BEFORE destroying map
        // This allows other components' cleanup effects to see null and skip map operations
        return () => {
            destroyMap();
        };
    }, [destroyMap, initializeMap]);

    // Update terrain exaggeration when it changes
    useEffect(() => {
        if (mapRef.current && mapRef.current.loaded()) {
            try {
                if (mapRef.current.getSource('terrain-source')) {
                    mapRef.current.setTerrain({
                        source: 'terrain-source',
                        exaggeration: terrainExaggeration,
                    });
                }
            } catch (error) {
                console.warn('[MapCore] Failed to update terrain:', error);
            }
        }
    }, [terrainExaggeration]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '100%' }}
            />
            {/* Zoom Indicator - Top Right */}
            <div className="absolute top-[100px] right-2.5 z-10 bg-black/80 text-cyan-400 px-2 py-1 rounded text-xs font-mono font-bold border border-cyan-900/50 backdrop-blur-sm pointer-events-none shadow-lg">
                Z{currentZoom.toFixed(1)}
            </div>
        </div>
    );
}

export default MapCore;
