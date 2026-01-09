import { useRef, useEffect } from 'react';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';
import type { MapMouseEvent } from 'maplibre-gl';

// Smooth easing for heading (handles wrap-around at 360°) - exponential ease for smooth start/stop
const easeHeading = (current: number, target: number, delta: number, smoothing: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    if (Math.abs(diff) < 0.5) return target; // Snap when very close
    // Exponential ease - smooth acceleration and deceleration
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    const turn = diff * ease;
    return (current + turn + 360) % 360;
};

// Smooth easing for pitch - exponential ease for natural feel
const easePitch = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 0.5) return target; // Snap when very close
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

// Smooth easing for zoom - graceful exponential ease-out like flying
const easeZoom = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 0.01) return target; // Snap when close
    // Exponential ease-out: moves fast at start, slows gracefully as it approaches target
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

// Smooth easing for speed - exponential for natural throttle feel
const easeSpeed = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 1) return target; // Snap when very close
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

export function FlightButton() {
    const mode = useFlightMode();
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchActiveRef = useRef(false);

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);
        if (store.transitionTimeoutId) clearTimeout(store.transitionTimeoutId);

        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as 'mercator' | 'globe' });
            // Clear custom fog settings
            map.setFog(null);
        }

        store.setAnimationId(null);
        store.setTransitionTimeoutId(null);
        store.setPrevProjection(null);
        store.setMode('off');
    };

    // PAN MODE - moves forward, controls zoom via easing
    const startPan = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();

        // Switch to globe projection
        const proj = map.getProjection();
        const currentProj = typeof proj?.type === 'string' ? proj.type : 'mercator';

        // Set default flight parameters: 3K altitude, 280 speed, 70° tilt, keep current heading
        const store = useFlightStore.getState();
        store.setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });

        // Push fog far away so it's not annoying at flight altitudes
        map.setFog({
            range: [2, 20], // Start fog at zoom 2, full at zoom 20 (very far)
            color: '#ffffff',
            'high-color': '#245cdf',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.2
        });

        store.setMode('pan');
        store.setTargetAltitude(13);    // 3K feet = zoom 13
        store.setSpeed(280);            // Set actual speed
        store.setTargetSpeed(280);      // Set target so easing works
        store.setTargetPitch(70);       // 70° tilt
        // Don't set targetHeading - keep current map direction

        // Store initial values - these are the SOURCE OF TRUTH, never read from map again
        let lastTime = 0;
        let currentHeading = map.getBearing();  // Retain current direction
        let currentPitch = 70;                  // Force to target pitch
        let currentZoom = 13;                   // Force to target zoom - DON'T read from map
        let currentSpeed = 280;

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || store.mode !== 'pan') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();

                // Heading easing - smooth start/stop, NEVER read from map
                if (store.targetHeading !== null) {
                    currentHeading = easeHeading(currentHeading, store.targetHeading, delta, 0.15);
                }
                // else: keep currentHeading as-is

                // Pitch easing - smooth exponential, NEVER read from map
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 0.12);
                }
                // else: keep currentPitch as-is

                // Zoom easing - NEVER read from map, terrain causes drift
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.012);
                }
                // else: keep currentZoom as-is

                // Speed easing - smooth exponential for natural throttle
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 0.2);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                // Move forward based on speed - scale by zoom (higher zoom = need more speed to see movement)
                const bearingRad = (currentHeading * Math.PI) / 180;
                const zoomScale = Math.pow(2, (currentZoom - 10) * 0.5); // Scale speed at high zoom
                const speedFactor = (currentSpeed / 250) * 0.000001 * zoomScale;
                const moveDist = speedFactor * delta;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.cos(bearingRad) * moveDist));
                const newLng = center.lng + Math.sin(bearingRad) * moveDist;

                // Apply all values including zoom
                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: currentHeading,
                    pitch: currentPitch,
                    zoom: currentZoom
                });
            }

            lastTime = time;
            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
        };

        const id = requestAnimationFrame(animate);
        useFlightStore.getState().setAnimationId(id);
        toast.info('Flight: Pan mode');
    };

    // ORBIT MODE - circles around a center point
    const startOrbit = (center?: [number, number], skipTransition = false) => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();

        // Switch to globe projection
        const proj = map.getProjection();
        const currentProj = typeof proj?.type === 'string' ? proj.type : 'mercator';

        const store = useFlightStore.getState();
        store.setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });

        // Push fog far away so it's not annoying at flight altitudes
        map.setFog({
            range: [2, 20],
            color: '#ffffff',
            'high-color': '#245cdf',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.2
        });

        // Use provided center, existing orbit center, or screen center
        const orbitCenter: [number, number] = center || store.orbitCenter || [map.getCenter().lng, map.getCenter().lat];
        const radius = store.orbitRadius;
        const startAngle = store.orbitAngle;

        // Calculate starting position on orbit circle
        const startAngleRad = (startAngle * Math.PI) / 180;
        const startLng = orbitCenter[0] + radius * Math.cos(startAngleRad);
        const startLat = Math.max(-85, Math.min(85, orbitCenter[1] + radius * Math.sin(startAngleRad)));
        const startHeading = (270 - startAngle + 360) % 360;

        store.setOrbitCenter(orbitCenter);
        store.setMode('orbit');
        store.setTargetAltitude(13);    // 3K feet = zoom 13
        store.setSpeed(280);
        store.setTargetSpeed(280);
        store.setTargetPitch(60);       // 60° tilt for good orbit view

        // Ease to starting orbit position first (unless skipping transition)
        if (!skipTransition) {
            map.flyTo({
                center: [startLng, startLat],
                bearing: startHeading,
                pitch: 60,
                zoom: 13,
                duration: 1500,
                essential: true
            });
        }

        // Start orbit animation after transition
        const startDelay = skipTransition ? 0 : 1600;

        const timeoutId = window.setTimeout(() => {
            // Clear the timeout ID since we're now executing
            useFlightStore.getState().setTransitionTimeoutId(null);
            // Re-check mode in case user cancelled during transition
            if (useFlightStore.getState().mode !== 'orbit') return;

            let lastTime = 0;
            let currentAngle = store.orbitAngle;
            let currentPitch = 60;
            let currentZoom = 13;
            let currentSpeed = 280;

            const animate = (time: number) => {
                const currentMap = useMapStore.getState().map;
                const store = useFlightStore.getState();

                if (!currentMap || store.mode !== 'orbit') {
                    useFlightStore.getState().setAnimationId(null);
                    return;
                }

                if (lastTime) {
                    const delta = Math.min(time - lastTime, 50);
                    const center = store.orbitCenter;
                    if (!center) return;

                    // Read dynamic values from store (can be changed during flight)
                    const radius = store.orbitRadius;
                    const clockwise = store.orbitClockwise;

                    // Pitch easing
                    if (store.targetPitch !== null) {
                        currentPitch = easePitch(currentPitch, store.targetPitch, delta, 0.12);
                    }

                    // Zoom easing
                    if (store.targetAltitude !== null) {
                        currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.012);
                    }

                    // Speed easing
                    if (store.targetSpeed !== null) {
                        currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 0.2);
                        store.setSpeed(currentSpeed);
                    } else {
                        currentSpeed = store.speed;
                    }

                    // Calculate angular velocity based on speed and radius
                    // Speed in km/h, radius in degrees (~111km per degree at equator)
                    const radiusKm = radius * 111; // Approximate km
                    const circumference = 2 * Math.PI * radiusKm;
                    const degreesPerMs = (currentSpeed / 3600000) / circumference * 360; // degrees per ms
                    const angleIncrement = degreesPerMs * delta * (clockwise ? 1 : -1);

                    currentAngle = (currentAngle + angleIncrement + 360) % 360;
                    store.setOrbitAngle(currentAngle);

                    // Calculate camera position on the orbit circle
                    // Math coords: 0° = east, 90° = north (counter-clockwise from east)
                    const angleRad = (currentAngle * Math.PI) / 180;
                    const cameraLng = center[0] + radius * Math.cos(angleRad);
                    const cameraLat = Math.max(-85, Math.min(85, center[1] + radius * Math.sin(angleRad)));

                    // Heading always faces toward center point (cinematic orbit)
                    // From angle position, look 180° opposite direction toward center
                    // Math angle to compass bearing: bearing = 90° - angle (east=0° in math, but 90° in compass)
                    // Plus 180° to face inward = (270° - angle)
                    const headingToCenter = (270 - currentAngle + 360) % 360;

                    currentMap.jumpTo({
                        center: [cameraLng, cameraLat],
                        bearing: headingToCenter,
                        pitch: currentPitch,
                        zoom: currentZoom
                    });
                }

                lastTime = time;
                const id = requestAnimationFrame(animate);
                useFlightStore.getState().setAnimationId(id);
            };

            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
            toast.info('Flight: Orbit mode');
        }, startDelay);

        // Store timeout ID so it can be cancelled
        store.setTransitionTimeoutId(timeoutId);
    };

    // Expose startOrbit globally so dashboard can trigger it
    (window as { startOrbit?: typeof startOrbit }).startOrbit = startOrbit;

    // Store startOrbit in a ref so useEffect can access latest version
    const startOrbitRef = useRef(startOrbit);
    startOrbitRef.current = startOrbit;

    // Handle map interactions when flight mode is active
    useEffect(() => {
        const map = useMapStore.getState().map;
        if (!map) return;

        // Only set up handlers when flight is active
        if (mode === 'off') {
            map.doubleClickZoom.enable();
            return;
        }

        // Double-click sets orbit center
        const handleDblClick = (e: MapMouseEvent) => {
            e.preventDefault();

            const lngLat = e.lngLat;
            const clickedCenter: [number, number] = [lngLat.lng, lngLat.lat];

            // Stop current flight
            stopFlight();

            // First fly to the location, then start orbiting
            map.flyTo({
                center: clickedCenter,
                zoom: 13,
                pitch: 60,
                duration: 2000,
                essential: true
            });

            // After fly animation, start orbit (skip transition since we just flew there)
            setTimeout(() => {
                startOrbitRef.current(clickedCenter, true);
            }, 2100);

            toast.info('Flying to orbit point...');
        };

        // Stop flight on user map interactions (drag, wheel, touch)
        const handleDragStart = () => {
            stopFlight();
            toast.info('Flight stopped');
        };

        // Disable default double-click zoom when flight is active
        map.doubleClickZoom.disable();
        map.on('dblclick', handleDblClick);
        map.on('dragstart', handleDragStart);

        return () => {
            map.off('dblclick', handleDblClick);
            map.off('dragstart', handleDragStart);
        };
    }, [mode]);

    // SIGHTSEEING MODE - wanders around, controls zoom via easing
    const startSightseeing = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();

        const proj = map.getProjection();
        const currentProj = typeof proj?.type === 'string' ? proj.type : 'mercator';

        // Set default flight parameters: 3K altitude, 280 speed, 70° tilt
        const store = useFlightStore.getState();
        store.setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });

        // Push fog far away so it's not annoying at flight altitudes
        map.setFog({
            range: [2, 20],
            color: '#ffffff',
            'high-color': '#245cdf',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.2
        });

        store.setMode('sightseeing');
        store.setTargetAltitude(13);    // 3K feet = zoom 13
        store.setSpeed(280);            // Set actual speed
        store.setTargetSpeed(280);      // Set target so easing works
        store.setTargetPitch(70);       // 70° tilt

        // Store initial values - these are the SOURCE OF TRUTH, never read from map again
        let lastTime = 0;
        let autoTargetBearing = map.getBearing();
        let waypoint = { lng: map.getCenter().lng, lat: map.getCenter().lat };
        let currentHeading = map.getBearing();
        let currentPitch = 70;          // Force to target pitch
        let currentZoom = 13;           // Force to target zoom - DON'T read from map
        let currentSpeed = 280;

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || store.mode !== 'sightseeing') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();

                // Waypoint logic
                const dx = waypoint.lng - center.lng;
                const dy = waypoint.lat - center.lat;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.02) {
                    const angle = Math.random() * 6.28;
                    waypoint = {
                        lng: ((center.lng + Math.cos(angle) * 0.15 + 180) % 360) - 180,
                        lat: Math.max(-85, Math.min(85, center.lat + Math.sin(angle) * 0.15))
                    };
                    autoTargetBearing = (autoTargetBearing + Math.random() * 90 - 45 + 360) % 360;
                }

                // Heading - smooth start/stop, NEVER read from map
                const targetHeading = store.targetHeading !== null ? store.targetHeading : autoTargetBearing;
                currentHeading = easeHeading(currentHeading, targetHeading, delta, 0.12);

                // Pitch - smooth exponential, NEVER read from map
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 0.12);
                }
                // else: keep currentPitch as-is

                // Zoom easing - NEVER read from map, terrain causes drift
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.012);
                }
                // else: keep currentZoom as-is

                // Speed easing - smooth exponential for natural throttle
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 0.2);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                // Move toward waypoint - scale by zoom (higher zoom = need more speed to see movement)
                const moveAngle = Math.atan2(dy, dx);
                const zoomScale = Math.pow(2, (currentZoom - 10) * 0.5);
                const speedFactor = currentSpeed / 250;
                const moveSpeed = 0.0000012 * delta * speedFactor * zoomScale;
                const newLng = center.lng + Math.cos(moveAngle) * moveSpeed;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.sin(moveAngle) * moveSpeed));

                // Apply all values including zoom
                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: currentHeading,
                    pitch: currentPitch,
                    zoom: currentZoom
                });
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

    const clearPressTimer = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const onPointerDown = (isTouch: boolean) => {
        if (isTouch) touchActiveRef.current = true;
        if (!isTouch && touchActiveRef.current) return;

        clearPressTimer();
        pressTimerRef.current = setTimeout(() => {
            handleLongPress();
            pressTimerRef.current = null;
        }, 500);
    };

    const onPointerUp = (isTouch: boolean) => {
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
                ${mode === 'orbit' ? 'bg-orange-600 text-white animate-pulse' : ''}
                ${mode === 'off' ? 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );
}
