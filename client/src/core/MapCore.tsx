// MapCore - Minimal base map component
// This component ONLY handles map initialization and cleanup
// All features are added via plugins

import { useEffect, useRef, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

import { MAP_CONFIG } from '@/core/constants';
import { useMapStore, useMapProviderStore } from '@/stores';
import { eventBus } from '@/events/EventBus';

// Configure MapTiler API key globally
const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;
if (MAPTILER_API_KEY) {
    maptilersdk.config.apiKey = MAPTILER_API_KEY;
}

interface MapCoreProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Build the default map style with terrain support
 */
function buildDefaultStyle(): maptilersdk.StyleSpecification {
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

const MAPTILER_COASTAL_LOCATIONS: Array<[number, number]> = [
    [115.8575, -31.9505], // Perth
    [117.8800, -35.0228], // Albany
    [114.9855, -25.2984], // Kalbarri
    [122.2368, -17.9614], // Broome
    [130.8456, -12.4634], // Darwin
    [136.8193, -12.1842], // Nhulunbuy
    [145.7700, -16.9186], // Cairns
    [146.8179, -19.2576], // Townsville
    [149.1856, -21.1412], // Mackay
    [153.0260, -27.4705], // Brisbane
    [153.4000, -28.0167], // Gold Coast
    [153.1225, -30.2963], // Coffs Harbour
    [151.2093, -33.8688], // Sydney
    [150.8931, -34.4278], // Wollongong
    [144.9631, -37.8136], // Melbourne
    [144.3607, -38.1499], // Geelong
    [138.6007, -34.9285], // Adelaide
    [135.8572, -34.7282], // Port Lincoln
    [147.3272, -42.8821], // Hobart
];

const MAPTILER_ALTITUDE_FT = {
    min: 10000,
    max: 100000,
};

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function getRandomCoastalLocation(): [number, number] {
    const index = Math.floor(Math.random() * MAPTILER_COASTAL_LOCATIONS.length);
    return MAPTILER_COASTAL_LOCATIONS[index];
}

function altitudeFeetToZoom(altitudeFeet: number): number {
    const clamped = Math.min(MAPTILER_ALTITUDE_FT.max, Math.max(MAPTILER_ALTITUDE_FT.min, altitudeFeet));
    const t = (clamped - MAPTILER_ALTITUDE_FT.min) / (MAPTILER_ALTITUDE_FT.max - MAPTILER_ALTITUDE_FT.min);
    const maxZoom = 12.5;
    const minZoom = 7;
    const zoom = maxZoom - t * (maxZoom - minZoom);
    return Math.max(MAP_CONFIG.MIN_ZOOM, Math.min(MAP_CONFIG.MAX_ZOOM, zoom));
}

function getMaptilerInitialView() {
    const altitudeFeet = randomBetween(MAPTILER_ALTITUDE_FT.min, MAPTILER_ALTITUDE_FT.max);
    return {
        center: getRandomCoastalLocation(),
        zoom: altitudeFeetToZoom(altitudeFeet),
        altitudeFeet,
    };
}

function startMaptilerDrift(map: maptilersdk.Map) {
    let stopped = false;
    let timeoutId: number | null = null;

    const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const stop = () => {
        if (stopped) return;
        stopped = true;
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
        map.off('dragstart', stop);
        map.off('mousedown', stop);
        map.off('touchstart', stop);
        map.off('wheel', stop);
        map.off('zoomstart', stop);
    };

    const driftOnce = () => {
        if (stopped) return;
        const canvas = map.getCanvas();
        if (!canvas) return;

        const center = map.getCenter();
        const centerPoint = map.project(center);
        const angle = randomBetween(0, Math.PI * 2);
        const distance = Math.min(canvas.width, canvas.height) * randomBetween(0.06, 0.14);
        const targetPoint: [number, number] = [
            centerPoint.x + Math.cos(angle) * distance,
            centerPoint.y + Math.sin(angle) * distance,
        ];
        const target = map.unproject(targetPoint);

        map.easeTo({
            center: target,
            bearing: map.getBearing() + randomBetween(-6, 6),
            duration: randomBetween(18000, 36000),
            easing: easeInOutCubic,
        });

        map.once('moveend', () => {
            if (stopped) return;
            timeoutId = window.setTimeout(driftOnce, randomBetween(1200, 3500));
        });
    };

    map.on('dragstart', stop);
    map.on('mousedown', stop);
    map.on('touchstart', stop);
    map.on('wheel', stop);
    map.on('zoomstart', stop);

    timeoutId = window.setTimeout(driftOnce, randomBetween(800, 1800));

    return stop;
}

/**
 * Resolve MapTiler style - use server proxy in production, direct API in dev
 *
 * Production (/api/maptiler-proxy):
 * - Caches responses in Redis for 24 hours
 * - Returns cached data when API rate limit (429) is hit
 * - Enables graceful degradation when MapTiler hits rate limit
 *
 * Development (direct API):
 * - Uses direct MapTiler API (no caching)
 * - Simpler for local development
 */
function resolveMapStyle(maptilerStyle?: string): maptilersdk.StyleSpecification | string {
    const envStyleId = import.meta.env.VITE_MAPTILER_STYLE as string | undefined;
    const styleId = maptilerStyle || envStyleId;

    if (!styleId) {
        console.error('[MapCore] VITE_MAPTILER_STYLE env var is not set!');
        return buildDefaultStyle();
    }

    console.log('[MapCore] Style resolution:', {
        maptilerStyle,
        envStyleId,
        finalStyleId: styleId,
        environment: import.meta.env.MODE,
    });

    // Use direct MapTiler API (works immediately, no proxy needed)
    // Future: Can implement /api/maptiler-proxy for Redis caching on Vercel
    // MapTiler SDK handles API key automatically via maptilersdk.config.apiKey
    return `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_API_KEY}`;
}

function ensureBaseOverlays(map: maptilersdk.Map) {
    if (!map.getLayer('sky')) {
        // Sky layer type is not in standard LayerSpecification but supported by MapTiler SDK
        map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun': [0.0, 0.0],
                'sky-atmosphere-sun-intensity': 15,
            },
        } as unknown as maptilersdk.LayerSpecification);
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
    const mapRef = useRef<maptilersdk.Map | null>(null);
    const driftCleanupRef = useRef<(() => void) | null>(null);
    const constrainZoomRef = useRef<(() => void) | null>(null);
    const panLockRef = useRef<{ pitch: number; bearing: number; zoom: number } | null>(null);

    const setMap = useMapStore((state) => state.setMap);
    const setLoaded = useMapStore((state) => state.setLoaded);
    const setInitializing = useMapStore((state) => state.setInitializing);
    const setError = useMapStore((state) => state.setError);
    const updateViewState = useMapStore((state) => state.updateViewState);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);
    const maptilerStyle = useMapProviderStore((state) => state.maptilerStyle);


    // Initialize map
    const destroyMap = useCallback(() => {
        if (!mapRef.current) return;
        if (driftCleanupRef.current) {
            driftCleanupRef.current();
            driftCleanupRef.current = null;
        }
        const mapToDestroy = mapRef.current;
        mapRef.current = null;
        setMap(null);
        setLoaded(false);
        try {
            // Remove zoom constraint handlers
            if (constrainZoomRef.current) {
                mapToDestroy.off('zoom', constrainZoomRef.current);
                mapToDestroy.off('move', constrainZoomRef.current);
            }
            mapToDestroy.remove();
        } catch {
            // ignore cleanup errors
        }
    }, [setLoaded, setMap]);

    const initializeMap = useCallback(async () => {
        if (!containerRef.current) return;

        if (mapRef.current) {
            try {
                mapRef.current.setStyle(resolveMapStyle(maptilerStyle));
            } catch (error) {
                console.warn('[MapCore] Failed to update map style:', error);
            }
            return;
        }

        setInitializing(true);
        setError(null);

        try {
            const maptilerView = getMaptilerInitialView();
            const initialCenter = maptilerView.center;
            const initialZoom = maptilerView.zoom;

            // Australia bounds for zoom constraint
            const australiaBounds = {
                west: 108,
                south: -46,
                east: 162,
                north: -8,
            };

            const map = new maptilersdk.Map({
                container: containerRef.current,
                style: resolveMapStyle(maptilerStyle),
                center: initialCenter,
                zoom: initialZoom,
                pitch: 60,
                bearing: MAP_CONFIG.DEFAULT_BEARING,
                minZoom: MAP_CONFIG.MIN_ZOOM,
                maxZoom: MAP_CONFIG.MAX_ZOOM,
                maxPitch: 85,
                attributionControl: false,
            });

            // Navigation controls handled by CameraControls component
            // (removed NavigationControl to avoid duplication)

            map.addControl(
                new maptilersdk.ScaleControl({
                    maxWidth: 200,
                    unit: 'metric',
                }),
                'bottom-left'
            );

            map.addControl(
                new maptilersdk.AttributionControl({
                    compact: true,
                }),
                'bottom-right'
            );

            // Constrain zoom outside Australia
            const constrainZoom = () => {
                const center = map.getCenter();
                const zoom = map.getZoom();
                const isOutsideAustralia =
                    center.lng < australiaBounds.west ||
                    center.lng > australiaBounds.east ||
                    center.lat < australiaBounds.south ||
                    center.lat > australiaBounds.north;

                if (isOutsideAustralia && zoom > 5) {
                    map.setZoom(5);
                }
            };

            constrainZoomRef.current = constrainZoom;
            map.on('zoom', constrainZoom);
            map.on('move', constrainZoom);

            // Add controls
            map.on('load', () => {
                ensureBaseOverlays(map);

                mapRef.current = map;
                setMap(map);
                setLoaded(true);
                setInitializing(false);

                // Initial view state sync
                updateViewState();

                driftCleanupRef.current = startMaptilerDrift(map);

                console.log('[MapCore] MapTiler SDK map initialized with 3D terrain & Gov layers');
            });

            const handleStyleData = () => {
                if (!map.isStyleLoaded()) return;
                ensureBaseOverlays(map);
            };

            map.on('styledata', handleStyleData);


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
                const errorEvent = e as unknown as { error?: Error; sourceId?: string; tile?: { tileID?: string }; source?: { url?: string } };
                console.error('[MapCore] Error details:', {
                    message: errorEvent.error?.message,
                    stack: errorEvent.error?.stack,
                    sourceId: errorEvent.sourceId,
                    tileId: errorEvent.tile?.tileID,
                    url: errorEvent.source?.url || (errorEvent.error as any)?.url
                });
                setError(errorEvent.error || null);
            });

        } catch (error) {
            console.error('[MapCore] Failed to initialize map:', error);
            setError(error instanceof Error ? error : new Error('Failed to initialize map'));
            setInitializing(false);
        }
    }, [destroyMap, maptilerStyle, setMap, setLoaded, setInitializing, setError, updateViewState]);

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

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.loaded() || !terrainEnabled) return;

        const handleDragStart = () => {
            panLockRef.current = {
                pitch: map.getPitch(),
                bearing: map.getBearing(),
                zoom: map.getZoom(),
            };
        };

        const handleDrag = () => {
            const lock = panLockRef.current;
            if (!lock) return;
            map.jumpTo({
                pitch: lock.pitch,
                bearing: lock.bearing,
                zoom: lock.zoom,
            });
        };

        const handleDragEnd = () => {
            panLockRef.current = null;
        };

        map.on('dragstart', handleDragStart);
        map.on('drag', handleDrag);
        map.on('dragend', handleDragEnd);

        return () => {
            map.off('dragstart', handleDragStart);
            map.off('drag', handleDrag);
            map.off('dragend', handleDragEnd);
        };
    }, [terrainEnabled]);


    return (
        <div className={`relative w-full h-full ${className}`}>
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '100%' }}
            />
        </div>
    );
}

export default MapCore;
