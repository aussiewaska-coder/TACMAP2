import { useRef } from 'react';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

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
        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const currentMode = useFlightStore.getState().mode;
            const speed = useFlightStore.getState().speed;

            if (!currentMap || currentMode !== 'pan') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                // Speed factor: 250 km/h baseline = 0.0001 degrees per ms visual speed
                // This gives smooth visible movement without being crazy fast
                const speedFactor = (speed / 250) * 0.0001;
                const center = currentMap.getCenter();
                const bearing = currentMap.getBearing();

                // Move in the direction of bearing
                const bearingRad = (bearing * Math.PI) / 180;
                const moveDist = speedFactor * delta;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.cos(bearingRad) * moveDist));
                const newLng = center.lng + Math.sin(bearingRad) * moveDist;

                currentMap.setCenter([newLng, newLat]);
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
        let targetBearing = map.getBearing();
        let targetZoom = map.getZoom();
        let waypoint = { lng: map.getCenter().lng, lat: map.getCenter().lat };

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const currentMode = useFlightStore.getState().mode;
            const speed = useFlightStore.getState().speed;

            if (!currentMap || currentMode !== 'sightseeing') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();
                const zoom = currentMap.getZoom();
                const bearing = currentMap.getBearing();

                // Speed factor based on throttle (250 baseline)
                const speedFactor = speed / 250;

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
                    targetBearing = (targetBearing + Math.random() * 90 - 45 + 360) % 360;
                    targetZoom = 3 + Math.random() * 10;
                }

                // Move toward waypoint
                const moveAngle = Math.atan2(dy, dx);
                const moveSpeed = 0.00012 * delta * speedFactor;
                const newLng = center.lng + Math.cos(moveAngle) * moveSpeed;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.sin(moveAngle) * moveSpeed));

                // Smooth bearing
                const bearingDiff = ((targetBearing - bearing + 540) % 360) - 180;
                const newBearing = bearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.03 * delta);

                // Smooth zoom
                const zoomDiff = targetZoom - zoom;
                const newZoom = zoom + Math.sign(zoomDiff) * Math.min(Math.abs(zoomDiff), 0.005 * delta);

                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: newBearing,
                    zoom: newZoom
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
