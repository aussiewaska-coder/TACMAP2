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

export function useFlight() {
    const map = useMapStore((state) => state.map);

    const mode = useFlightStore((state) => state.mode);
    const targetSpeed = useFlightStore((state) => state.targetSpeed);
    const targetHeading = useFlightStore((state) => state.targetHeading);
    const destination = useFlightStore((state) => state.destination);
    const previousProjection = useFlightStore((state) => state.previousProjection);

    const setMode = useFlightStore((state) => state.setMode);
    const updateTelemetry = useFlightStore((state) => state.updateTelemetry);
    const updateFlightProgress = useFlightStore((state) => state.updateFlightProgress);
    const setRouteGeometry = useFlightStore((state) => state.setRouteGeometry);
    const setPreviousProjection = useFlightStore((state) => state.setPreviousProjection);
    const stopFlightStore = useFlightStore((state) => state.stopFlight);

    // Refs for animation
    const flightRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const routeProgressRef = useRef<number>(0); // 0 to 1 for autopilot
    const isStartingRef = useRef<boolean>(false); // Prevent re-entry

    // Remove route layer from map (defined first since stopFlight depends on it)
    const removeRouteLayer = useCallback(() => {
        if (!map || !map.getStyle()) return;

        try {
            if (map.getLayer(ROUTE_LAYER_ID)) {
                map.removeLayer(ROUTE_LAYER_ID);
            }
            if (map.getSource(ROUTE_SOURCE_ID)) {
                map.removeSource(ROUTE_SOURCE_ID);
            }
        } catch (e) {
            // Ignore errors if layer/source don't exist
        }

        setRouteGeometry(null);
    }, [map, setRouteGeometry]);

    // Stop flight and clean up
    const stopFlight = useCallback(() => {
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;
        routeProgressRef.current = 0;

        // Restore previous projection
        if (previousProjection && map) {
            try {
                map.setProjection({ type: previousProjection as any });
            } catch (e) {
                // Ignore projection errors
            }
            setPreviousProjection(null);
        }

        // Remove route layer
        removeRouteLayer();

        stopFlightStore();
    }, [map, previousProjection, setPreviousProjection, stopFlightStore, removeRouteLayer]);

    // Add route layer to map
    const addRouteLayer = useCallback((geometry: GeoJSON.LineString) => {
        if (!map || !map.getStyle()) return;

        // Remove existing layer if any
        removeRouteLayer();

        // Add source
        map.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry,
            },
        });

        // Add layer with dashed cyan line
        map.addLayer({
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

        setRouteGeometry(geometry);
    }, [map, setRouteGeometry, removeRouteLayer]);

    // Manual flight animation
    const startManualFlight = useCallback(() => {
        if (!map || isStartingRef.current) return;
        isStartingRef.current = true;

        // Cancel any existing animation
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;

        const go = (timestamp: number) => {
            if (!map) return;

            const currentSpeed = useFlightStore.getState().targetSpeed;
            const currentHeading = useFlightStore.getState().targetHeading;

            if (lastTimeRef.current) {
                const delta = Math.min(timestamp - lastTimeRef.current, 50); // Cap at 50ms
                const center = map.getCenter();

                // Calculate speed in degrees per ms
                const degPerMs = speedToDegreesPerMs(currentSpeed);
                const distance = degPerMs * delta * 111320; // Rough meters per degree at equator

                // Calculate new position based on heading
                const newPos = destinationPoint(
                    [center.lng, center.lat],
                    currentHeading,
                    distance
                );

                // Clamp latitude
                newPos[1] = Math.max(-85, Math.min(85, newPos[1]));

                // Get current bearing and smoothly interpolate toward target heading
                const currentBearing = map.getBearing();
                const bearingDiff = ((currentHeading - currentBearing + 540) % 360) - 180;
                const newBearing = currentBearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.05 * delta);

                map.jumpTo({
                    center: newPos,
                    bearing: newBearing,
                });

                // Update telemetry
                updateTelemetry({
                    currentSpeed,
                    currentHeading: newBearing,
                    currentPosition: newPos,
                    currentAltitude: useFlightStore.getState().targetAltitude,
                });
            }

            lastTimeRef.current = timestamp;
            flightRef.current = requestAnimationFrame(go);
        };

        flightRef.current = requestAnimationFrame(go);
        isStartingRef.current = false;
        toast.info('Manual flight engaged');
    }, [map, updateTelemetry]);

    // Autopilot flight animation
    const startAutopilotFlight = useCallback(() => {
        if (!map || !destination || isStartingRef.current) return;
        isStartingRef.current = true;

        // Cancel any existing animation
        if (flightRef.current) {
            cancelAnimationFrame(flightRef.current);
            flightRef.current = null;
        }
        lastTimeRef.current = 0;
        routeProgressRef.current = 0;

        // Save current projection and switch to globe
        const currentProj = map.getProjection()?.type || 'mercator';
        setPreviousProjection(currentProj);
        map.setProjection({ type: 'globe' });

        // Get current position and calculate route
        const start: [number, number] = [map.getCenter().lng, map.getCenter().lat];
        const end = destination.coordinates;
        const routeGeometry = greatCirclePath(start, end, 100);
        const totalDistance = greatCircleDistance(start, end);

        addRouteLayer(routeGeometry);
        routeProgressRef.current = 0;

        const go = (timestamp: number) => {
            if (!map) return;

            const currentSpeed = useFlightStore.getState().targetSpeed;

            if (lastTimeRef.current) {
                const delta = Math.min(timestamp - lastTimeRef.current, 50);

                // Calculate progress increment based on speed
                const metersPerMs = (currentSpeed * 1000) / 3600000; // km/h to m/ms
                const progressIncrement = (metersPerMs * delta) / totalDistance;
                routeProgressRef.current = Math.min(1, routeProgressRef.current + progressIncrement);

                // Interpolate position along route
                const newPos = greatCircleInterpolate(start, end, routeProgressRef.current);

                // Calculate bearing toward destination
                const targetBearing = greatCircleBearing(newPos, end);
                const currentBearing = map.getBearing();
                const bearingDiff = ((targetBearing - currentBearing + 540) % 360) - 180;
                const newBearing = currentBearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.03 * delta);

                // Smooth zoom based on distance
                const distanceRemaining = totalDistance * (1 - routeProgressRef.current);
                const targetZoom = distanceRemaining > 1000000 ? 3 : // > 1000km
                                   distanceRemaining > 100000 ? 5 :  // > 100km
                                   distanceRemaining > 10000 ? 8 :   // > 10km
                                   11;
                const currentZoom = map.getZoom();
                const zoomDiff = targetZoom - currentZoom;
                const newZoom = currentZoom + Math.sign(zoomDiff) * Math.min(Math.abs(zoomDiff), 0.002 * delta);

                map.jumpTo({
                    center: newPos,
                    bearing: newBearing,
                    zoom: newZoom,
                });

                // Update telemetry
                updateTelemetry({
                    currentSpeed,
                    currentHeading: newBearing,
                    currentPosition: newPos,
                    currentAltitude: useFlightStore.getState().targetAltitude,
                });

                // Update progress
                const etaSeconds = distanceRemaining / (metersPerMs * 1000);
                updateFlightProgress(distanceRemaining, etaSeconds);

                // Check if arrived
                if (routeProgressRef.current >= 1) {
                    toast.success(`Arrived at ${destination.name}`);
                    stopFlight();
                    return;
                }
            }

            lastTimeRef.current = timestamp;
            flightRef.current = requestAnimationFrame(go);
        };

        flightRef.current = requestAnimationFrame(go);
        isStartingRef.current = false;
        toast.info(`Autopilot: Flying to ${destination.name}`);
    }, [map, destination, setPreviousProjection, addRouteLayer, updateTelemetry, updateFlightProgress, stopFlight]);

    // Handle mode changes
    useEffect(() => {
        // Don't do anything if map isn't ready
        if (!map) return;

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
        if (!map) return;

        const stop = () => {
            if (flightRef.current) {
                stopFlight();
            }
        };

        map.on('dragstart', stop);
        map.on('wheel', stop);
        map.on('dblclick', stop);
        map.on('touchstart', stop);

        return () => {
            map.off('dragstart', stop);
            map.off('wheel', stop);
            map.off('dblclick', stop);
            map.off('touchstart', stop);
        };
    }, [map, stopFlight]);

    // Initialize telemetry from current map position
    useEffect(() => {
        if (!map) return;

        const center = map.getCenter();
        updateTelemetry({
            currentPosition: [center.lng, center.lat],
            currentHeading: map.getBearing(),
            currentSpeed: 0,
            currentAltitude: 10000,
        });
    }, [map, updateTelemetry]);

    return {
        stopFlight,
        startManualFlight,
        startAutopilotFlight,
    };
}
