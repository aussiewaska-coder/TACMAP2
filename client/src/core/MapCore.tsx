// MapCore - Minimal base map component
// This component ONLY handles map initialization and cleanup
// All features are added via plugins

import { useEffect, useRef, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

import { MAP_CONFIG } from '@/core/constants';
import { useMapStore, useMapProviderStore, useFlightControlStore } from '@/stores';
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

function startMaptilerDrift(map: maptilersdk.Map, shouldOrbit: () => boolean) {
    let isOrbiting = true;
    let orbitTimeoutId: number | null = null;
    let orbitAngle = 0;

    const ORBIT_RADIUS_PERCENT = 0.02;  // 2% of screen for subtle orbit
    const ORBIT_DURATION = 60000;  // 60 seconds for full rotation = smooth
    const SEGMENT_ANGLE = 10;  // 10° per segment = 6 segments per rotation
    const SEGMENT_DURATION = (ORBIT_DURATION * SEGMENT_ANGLE) / 360;  // Time per segment

    const orbitSegment = () => {
        if (!isOrbiting || !shouldOrbit()) return;
        const canvas = map.getCanvas();
        if (!canvas) return;

        const center = map.getCenter();
        const centerPoint = map.project(center);
        const radius = Math.min(canvas.width, canvas.height) * ORBIT_RADIUS_PERCENT;

        // Calculate next position on the circle
        const targetPoint: [number, number] = [
            centerPoint.x + Math.cos((orbitAngle * Math.PI) / 180) * radius,
            centerPoint.y + Math.sin((orbitAngle * Math.PI) / 180) * radius,
        ];
        const target = map.unproject(targetPoint);

        map.easeTo({
            center: target,
            duration: SEGMENT_DURATION,
            easing: (t) => t,  // Linear easing for smooth continuous motion
        });

        orbitAngle += SEGMENT_ANGLE;
        if (orbitAngle >= 360) orbitAngle = 0;

        // Schedule next segment
        orbitTimeoutId = window.setTimeout(orbitSegment, SEGMENT_DURATION) as unknown as number;
    };

    const pause = () => {
        isOrbiting = false;
        if (orbitTimeoutId !== null) {
            window.clearTimeout(orbitTimeoutId);
            orbitTimeoutId = null;
        }
    };

    const resume = () => {
        if (isOrbiting || !shouldOrbit()) return;
        isOrbiting = true;
        orbitSegment();
    };

    // Pause on user interaction
    map.on('dragstart', pause);
    map.on('mousedown', pause);
    map.on('touchstart', pause);
    map.on('wheel', pause);
    map.on('zoomstart', pause);

    // Resume when user stops interacting
    const resumeHandler = () => {
        if (!isOrbiting) {
            resume();
        }
    };
    map.on('dragend', resumeHandler);
    map.on('mouseup', resumeHandler);
    map.on('touchend', resumeHandler);
    map.on('zoomend', resumeHandler);

    // Start orbiting
    orbitSegment();

    // Return cleanup function
    return () => {
        isOrbiting = false;
        if (orbitTimeoutId !== null) window.clearTimeout(orbitTimeoutId);
        map.off('dragstart', pause);
        map.off('mousedown', pause);
        map.off('touchstart', pause);
        map.off('wheel', pause);
        map.off('zoomstart', pause);
        map.off('dragend', resumeHandler);
        map.off('mouseup', resumeHandler);
        map.off('touchend', resumeHandler);
        map.off('zoomend', resumeHandler);
    };
}

/**
 * Resolve MapTiler style - use server proxy with Redis caching & fallback
 *
 * ✅ ALWAYS uses /api/maptiler-proxy (even in dev)
 * - Caches responses in Redis for 24 hours
 * - Returns cached data when API rate limit (429) is hit
 * - Fallback to OpenStreetMap if all else fails
 * - No CORS issues (server-to-server requests)
 *
 * This ensures the map ALWAYS renders even if MapTiler API is down
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
        usingProxy: true,
    });

    // ✅ Use Vercel serverless endpoint with Redis caching
    // Endpoint handles: caching, MapTiler fallback, style transformation
    // IMPORTANT: Return ABSOLUTE URL so MapTiler SDK doesn't prepend its domain
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    const absoluteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/maptiler/style?styleId=${styleId}&key=${apiKey}`
        : `/api/maptiler/style?styleId=${styleId}&key=${apiKey}`;
    return absoluteUrl;
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
    const flightModeRef = useRef<string>('standard');

    const setMap = useMapStore((state) => state.setMap);
    const setLoaded = useMapStore((state) => state.setLoaded);
    const setInitializing = useMapStore((state) => state.setInitializing);
    const setError = useMapStore((state) => state.setError);
    const updateViewState = useMapStore((state) => state.updateViewState);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);
    const maptilerStyle = useMapProviderStore((state) => state.maptilerStyle);
    const activeFlightMode = useFlightControlStore((state) => state.activeMode);


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

                // Only orbit when NOT in flight mode
                driftCleanupRef.current = startMaptilerDrift(map, () => flightModeRef.current !== 'flight');

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

    // Update flight mode ref for orbit logic
    useEffect(() => {
        flightModeRef.current = activeFlightMode;
    }, [activeFlightMode]);

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
