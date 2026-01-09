import { X, Plane, Gauge, Navigation, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode, useFlightSpeed } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { useEffect, useState, useRef, useCallback } from 'react';

// Glassmorphic Ball Compass Component
function BallCompass({ heading, onHeadingChange }: { heading: number; onHeadingChange: (h: number) => void }) {
    const compassRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const getAngleFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
        if (!compassRef.current) return heading;
        const rect = compassRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const angle = Math.atan2(clientX - centerX, centerY - clientY) * (180 / Math.PI);
        return (angle + 360) % 360;
    }, [heading]);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDragging.current = true;
        const nativeEvent = 'touches' in e ? e.nativeEvent : e.nativeEvent;
        onHeadingChange(getAngleFromEvent(nativeEvent as MouseEvent | TouchEvent));
    }, [getAngleFromEvent, onHeadingChange]);

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            onHeadingChange(getAngleFromEvent(e));
        };

        const handleEnd = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [getAngleFromEvent, onHeadingChange]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                ref={compassRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className="relative w-28 h-28 cursor-grab active:cursor-grabbing select-none"
            >
                {/* Outer glass ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/30 shadow-lg shadow-cyan-500/20" />

                {/* Inner dark sphere */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 shadow-inner" />

                {/* Compass rose - rotates with heading */}
                <div
                    className="absolute inset-3 rounded-full"
                    style={{ transform: `rotate(${-heading}deg)` }}
                >
                    {/* Cardinal directions */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="absolute top-1 text-[10px] font-bold text-red-400">N</span>
                        <span className="absolute bottom-1 text-[10px] font-bold text-cyan-400/60">S</span>
                        <span className="absolute left-1 text-[10px] font-bold text-cyan-400/60">W</span>
                        <span className="absolute right-1 text-[10px] font-bold text-cyan-400/60">E</span>
                    </div>

                    {/* Tick marks */}
                    {[...Array(36)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute left-1/2 top-0 origin-bottom"
                            style={{
                                height: '50%',
                                transform: `translateX(-50%) rotate(${i * 10}deg)`,
                            }}
                        >
                            <div
                                className={`w-px ${i % 9 === 0 ? 'h-2 bg-cyan-400' : 'h-1 bg-cyan-400/40'}`}
                            />
                        </div>
                    ))}
                </div>

                {/* Fixed aircraft indicator (pointing up = current heading) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-cyan-400 -translate-y-4" />
                </div>

                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                </div>

                {/* Glass highlight */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" style={{ clipPath: 'ellipse(45% 30% at 50% 25%)' }} />
            </div>

            {/* Heading readout */}
            <div className="text-cyan-400 font-mono text-lg font-bold">
                {Math.round(heading).toString().padStart(3, '0')}°
            </div>
        </div>
    );
}

export function FlightDashboard() {
    const mode = useFlightMode();
    const speed = useFlightSpeed(); // From store
    const [telemetry, setTelemetry] = useState({
        lat: 0,
        lng: 0,
        bearing: 0,
        zoom: 0,
    });

    // Update telemetry from map (live) - this is the source of truth
    useEffect(() => {
        if (mode === 'off') return;

        const interval = setInterval(() => {
            const map = useMapStore.getState().map;
            if (!map) return;

            const center = map.getCenter();
            setTelemetry({
                lat: center.lat,
                lng: center.lng,
                bearing: map.getBearing(),
                zoom: map.getZoom(),
            });
        }, 50); // Faster updates for responsive sliders

        return () => clearInterval(interval);
    }, [mode]);

    // Derive altitude from zoom (two-way: zoom IS altitude)
    // zoom 18 = 500m, zoom 1 = 50000m
    const altitude = Math.round(500 * Math.pow(2, 18 - telemetry.zoom));
    const clampedAltitude = Math.max(1000, Math.min(50000, altitude));

    // Derive heading from bearing
    const heading = Math.round((telemetry.bearing + 360) % 360);

    // Don't render if flight is off
    if (mode === 'off') return null;

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);

        // Restore projection
        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as 'mercator' | 'globe' });
        }

        store.setAnimationId(null);
        store.setPrevProjection(null);
        store.setMode('off');
    };

    // Apply heading change - just change map bearing
    const applyHeading = (newHeading: number) => {
        const map = useMapStore.getState().map;
        if (map) {
            map.setBearing(newHeading); // Instant, no animation fighting
        }
    };

    // Apply altitude change - just change map zoom
    const applyAltitude = (newAlt: number) => {
        // Convert altitude to zoom: higher altitude = lower zoom
        // 1000m = zoom 15, 50000m = zoom 3
        const zoom = 18 - (Math.log(newAlt / 500) / Math.log(2));
        const map = useMapStore.getState().map;
        if (map) {
            map.setZoom(Math.max(1, Math.min(18, zoom))); // Instant, no animation fighting
        }
    };

    // Update speed in store
    const setSpeed = (newSpeed: number) => {
        useFlightStore.getState().setSpeed(newSpeed);
    };

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* MODAL DASHBOARD - Bottom right, above flight button */}
            <div className="absolute bottom-24 right-4 pointer-events-auto w-96">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Plane className="w-5 h-5 text-white" />
                            <span className="text-white font-bold tracking-wide">FLIGHT COMMAND</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`
                                px-2 py-0.5 rounded text-xs font-mono font-bold
                                ${mode === 'pan' ? 'bg-blue-400/30 text-blue-200' : ''}
                                ${mode === 'sightseeing' ? 'bg-purple-400/30 text-purple-200' : ''}
                                ${mode === 'manual' ? 'bg-green-400/30 text-green-200' : ''}
                            `}>
                                {mode.toUpperCase()}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={stopFlight}
                                className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Telemetry row */}
                    <div className="px-4 py-2 bg-black/40 border-b border-cyan-500/20 grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <div className="text-cyan-400/50 text-[10px] font-mono">LAT</div>
                            <div className="text-cyan-400 font-mono text-sm">{telemetry.lat.toFixed(2)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-cyan-400/50 text-[10px] font-mono">LNG</div>
                            <div className="text-cyan-400 font-mono text-sm">{telemetry.lng.toFixed(2)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-cyan-400/50 text-[10px] font-mono">HDG</div>
                            <div className="text-cyan-400 font-mono text-sm">{telemetry.bearing.toFixed(0)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-cyan-400/50 text-[10px] font-mono">ALT</div>
                            <div className="text-cyan-400 font-mono text-sm">{clampedAltitude.toLocaleString()}m</div>
                        </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="p-4 space-y-4">

                        {/* THROTTLE / SPEED */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-cyan-400/70 text-xs font-mono flex items-center gap-2">
                                    <Gauge className="w-3 h-3" />
                                    THROTTLE
                                </label>
                                <span className="text-cyan-400 font-mono text-sm font-bold">{speed} km/h</span>
                            </div>
                            <input
                                type="range"
                                min="25"
                                max="2000"
                                step="25"
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-4
                                    [&::-webkit-slider-thumb]:h-4
                                    [&::-webkit-slider-thumb]:bg-cyan-500
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-webkit-slider-thumb]:shadow-lg
                                    [&::-webkit-slider-thumb]:shadow-cyan-500/50"
                            />
                            <div className="flex justify-between text-[10px] text-cyan-400/40 font-mono">
                                <span>25</span>
                                <span>1000</span>
                                <span>2000</span>
                            </div>
                        </div>

                        {/* HEADING - Ball Compass */}
                        <div className="flex justify-center py-2">
                            <BallCompass heading={heading} onHeadingChange={applyHeading} />
                        </div>

                        {/* ALTITUDE */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-cyan-400/70 text-xs font-mono flex items-center gap-2">
                                    <Navigation className="w-3 h-3 -rotate-45" />
                                    ALTITUDE
                                </label>
                                <span className="text-cyan-400 font-mono text-sm font-bold">{clampedAltitude.toLocaleString()}m</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="50000"
                                step="1000"
                                value={clampedAltitude}
                                onChange={(e) => applyAltitude(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-4
                                    [&::-webkit-slider-thumb]:h-4
                                    [&::-webkit-slider-thumb]:bg-cyan-500
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-cyan-400/40 font-mono">
                                <span>1km</span>
                                <span>25km</span>
                                <span>50km</span>
                            </div>
                        </div>
                    </div>

                    {/* Projection indicator for sightseeing */}
                    {mode === 'sightseeing' && (
                        <div className="px-4 pb-3">
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-purple-400" />
                                <span className="text-purple-400 text-sm font-mono">Globe projection active</span>
                            </div>
                        </div>
                    )}

                    {/* Stop button */}
                    <div className="p-4 pt-2">
                        <Button
                            onClick={stopFlight}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl"
                        >
                            <X className="w-5 h-5 mr-2" />
                            STOP FLIGHT
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
