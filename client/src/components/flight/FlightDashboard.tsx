import { X, Plane, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode, useFlightSpeed } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { useEffect, useState, useRef, useCallback } from 'react';

// Military-style Vertical Slider Component
function VerticalSlider({
    value,
    onChange,
    min,
    max,
    step,
    label,
    unit,
    color = 'green',
    ticks
}: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    label: string;
    unit: string;
    color?: 'green' | 'amber';
    ticks: { value: number; label: string }[];
}) {
    const sliderRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const colorClasses = color === 'green'
        ? { bg: 'bg-green-500', glow: 'shadow-green-500/50', text: 'text-green-400', border: 'border-green-500/30', dim: 'text-green-400/50' }
        : { bg: 'bg-amber-500', glow: 'shadow-amber-500/50', text: 'text-amber-400', border: 'border-amber-500/30', dim: 'text-amber-400/50' };

    const percentage = ((value - min) / (max - min)) * 100;

    const getValueFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
        if (!sliderRef.current) return value;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        // Inverted: top = max, bottom = min
        const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        const rawValue = min + pct * (max - min);
        return Math.round(rawValue / step) * step;
    }, [value, min, max, step]);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDragging.current = true;
        const nativeEvent = 'touches' in e ? e.nativeEvent : e.nativeEvent;
        onChange(getValueFromEvent(nativeEvent as MouseEvent | TouchEvent));
    }, [getValueFromEvent, onChange]);

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            onChange(getValueFromEvent(e));
        };
        const handleEnd = () => { isDragging.current = false; };

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
    }, [getValueFromEvent, onChange]);

    // Format display value
    const displayValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();

    return (
        <div className="flex flex-col items-center gap-1 select-none">
            {/* Label */}
            <div className={`${colorClasses.dim} text-[10px] font-mono font-bold tracking-wider`}>{label}</div>

            {/* Digital readout */}
            <div className={`${colorClasses.text} font-mono text-sm font-bold bg-black/60 px-2 py-0.5 rounded border ${colorClasses.border}`}>
                {displayValue}{unit}
            </div>

            {/* Slider track with ticks */}
            <div className="flex items-stretch gap-1 h-36">
                {/* Tick marks - left side */}
                <div className="flex flex-col justify-between py-1">
                    {ticks.map((tick, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className={`${colorClasses.dim} text-[8px] font-mono w-6 text-right`}>{tick.label}</span>
                            <div className={`w-2 h-px ${colorClasses.bg}/40`} />
                        </div>
                    ))}
                </div>

                {/* Main slider track */}
                <div
                    ref={sliderRef}
                    onMouseDown={handleStart}
                    onTouchStart={handleStart}
                    className="relative w-8 cursor-ns-resize"
                >
                    {/* Track background */}
                    <div className={`absolute inset-0 bg-black/80 border ${colorClasses.border} rounded`}>
                        {/* Grid lines */}
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className={`absolute left-0 right-0 h-px ${colorClasses.bg}/20`}
                                style={{ top: `${(i + 1) * 10}%` }}
                            />
                        ))}
                    </div>

                    {/* Fill bar */}
                    <div
                        className={`absolute bottom-0 left-1 right-1 ${colorClasses.bg}/30 rounded-sm transition-all`}
                        style={{ height: `${percentage}%` }}
                    />

                    {/* Glowing indicator line */}
                    <div
                        className={`absolute left-0 right-0 h-1 ${colorClasses.bg} shadow-lg ${colorClasses.glow} rounded transition-all`}
                        style={{ bottom: `calc(${percentage}% - 2px)` }}
                    />

                    {/* Handle */}
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 w-6 h-3 ${colorClasses.bg} rounded-sm shadow-lg ${colorClasses.glow}
                            border-t border-white/30 transition-all cursor-grab active:cursor-grabbing`}
                        style={{ bottom: `calc(${percentage}% - 6px)` }}
                    >
                        {/* Handle grip lines */}
                        <div className="absolute inset-x-1 top-1 flex justify-between">
                            <div className="w-px h-1 bg-black/30" />
                            <div className="w-px h-1 bg-black/30" />
                            <div className="w-px h-1 bg-black/30" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
        <div className="flex flex-col items-center gap-1 select-none">
            {/* Label */}
            <div className="text-green-400/50 text-[10px] font-mono font-bold tracking-wider">HDG</div>

            <div
                ref={compassRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className="relative w-24 h-24 cursor-grab active:cursor-grabbing"
            >
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full bg-black/80 border border-green-500/40 shadow-lg shadow-green-500/10" />

                {/* Inner dark sphere */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-slate-900 to-black border border-green-500/20 shadow-inner" />

                {/* Compass rose - rotates with heading */}
                <div
                    className="absolute inset-2 rounded-full"
                    style={{ transform: `rotate(${-heading}deg)` }}
                >
                    {/* Cardinal directions */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="absolute top-0 text-[9px] font-bold text-red-500">N</span>
                        <span className="absolute bottom-0 text-[9px] font-bold text-green-400/50">S</span>
                        <span className="absolute left-0 text-[9px] font-bold text-green-400/50">W</span>
                        <span className="absolute right-0 text-[9px] font-bold text-green-400/50">E</span>
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
                                className={`w-px ${i % 9 === 0 ? 'h-2 bg-green-400' : 'h-1 bg-green-400/30'}`}
                            />
                        </div>
                    ))}
                </div>

                {/* Fixed aircraft indicator (pointing up = current heading) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-green-400 -translate-y-3 drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]" />
                </div>

                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                </div>
            </div>

            {/* Heading readout */}
            <div className="text-green-400 font-mono text-sm font-bold bg-black/60 px-2 py-0.5 rounded border border-green-500/30">
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
            <div className="absolute bottom-24 right-4 pointer-events-auto w-80">
                <div className="bg-black/95 backdrop-blur-xl border border-green-500/40 rounded-lg shadow-2xl shadow-green-500/10 overflow-hidden">

                    {/* Header - Military style */}
                    <div className="bg-black/90 border-b border-green-500/30 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                            <Plane className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-mono font-bold tracking-widest text-sm">FLT CMD</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`
                                px-2 py-0.5 rounded text-[10px] font-mono font-bold border
                                ${mode === 'pan' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : ''}
                                ${mode === 'sightseeing' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : ''}
                                ${mode === 'manual' ? 'bg-green-500/20 text-green-400 border-green-500/50' : ''}
                            `}>
                                {mode.toUpperCase()}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={stopFlight}
                                className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded border border-red-500/30"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Telemetry row - Military HUD style */}
                    <div className="px-3 py-2 bg-black/60 border-b border-green-500/20 grid grid-cols-4 gap-1">
                        <div className="text-center">
                            <div className="text-green-400/40 text-[8px] font-mono tracking-wider">LAT</div>
                            <div className="text-green-400 font-mono text-xs">{telemetry.lat.toFixed(2)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-green-400/40 text-[8px] font-mono tracking-wider">LNG</div>
                            <div className="text-green-400 font-mono text-xs">{telemetry.lng.toFixed(2)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-green-400/40 text-[8px] font-mono tracking-wider">HDG</div>
                            <div className="text-green-400 font-mono text-xs">{telemetry.bearing.toFixed(0)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-amber-400/40 text-[8px] font-mono tracking-wider">ALT</div>
                            <div className="text-amber-400 font-mono text-xs">{clampedAltitude.toLocaleString()}m</div>
                        </div>
                    </div>

                    {/* CONTROLS - Military Layout */}
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            {/* THROTTLE - Left side */}
                            <VerticalSlider
                                value={speed}
                                onChange={setSpeed}
                                min={25}
                                max={2000}
                                step={25}
                                label="THRTL"
                                unit=""
                                color="green"
                                ticks={[
                                    { value: 2000, label: '2K' },
                                    { value: 1500, label: '1.5K' },
                                    { value: 1000, label: '1K' },
                                    { value: 500, label: '500' },
                                    { value: 25, label: '25' },
                                ]}
                            />

                            {/* HEADING - Center compass */}
                            <div className="flex flex-col items-center">
                                <BallCompass heading={heading} onHeadingChange={applyHeading} />
                            </div>

                            {/* ALTITUDE - Right side */}
                            <VerticalSlider
                                value={clampedAltitude}
                                onChange={applyAltitude}
                                min={1000}
                                max={50000}
                                step={1000}
                                label="ALT"
                                unit="m"
                                color="amber"
                                ticks={[
                                    { value: 50000, label: '50K' },
                                    { value: 37500, label: '' },
                                    { value: 25000, label: '25K' },
                                    { value: 12500, label: '' },
                                    { value: 1000, label: '1K' },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Projection indicator for sightseeing */}
                    {mode === 'sightseeing' && (
                        <div className="px-3 pb-2">
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded px-2 py-1 flex items-center gap-2">
                                <Globe className="w-3 h-3 text-purple-400" />
                                <span className="text-purple-400 text-[10px] font-mono">GLOBE MODE</span>
                            </div>
                        </div>
                    )}

                    {/* Stop button - Military style */}
                    <div className="p-3 pt-1">
                        <Button
                            onClick={stopFlight}
                            className="w-full bg-red-900/50 hover:bg-red-800/60 text-red-400 hover:text-red-300 font-mono font-bold py-2 rounded border border-red-500/50 text-sm tracking-wider"
                        >
                            <X className="w-4 h-4 mr-2" />
                            DISENGAGE
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
