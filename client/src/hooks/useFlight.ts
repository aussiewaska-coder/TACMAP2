// useFlight - Flight animation hook for tactical flight command
// Manages manual and autopilot flight modes with smooth animations

import { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores';
import { useFlightStore } from '@/stores/flightStore';
import { toast } from 'sonner';
import {
    greatCircleDistance,
    greatCircleBearing,
    greatCirclePath,
    greatCircleInterpolate,
    speedToDegreesPerMs,
    destinationPoint,
} from '@/utils/geodesic';

// Route layer configuration
const ROUTE_SOURCE_ID = 'flight-route-source';
const ROUTE_LAYER_ID = 'flight-route-layer';

// Helper to check if map is valid and ready for operations
function isMapReady(map: maplibregl.Map | null): map is maplibregl.Map {
    if (!map) return false;
    try {
        // Check if map is not removed and has a valid style
        return !!map.getStyle();
    } catch {
        return false;
    }
}

export function useFlight() {
    const map = useMapStore((state) => state.map);

    const mode = useFlightStore((state) => state.mode);
    const destination = useFlightStore((state) => state.destination);
    const previousProjection = useFlightStore((state) => state.previousProjection);

    const updateTelemetry = useFlightStore((state) => state.updateTelemetry);
    const updateFlightProgress = useFlightStore((state) => state.updateFlightProgress);
    const setRouteGeometry = useFlightStore((state) => state.setRouteGeometry);
    const setPreviousProjection = useFlightStore((state) => state.setPreviousProjection);
    const stopFlightStore = useFlightStore((state) => state.stopFlight);

    // Refs for animation and mount state
    const flightRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const routeProgressRef = useRef<number>(0);
    const isStartingRef = useRef<boolean>(false);
    const isMountedRef = useRef<boolean>(true);

    // Track mount state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Remove route layer from map - reads map directly from store to avoid stale closures
    const removeRouteLayer = useCallback(() => {
        const currentMap = useMapStore.getState().map;
        if (!isMapReady(currentMap)) return;

        try {
            if (currentMap.getLayer(ROUTE_LAYER_ID)) {
                currentMap.removeLayer(ROUTE_LAYER_ID);
            }
            if (currentMap.getSource(ROUTE_SOURCE_ID)) {
                currentMap.removeSource(ROUTE_SOURCE_ID);
            }
        } catch (e) {
            // Ignore errors - map may be in invalid state
        }

        if (isMountedRef.current) {
            setRouteGeometry(null);
        }
    }, [setRouteGeometry]);

    // Stop flight and clean up
    const stopFlight = useCallback(() => {
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;
        routeProgressRef.current = 0;

        const currentMap = useMapStore.getState().map;
        const prevProj = useFlightStore.getState().previousProjection;

        // Restore previous projection
        if (prevProj && isMapReady(currentMap)) {
            try {
                currentMap.setProjection({ type: prevProj as any });
            } catch (e) {
                // Ignore projection errors
            }
            if (isMountedRef.current) {
                setPreviousProjection(null);
            }
        }

        // Remove route layer
        removeRouteLayer();

        if (isMountedRef.current) {
            stopFlightStore();
        }
    }, [setPreviousProjection, stopFlightStore, removeRouteLayer]);

    // Add route layer to map
    const addRouteLayer = useCallback((geometry: GeoJSON.LineString) => {
        const currentMap = useMapStore.getState().map;
        if (!isMapReady(currentMap)) return;

        // Remove existing layer if any
        removeRouteLayer();

        try {
            // Add source
            currentMap.addSource(ROUTE_SOURCE_ID, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry,
                },
            });

            // Add layer with dashed cyan line
            currentMap.addLayer({
                id: ROUTE_LAYER_ID,
                type: 'line',
                source: ROUTE_SOURCE_ID,
                paint: {
                    'line-color': '#00ffff',
                    'line-width': 3,
                    'line-opacity': 0.7,
                    'line-dasharray': [2, 2],
                },
            });

            if (isMountedRef.current) {
                setRouteGeometry(geometry);
            }
        } catch (e) {
            // Ignore errors if map is in invalid state
        }
    }, [setRouteGeometry, removeRouteLayer]);

    // Manual flight animation
    const startManualFlight = useCallback(() => {
        const currentMap = useMapStore.getState().map;
        if (!isMapReady(currentMap) || isStartingRef.current) return;
        isStartingRef.current = true;

        // Cancel any existing animation
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;

        const go = (timestamp: number) => {
            const mapNow = useMapStore.getState().map;
            if (!isMapReady(mapNow) || !isMountedRef.current) {
                flightRef.current = null;
                return;
            }

            const currentSpeed = useFlightStore.getState().targetSpeed;
            const currentHeading = useFlightStore.getState().targetHeading;

            if (lastTimeRef.current) {
                const delta = Math.min(timestamp - lastTimeRef.current, 50);
                const center = mapNow.getCenter();

                const degPerMs = speedToDegreesPerMs(currentSpeed);
                const distance = degPerMs * delta * 111320;

                const newPos = destinationPoint(
                    [center.lng, center.lat],
                    currentHeading,
                    distance
                );

                newPos[1] = Math.max(-85, Math.min(85, newPos[1]));

                const currentBearing = mapNow.getBearing();
                const bearingDiff = ((currentHeading - currentBearing + 540) % 360) - 180;
                const newBearing = currentBearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.05 * delta);

                try {
                    mapNow.jumpTo({
                        center: newPos,
                        bearing: newBearing,
                    });
                } catch (e) {
                    flightRef.current = null;
                    return;
                }

                if (isMountedRef.current) {
                    updateTelemetry({
                        currentSpeed,
                        currentHeading: newBearing,
                        currentPosition: newPos,
                        currentAltitude: useFlightStore.getState().targetAltitude,
                    });
                }
            }

            lastTimeRef.current = timestamp;
            flightRef.current = requestAnimationFrame(go);
        };

        flightRef.current = requestAnimationFrame(go);
        isStartingRef.current = false;
        toast.info('Manual flight engaged');
    }, [updateTelemetry]);

    // Autopilot flight animation
    const startAutopilotFlight = useCallback(() => {
        const currentMap = useMapStore.getState().map;
        const dest = useFlightStore.getState().destination;
        if (!isMapReady(currentMap) || !dest || isStartingRef.current) return;
        isStartingRef.current = true;

        // Cancel any existing animation
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;
        routeProgressRef.current = 0;

        try {
            // Save current projection and switch to globe
            const currentProj = currentMap.getProjection()?.type || 'mercator';
            setPreviousProjection(currentProj);
            currentMap.setProjection({ type: 'globe' });
        } catch (e) {
            isStartingRef.current = false;
            return;
        }

        // Get current position and calculate route
        const start: [number, number] = [currentMap.getCenter().lng, currentMap.getCenter().lat];
        const end = dest.coordinates;
        const routeGeometry = greatCirclePath(start, end, 100);
        const totalDistance = greatCircleDistance(start, end);

        addRouteLayer(routeGeometry);

        const go = (timestamp: number) => {
            const mapNow = useMapStore.getState().map;
            const destNow = useFlightStore.getState().destination;
            if (!isMapReady(mapNow) || !isMountedRef.current) {
                flightRef.current = null;
                return;
            }

            const currentSpeed = useFlightStore.getState().targetSpeed;

            if (lastTimeRef.current) {
                const delta = Math.min(timestamp - lastTimeRef.current, 50);

                const metersPerMs = (currentSpeed * 1000) / 3600000;
                const progressIncrement = (metersPerMs * delta) / totalDistance;
                routeProgressRef.current = Math.min(1, routeProgressRef.current + progressIncrement);

                const newPos = greatCircleInterpolate(start, end, routeProgressRef.current);

                const targetBearing = greatCircleBearing(newPos, end);
                const currentBearing = mapNow.getBearing();
                const bearingDiff = ((targetBearing - currentBearing + 540) % 360) - 180;
                const newBearing = currentBearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.03 * delta);

                const distanceRemaining = totalDistance * (1 - routeProgressRef.current);
                const targetZoom = distanceRemaining > 1000000 ? 3 :
                                   distanceRemaining > 100000 ? 5 :
                                   distanceRemaining > 10000 ? 8 : 11;
                const currentZoom = mapNow.getZoom();
                const zoomDiff = targetZoom - currentZoom;
                const newZoom = currentZoom + Math.sign(zoomDiff) * Math.min(Math.abs(zoomDiff), 0.002 * delta);

                try {
                    mapNow.jumpTo({
                        center: newPos,
                        bearing: newBearing,
                        zoom: newZoom,
                    });
                } catch (e) {
                    flightRef.current = null;
                    return;
                }

                if (isMountedRef.current) {
                    updateTelemetry({
                        currentSpeed,
                        currentHeading: newBearing,
                        currentPosition: newPos,
                        currentAltitude: useFlightStore.getState().targetAltitude,
                    });

                    const etaSeconds = distanceRemaining / (metersPerMs * 1000);
                    updateFlightProgress(distanceRemaining, etaSeconds);
                }

                if (routeProgressRef.current >= 1) {
                    toast.success(`Arrived at ${destNow?.name || 'destination'}`);
                    stopFlight();
                    return;
                }
            }

            lastTimeRef.current = timestamp;
            flightRef.current = requestAnimationFrame(go);
        };

        flightRef.current = requestAnimationFrame(go);
        isStartingRef.current = false;
        toast.info(`Autopilot: Flying to ${dest.name}`);
    }, [setPreviousProjection, addRouteLayer, updateTelemetry, updateFlightProgress, stopFlight]);

    // Handle mode changes
    useEffect(() => {
        // Don't do anything if map isn't ready
        const currentMap = useMapStore.getState().map;
        if (!isMapReady(currentMap)) return;

        // Skip if already animating (prevents re-entry)
        if (flightRef.current && mode !== 'off') return;

        if (mode === 'off') {
            // Only call stopFlight if there's actually something to stop
            if (flightRef.current) {
                stopFlight();
            }
        } else if (mode === 'manual') {
            startManualFlight();
        } else if (mode === 'autopilot' && destination) {
            startAutopilotFlight();
        }

        return () => {
            if (flightRef.current) {
                cancelAnimationFrame(flightRef.current);
                flightRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, destination, map]);

    // Stop flight on user map interaction
    useEffect(() => {
        if (!isMapReady(map)) return;

        const stop = () => {
            if (flightRef.current) {
                stopFlight();
            }
        };

        try {
            map.on('dragstart', stop);
            map.on('wheel', stop);
            map.on('dblclick', stop);
            map.on('touchstart', stop);
        } catch (e) {
            return;
        }

        return () => {
            try {
                map.off('dragstart', stop);
                map.off('wheel', stop);
                map.off('dblclick', stop);
                map.off('touchstart', stop);
            } catch (e) {
                // Map may already be destroyed
            }
        };
    }, [map, stopFlight]);

    // Initialize telemetry from current map position
    useEffect(() => {
        if (!isMapReady(map)) return;

        try {
            const center = map.getCenter();
            updateTelemetry({
                currentPosition: [center.lng, center.lat],
                currentHeading: map.getBearing(),
                currentSpeed: 0,
                currentAltitude: 10000,
            });
        } catch (e) {
            // Map may be in invalid state
        }
    }, [map, updateTelemetry]);

    return {
        stopFlight,
        startManualFlight,
        startAutopilotFlight,
    };
}
