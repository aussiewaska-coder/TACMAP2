import { useRef } from 'react';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

// Convert altitude (meters) to map zoom level
const altitudeToZoom = (alt: number): number => {
    // 500m = zoom 18, 100000m = zoom ~1
    return Math.max(0, Math.min(18, 18 - Math.log2(alt / 500)));
};

// Convert zoom to altitude (meters)
const zoomToAltitude = (zoom: number): number => {
    return 500 * Math.pow(2, 18 - zoom);
};

// Smooth easing for heading (handles wrap-around at 360°)
const easeHeading = (current: number, target: number, delta: number, rate: number): number => {
    // Calculate shortest angular distance
    let diff = ((target - current + 540) % 360) - 180;
    // Aircraft turn rate: ~3° per second at cruise, scaled by delta
    const maxTurn = rate * delta * 0.001; // rate degrees per second
    const turn = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
    return (current + turn + 360) % 360;
};

// Smooth easing for altitude (realistic climb/descent rate)
const easeAltitude = (current: number, target: number, delta: number, rate: number): number => {
    const diff = target - current;
    // Climb/descent rate: ~500m per second at max, scaled by delta
    const maxChange = rate * delta * 0.001; // rate meters per second
    return current + Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
};

// Smooth easing for pitch (camera tilt rate)
const easePitch = (current: number, target: number, delta: number, rate: number): number => {
    const diff = target - current;
    // Pitch rate: degrees per second
    const maxChange = rate * delta * 0.001;
    return current + Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
};

export function FlightButton() {
    const mode = useFlightMode();
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchActiveRef = useRef(false);

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);

        // Restore projection if saved
        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as 'mercator' | 'globe' });
        }

        store.setAnimationId(null);
        store.setPrevProjection(null);
        store.setMode('off');
    };

    const startPan = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();
        useFlightStore.getState().setMode('pan');

        let lastTime = 0;
        // Current smoothed values (what we actually apply to the map)
        let currentAltitude = zoomToAltitude(map.getZoom());
        let currentHeading = map.getBearing();
        let currentPitch = map.getPitch();
        let isAnimatingZoom = false; // Flag to ignore zoomend from our own animation

        // Track user zoom interactions - update current altitude ONLY when USER zooms (not our animation)
        const onZoomStart = () => {
            // If we're not animating, user initiated zoom
            if (!isAnimatingZoom) {
                useFlightStore.getState().setUserZooming(true);
            }
        };
        const onZoomEnd = () => {
            const userWasZooming = useFlightStore.getState().userZooming;
            useFlightStore.getState().setUserZooming(false);
            // Only update altitude if USER initiated the zoom (not terrain/our animation)
            if (userWasZooming) {
                const m = useMapStore.getState().map;
                if (m) {
                    currentAltitude = zoomToAltitude(m.getZoom());
                    useFlightStore.getState().setTargetAltitude(null);
                }
            }
        };
        map.on('zoomstart', onZoomStart);
        map.on('zoomend', onZoomEnd);

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || store.mode !== 'pan') {
                currentMap?.off('zoomstart', onZoomStart);
                currentMap?.off('zoomend', onZoomEnd);
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const speedFactor = (store.speed / 250) * 0.000001; // Reduced 10x for realistic speed
                const center = currentMap.getCenter();

                // Smooth heading toward target (45° per second turn rate)
                if (store.targetHeading !== null) {
                    currentHeading = easeHeading(currentHeading, store.targetHeading, delta, 45);
                } else {
                    currentHeading = currentMap.getBearing(); // Follow map if no target
                }

                // Smooth altitude toward target (2000m per second climb/descent)
                if (store.targetAltitude !== null) {
                    currentAltitude = easeAltitude(currentAltitude, store.targetAltitude, delta, 2000);
                }
                // DO NOT read altitude from map - terrain would affect it

                // Smooth pitch toward target (30° per second tilt rate)
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 30);
                } else {
                    currentPitch = currentMap.getPitch(); // Follow map if no target
                }

                // Move in the direction of CURRENT (smoothed) heading
                const bearingRad = (currentHeading * Math.PI) / 180;
                const moveDist = speedFactor * delta;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.cos(bearingRad) * moveDist));
                const newLng = center.lng + Math.sin(bearingRad) * moveDist;

                // Set flag so zoomend knows this is our animation, not user
                isAnimatingZoom = true;
                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: currentHeading,
                    zoom: altitudeToZoom(currentAltitude),
                    pitch: currentPitch
                });
                isAnimatingZoom = false;
            }

            lastTime = time;
            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
        };

        const id = requestAnimationFrame(animate);
        useFlightStore.getState().setAnimationId(id);
        toast.info('Flight: Pan mode - use controls to adjust');
    };

    const startSightseeing = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();

        // Save projection and switch to globe
        const proj = map.getProjection();
        const currentProj = typeof proj?.type === 'string' ? proj.type : 'mercator';
        useFlightStore.getState().setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });
        useFlightStore.getState().setMode('sightseeing');

        let lastTime = 0;
        let autoTargetBearing = map.getBearing();
        let waypoint = { lng: map.getCenter().lng, lat: map.getCenter().lat };
        let currentAltitude = zoomToAltitude(map.getZoom());
        let currentHeading = map.getBearing();
        let currentPitch = map.getPitch();
        let isAnimatingZoom = false;

        // Track user zoom interactions - ONLY update altitude when USER zooms
        const onZoomStart = () => {
            if (!isAnimatingZoom) {
                useFlightStore.getState().setUserZooming(true);
            }
        };
        const onZoomEnd = () => {
            const userWasZooming = useFlightStore.getState().userZooming;
            useFlightStore.getState().setUserZooming(false);
            if (userWasZooming) {
                const m = useMapStore.getState().map;
                if (m) {
                    currentAltitude = zoomToAltitude(m.getZoom());
                    useFlightStore.getState().setTargetAltitude(null);
                }
            }
        };
        map.on('zoomstart', onZoomStart);
        map.on('zoomend', onZoomEnd);

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || store.mode !== 'sightseeing') {
                currentMap?.off('zoomstart', onZoomStart);
                currentMap?.off('zoomend', onZoomEnd);
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();
                const speedFactor = store.speed / 250;

                // Distance to waypoint
                const dx = waypoint.lng - center.lng;
                const dy = waypoint.lat - center.lat;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Generate new waypoint when close
                if (dist < 0.02) {
                    const angle = Math.random() * 6.28;
                    waypoint = {
                        lng: ((center.lng + Math.cos(angle) * 0.15 + 180) % 360) - 180,
                        lat: Math.max(-85, Math.min(85, center.lat + Math.sin(angle) * 0.15))
                    };
                    autoTargetBearing = (autoTargetBearing + Math.random() * 90 - 45 + 360) % 360;
                }

                // Use store target heading if set by user, otherwise use auto waypoint heading
                const targetHeading = store.targetHeading !== null ? store.targetHeading : autoTargetBearing;
                currentHeading = easeHeading(currentHeading, targetHeading, delta, 30); // Slower turn in sightseeing

                // Smooth altitude toward target
                if (store.targetAltitude !== null) {
                    currentAltitude = easeAltitude(currentAltitude, store.targetAltitude, delta, 2000);
                }
                // DO NOT read altitude from map - terrain would affect it

                // Smooth pitch toward target (30° per second tilt rate)
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 30);
                } else {
                    currentPitch = currentMap.getPitch();
                }

                // Move toward waypoint
                const moveAngle = Math.atan2(dy, dx);
                const moveSpeed = 0.0000012 * delta * speedFactor; // Reduced 10x for realistic speed
                const newLng = center.lng + Math.cos(moveAngle) * moveSpeed;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.sin(moveAngle) * moveSpeed));

                isAnimatingZoom = true;
                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: currentHeading,
                    zoom: altitudeToZoom(currentAltitude),
                    pitch: currentPitch
                });
                isAnimatingZoom = false;
            }

            lastTime = time;
            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
        };

        const id = requestAnimationFrame(animate);
        useFlightStore.getState().setAnimationId(id);
        toast.info('Flight: Sightseeing mode');
    };

    const handleClick = () => {
        if (mode === 'off') {
            startPan();
        } else {
            stopFlight();
        }
    };

    const handleLongPress = () => {
        if (mode === 'off') {
            startSightseeing();
        } else {
            stopFlight();
        }
    };

    // Long press detection with touch/mouse handling
    const clearPressTimer = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const onPointerDown = (isTouch: boolean) => {
        if (isTouch) touchActiveRef.current = true;
        // Ignore mouse events if touch is active
        if (!isTouch && touchActiveRef.current) return;

        clearPressTimer();
        pressTimerRef.current = setTimeout(() => {
            handleLongPress();
            pressTimerRef.current = null;
        }, 500);
    };

    const onPointerUp = (isTouch: boolean) => {
        // Ignore mouse events if touch is active
        if (!isTouch && touchActiveRef.current) return;
        if (isTouch) touchActiveRef.current = false;

        if (pressTimerRef.current) {
            clearPressTimer();
            handleClick();
        }
    };

    const onPointerLeave = () => {
        clearPressTimer();
    };

    return (
        <Button
            variant={mode !== 'off' ? 'default' : 'outline'}
            size="icon"
            onMouseDown={() => onPointerDown(false)}
            onMouseUp={() => onPointerUp(false)}
            onMouseLeave={onPointerLeave}
            onTouchStart={() => onPointerDown(true)}
            onTouchEnd={() => onPointerUp(true)}
            title="Click: pan mode | Hold: sightseeing"
            className={`
                fixed bottom-6 right-4 w-14 h-14 rounded-2xl shadow-2xl select-none
                ${mode === 'pan' ? 'bg-blue-600 text-white' : ''}
                ${mode === 'sightseeing' ? 'bg-purple-600 text-white animate-pulse' : ''}
                ${mode === 'manual' ? 'bg-green-600 text-white' : ''}
                ${mode === 'off' ? 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );
}
