import { useRef } from 'react';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

// Smooth easing for heading (handles wrap-around at 360°)
const easeHeading = (current: number, target: number, delta: number, rate: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    const maxTurn = rate * delta * 0.001;
    const turn = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
    return (current + turn + 360) % 360;
};

// Smooth easing for pitch
const easePitch = (current: number, target: number, delta: number, rate: number): number => {
    const diff = target - current;
    const maxChange = rate * delta * 0.001;
    return current + Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
};

// Smooth easing for zoom - graceful exponential ease-out like flying
const easeZoom = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 0.01) return target; // Snap when close
    // Exponential ease-out: moves fast at start, slows gracefully as it approaches target
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

// Smooth easing for speed (rate = km/h change per second)
const easeSpeed = (current: number, target: number, delta: number, rate: number): number => {
    const diff = target - current;
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

        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as 'mercator' | 'globe' });
        }

        store.setAnimationId(null);
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
        useFlightStore.getState().setMode('pan');

        let lastTime = 0;
        let currentHeading = map.getBearing();
        let currentPitch = map.getPitch();
        let currentZoom = map.getZoom();
        let currentSpeed = useFlightStore.getState().speed;

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

                // Heading easing
                if (store.targetHeading !== null) {
                    currentHeading = easeHeading(currentHeading, store.targetHeading, delta, 45);
                } else {
                    currentHeading = currentMap.getBearing();
                }

                // Pitch easing
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 30);
                } else {
                    currentPitch = currentMap.getPitch();
                }

                // Zoom easing - graceful exponential ease like ascending/descending
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.12);
                } else {
                    currentZoom = currentMap.getZoom();
                }

                // Speed easing - ease toward targetSpeed, update store
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 500);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                // Move forward based on speed
                const bearingRad = (currentHeading * Math.PI) / 180;
                const speedFactor = (currentSpeed / 250) * 0.000001;
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
        useFlightStore.getState().setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });
        useFlightStore.getState().setMode('sightseeing');

        let lastTime = 0;
        let autoTargetBearing = map.getBearing();
        let waypoint = { lng: map.getCenter().lng, lat: map.getCenter().lat };
        let currentHeading = map.getBearing();
        let currentPitch = map.getPitch();
        let currentZoom = map.getZoom();
        let currentSpeed = useFlightStore.getState().speed;

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

                // Heading
                const targetHeading = store.targetHeading !== null ? store.targetHeading : autoTargetBearing;
                currentHeading = easeHeading(currentHeading, targetHeading, delta, 30);

                // Pitch
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 30);
                } else {
                    currentPitch = currentMap.getPitch();
                }

                // Zoom easing - graceful exponential ease like ascending/descending
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.12);
                } else {
                    currentZoom = currentMap.getZoom();
                }

                // Speed easing - ease toward targetSpeed, update store
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 500);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                // Move toward waypoint
                const moveAngle = Math.atan2(dy, dx);
                const speedFactor = currentSpeed / 250;
                const moveSpeed = 0.0000012 * delta * speedFactor;
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
                ${mode === 'off' ? 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );
}
