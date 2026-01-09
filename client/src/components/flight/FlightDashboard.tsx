import { X, Plane, RotateCw, Satellite, Building2, ChevronLeft, ChevronRight, Crosshair, LocateFixed, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightSpeed } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { useEffect, useState, useRef, useCallback } from 'react';

// Altitude preset buttons with default speeds
const ALTITUDE_PRESETS = [
    { ft: 50000, zoom: 5, label: '50K', speed: 20000 },  // SR-71 territory
    { ft: 20000, zoom: 8, label: '20K', speed: 10000 },  // Supersonic
    { ft: 10000, zoom: 10, label: '10K', speed: 1000 },  // Regional jet
    { ft: 3000, zoom: 13, label: '3K', speed: 280 },     // Fast helicopter
    { ft: 500, zoom: 16, label: '500', speed: 75 },      // Slow helicopter
];

// Smooth easing for heading (handles wrap-around at 360°)
const easeHeading = (current: number, target: number, delta: number, smoothing: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    if (Math.abs(diff) < 0.5) return target;
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    const turn = diff * ease;
    return (current + turn + 360) % 360;
};

// Smooth easing for pitch - exponential ease for natural feel
const easePitch = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 0.5) return target;
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

// Smooth easing for zoom - graceful exponential ease-out like flying
const easeZoom = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 0.01) return target;
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

// Smooth easing for speed - exponential for natural throttle feel
const easeSpeed = (current: number, target: number, delta: number, smoothing: number): number => {
    const diff = target - current;
    if (Math.abs(diff) < 1) return target;
    const ease = 1 - Math.pow(1 - smoothing, delta * 0.06);
    return current + diff * ease;
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

const getOrbitPosition = (center: [number, number], radiusKm: number, angleDeg: number) => {
    const [centerLng, centerLat] = center;
    const angleRad = toRadians(angleDeg);
    const latScale = 111;
    const lngScale = 111 * Math.max(0.2, Math.cos(toRadians(centerLat)));

    const dxKm = Math.cos(angleRad) * radiusKm;
    const dyKm = Math.sin(angleRad) * radiusKm;

    const lat = Math.max(-85, Math.min(85, centerLat + (dyKm / latScale)));
    const lng = centerLng + (dxKm / lngScale);

    return { lat, lng };
};

const getBearingToCenter = (from: [number, number], to: [number, number]) => {
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    const dx = toLng - fromLng;
    const dy = toLat - fromLat;
    return (toDegrees(Math.atan2(dx, dy)) + 360) % 360;
};

// Altitude Buttons - DIRECTLY controls map zoom via flyTo
function AltitudeButtons({ currentZoom, onAltitudeChange }: { currentZoom: number; onAltitudeChange: (zoom: number, speed: number) => void }) {
    // Find closest preset to current zoom
    const closestPreset = ALTITUDE_PRESETS.reduce((prev, curr) =>
        Math.abs(curr.zoom - currentZoom) < Math.abs(prev.zoom - currentZoom) ? curr : prev
    );

    return (
        <div className="flex flex-col items-center gap-1 select-none">
            <div className="text-amber-400/50 text-[10px] font-mono font-bold tracking-wider">ALT</div>
            <div className="text-amber-400 font-mono text-sm font-bold bg-black/60 px-2 py-0.5 rounded border border-amber-500/30">
                Z{currentZoom.toFixed(1)}
            </div>
            <div className="flex flex-col gap-1 mt-1">
                {ALTITUDE_PRESETS.map((preset) => {
                    const isActive = Math.abs(preset.zoom - currentZoom) < 0.5;
                    const isClosest = preset === closestPreset;
                    return (
                        <button
                            key={preset.ft}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAltitudeChange(preset.zoom, preset.speed);
                            }}
                            className={`
                                px-3 py-1 rounded font-mono text-xs font-bold transition-all border cursor-pointer
                                ${isActive
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/50'
                                    : isClosest
                                        ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                                        : 'bg-black/60 text-amber-400/70 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300'
                                }
                            `}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
            <div className="text-amber-400/30 text-[8px] font-mono mt-1">FEET</div>
        </div>
    );
}

// Military-style Vertical Slider Component with optional logarithmic scale
function VerticalSlider({
    value,
    onChange,
    min,
    max,
    step,
    label,
    unit,
    color = 'green',
    ticks,
    logarithmic = false
}: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    label: string;
    unit: string;
    color?: 'green' | 'amber' | 'cyan';
    ticks: { value: number; label: string }[];
    logarithmic?: boolean;
}) {
    const sliderRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const colorMap = {
        green: { bg: 'bg-green-500', glow: 'shadow-green-500/50', text: 'text-green-400', border: 'border-green-500/30', dim: 'text-green-400/50' },
        amber: { bg: 'bg-amber-500', glow: 'shadow-amber-500/50', text: 'text-amber-400', border: 'border-amber-500/30', dim: 'text-amber-400/50' },
        cyan: { bg: 'bg-cyan-500', glow: 'shadow-cyan-500/50', text: 'text-cyan-400', border: 'border-cyan-500/30', dim: 'text-cyan-400/50' },
    };
    const colorClasses = colorMap[color];

    // Logarithmic scaling for large ranges
    const valueToPercent = (v: number): number => {
        if (logarithmic && min > 0) {
            const logMin = Math.log(min);
            const logMax = Math.log(max);
            const logVal = Math.log(Math.max(min, Math.min(max, v)));
            return ((logVal - logMin) / (logMax - logMin)) * 100;
        }
        return ((v - min) / (max - min)) * 100;
    };

    const percentToValue = (pct: number): number => {
        if (logarithmic && min > 0) {
            const logMin = Math.log(min);
            const logMax = Math.log(max);
            const logVal = logMin + (pct / 100) * (logMax - logMin);
            return Math.exp(logVal);
        }
        return min + (pct / 100) * (max - min);
    };

    const percentage = valueToPercent(value);

    const getValueFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
        if (!sliderRef.current) return value;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        // Inverted: top = max, bottom = min
        const pct = (1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))) * 100;
        const rawValue = percentToValue(pct);
        // Round to step and clamp to range
        const stepped = Math.round(rawValue / step) * step;
        return Math.max(min, Math.min(max, Math.round(stepped)));
    }, [value, min, max, step, logarithmic]);

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

    // Format display value - always integers
    const roundedValue = Math.round(value);
    const displayValue = roundedValue >= 1000 ? `${(roundedValue / 1000).toFixed(1)}k` : roundedValue.toString();

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
                {/* Tick marks - left side, positioned to match scale */}
                <div className="relative w-10 py-1">
                    {ticks.map((tick, i) => {
                        const tickPercent = valueToPercent(tick.value);
                        return (
                            <div
                                key={i}
                                className="absolute right-0 flex items-center gap-1"
                                style={{ bottom: `calc(${tickPercent}% - 4px)` }}
                            >
                                <span className={`${colorClasses.dim} text-[8px] font-mono`}>{tick.label}</span>
                                <div className={`w-2 h-px ${colorClasses.bg}/40`} />
                            </div>
                        );
                    })}
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

// Glassmorphic Ball Compass Component with target indicator and snap-to-cardinal
function BallCompass({ heading, targetHeading, onHeadingChange }: {
    heading: number;
    targetHeading: number | null;
    onHeadingChange: (h: number) => void;
}) {
    const compassRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastTapTime = useRef(0);

    // Snap to nearest cardinal direction (N=0, E=90, S=180, W=270)
    const snapToCardinal = (angle: number): number => {
        const cardinals = [0, 90, 180, 270, 360];
        let closest = 0;
        let minDiff = 360;
        for (const c of cardinals) {
            const diff = Math.abs(((angle - c + 180) % 360) - 180);
            if (diff < minDiff) {
                minDiff = diff;
                closest = c % 360;
            }
        }
        return closest;
    };

    const getAngleFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
        if (!compassRef.current) return heading;
        const rect = compassRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Calculate visual angle (where user clicked relative to compass center)
        const visualAngle = Math.atan2(clientX - centerX, centerY - clientY) * (180 / Math.PI);
        // Add current heading back since compass rose is rotated by -heading
        // This way clicking on "E" gives 90° regardless of current heading
        return (visualAngle + heading + 360) % 360;
    }, [heading]);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();

        // Double-tap detection for snap-to-cardinal
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
            // Double tap - snap to nearest cardinal
            const snapped = snapToCardinal(targetHeading ?? heading);
            onHeadingChange(snapped);
            lastTapTime.current = 0;
            return;
        }
        lastTapTime.current = now;

        isDragging.current = true;
        const nativeEvent = 'touches' in e ? e.nativeEvent : e.nativeEvent;
        onHeadingChange(getAngleFromEvent(nativeEvent as MouseEvent | TouchEvent));
    }, [getAngleFromEvent, onHeadingChange, heading, targetHeading]);

    // Scroll wheel for fine adjustments - natural 2° per tick
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const step = 2;
        const direction = e.deltaY > 0 ? 1 : -1;
        const current = targetHeading ?? heading;
        onHeadingChange((current + direction * step + 360) % 360);
    }, [heading, targetHeading, onHeadingChange]);

    const nudgeHeading = useCallback((delta: number) => {
        const current = targetHeading ?? heading;
        onHeadingChange((current + delta + 360) % 360);
    }, [heading, targetHeading, onHeadingChange]);

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

    // Show target indicator if different from current
    const showTarget = targetHeading !== null && Math.abs(((targetHeading - heading + 180) % 360) - 180) > 2;

    return (
        <div className="flex flex-col items-center gap-1 select-none">
            {/* Label */}
            <div className="text-green-400/50 text-[10px] font-mono font-bold tracking-wider">HDG</div>

            <div
                ref={compassRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                onWheel={handleWheel}
                className="relative w-24 h-24 cursor-grab active:cursor-grabbing"
            >
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full bg-black/80 border border-green-500/40 shadow-lg shadow-green-500/10" />

                {/* Inner dark sphere */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-slate-900 to-black border border-green-500/20 shadow-inner" />

                {/* Compass rose - rotates with CURRENT heading */}
                <div
                    className="absolute inset-2 rounded-full transition-transform duration-75"
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

                {/* TARGET heading indicator (ghost chevron) - shows where you're turning to */}
                {showTarget && (
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-100"
                        style={{ transform: `rotate(${(targetHeading ?? 0) - heading}deg)` }}
                    >
                        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-amber-400/60 -translate-y-4 animate-pulse" />
                    </div>
                )}

                {/* Fixed aircraft indicator (pointing up = current heading) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-green-400 -translate-y-3 drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]" />
                </div>

                {/* Center plane icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Plane className="w-4 h-4 text-green-300 drop-shadow-[0_0_6px_rgba(74,222,128,0.6)] -rotate-90" />
                </div>

                {/* Heading nudge buttons */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        nudgeHeading(-15);
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black/80 border border-green-500/40 text-green-300 shadow-lg shadow-green-500/20 hover:bg-green-500/20 active:scale-95 flex items-center justify-center"
                    title="Turn left 15°"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        nudgeHeading(15);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-black/80 border border-green-500/40 text-green-300 shadow-lg shadow-green-500/20 hover:bg-green-500/20 active:scale-95 flex items-center justify-center"
                    title="Turn right 15°"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Heading readout - show target if turning */}
            <div className="flex items-center gap-1">
                <div className="text-green-400 font-mono text-sm font-bold bg-black/60 px-2 py-0.5 rounded border border-green-500/30">
                    {Math.round(heading).toString().padStart(3, '0')}°
                </div>
                {showTarget && (
                    <div className="text-amber-400/70 font-mono text-xs">
                        → {Math.round(targetHeading ?? 0).toString().padStart(3, '0')}°
                    </div>
                )}
            </div>

            {/* Hint */}
            <div className="text-green-400/30 text-[8px] font-mono">SCROLL TO FINE-TUNE</div>
        </div>
    );
}

// Orbit mode indicator - shows current heading and orbit angle
function OrbitIndicator({ heading }: { heading: number }) {
    const clockwise = useFlightStore((s) => s.orbitClockwise);

    return (
        <div className="flex flex-col items-center gap-1 select-none">
            <div className="text-orange-400/50 text-[10px] font-mono font-bold tracking-wider">ORBIT</div>

            <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-black/80 border-2 border-orange-500/40 shadow-lg shadow-orange-500/10" />
                <div className="absolute inset-2 rounded-full border border-dashed border-orange-400/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Crosshair className="w-8 h-8 text-orange-300/90 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                </div>
                <div className="absolute bottom-1 right-1">
                    <RotateCw className={`w-4 h-4 text-orange-400/50 ${clockwise ? '' : 'scale-x-[-1]'}`} />
                </div>
            </div>

            <div className="text-orange-400 font-mono text-sm font-bold bg-black/60 px-2 py-0.5 rounded border border-orange-500/30">
                {Math.round(heading).toString().padStart(3, '0')}°
            </div>
        </div>
    );
}

// Orbit mode controls - direction toggle and radius display
function OrbitControls({
    lookAtCenter,
    paused,
    onToggleLook,
    onTogglePause,
    onSetCenter,
}: {
    lookAtCenter: boolean;
    paused: boolean;
    onToggleLook: () => void;
    onTogglePause: () => void;
    onSetCenter: () => void;
}) {
    const clockwise = useFlightStore((s) => s.orbitClockwise);
    const radius = useFlightStore((s) => s.orbitRadius);
    const setClockwise = useFlightStore((s) => s.setOrbitClockwise);
    const setRadius = useFlightStore((s) => s.setOrbitRadius);

    const radiusKm = radius.toFixed(1);

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Direction + center */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setClockwise(!clockwise)}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold border bg-black/60 text-orange-400/70 border-orange-500/30 hover:bg-orange-500/20 cursor-pointer flex items-center gap-1"
                >
                    <RotateCw className={`w-3 h-3 ${clockwise ? '' : 'scale-x-[-1]'}`} />
                    {clockwise ? 'CW' : 'CCW'}
                </button>
                <button
                    onClick={onSetCenter}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold border bg-black/60 text-orange-400/70 border-orange-500/30 hover:bg-orange-500/20 cursor-pointer flex items-center gap-1"
                >
                    <LocateFixed className="w-3 h-3" />
                    CENTER
                </button>
            </div>

            {/* Radius display and quick adjust */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setRadius(Math.max(0.5, radius * 0.7))}
                    className="w-5 h-5 rounded text-xs font-bold bg-black/60 text-orange-400/70 border border-orange-500/30 hover:bg-orange-500/20 cursor-pointer"
                >
                    -
                </button>
                <div className="text-orange-400/50 text-[9px] font-mono px-1">
                    {radiusKm}km
                </div>
                <button
                    onClick={() => setRadius(Math.min(100, radius * 1.4))}
                    className="w-5 h-5 rounded text-xs font-bold bg-black/60 text-orange-400/70 border border-orange-500/30 hover:bg-orange-500/20 cursor-pointer"
                >
                    +
                </button>
            </div>

            {/* Look mode + pause */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleLook}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border ${
                        lookAtCenter
                            ? 'bg-orange-500/20 text-orange-200 border-orange-400/60'
                            : 'bg-black/60 text-orange-400/70 border-orange-500/30 hover:bg-orange-500/20'
                    }`}
                >
                    {lookAtCenter ? 'LOOK-IN' : 'TANGENT'}
                </button>
                <button
                    onClick={onTogglePause}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold border bg-black/60 text-orange-400/70 border-orange-500/30 hover:bg-orange-500/20 cursor-pointer flex items-center gap-1"
                >
                    {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    {paused ? 'RESUME' : 'PAUSE'}
                </button>
            </div>
        </div>
    );
}

// Satellite layer source and ID constants
const SATELLITE_SOURCE_ID = 'flight-satellite-source';
const SATELLITE_LAYER_ID = 'flight-satellite-layer';
const SATELLITE_TILES_URL = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';

// 3D Buildings layer constants
const BUILDINGS_SOURCE_ID = 'flight-buildings-source';
const BUILDINGS_LAYER_ID = 'flight-3d-buildings';

export function FlightDashboard() {
    const dashboardOpen = useFlightStore((s) => s.dashboardOpen);
    const closeDashboard = useFlightStore((s) => s.closeDashboard);
    const [flightMode, setFlightMode] = useState<'off' | 'manual' | 'orbit'>('off');
    const speed = useFlightSpeed(); // From store
    const targetHeading = useFlightStore((s) => s.targetHeading);
    const targetAltitude = useFlightStore((s) => s.targetAltitude);
    const targetPitch = useFlightStore((s) => s.targetPitch);
    const satelliteEnabled = useFlightStore((s) => s.satelliteEnabled);
    const buildings3dEnabled = useFlightStore((s) => s.buildings3dEnabled);
    const orbitCenter = useFlightStore((s) => s.orbitCenter);
    const orbitRadius = useFlightStore((s) => s.orbitRadius);
    const orbitClockwise = useFlightStore((s) => s.orbitClockwise);
    const [orbitLookAtCenter, setOrbitLookAtCenter] = useState(true);
    const [orbitPaused, setOrbitPaused] = useState(false);
    const [debugVisible, setDebugVisible] = useState(true);
    const [lastAction, setLastAction] = useState('init');
    const [telemetry, setTelemetry] = useState({
        lat: 0,
        lng: 0,
        bearing: 0,
        zoom: 0,
        pitch: 0,
    });

    // Update telemetry from map (live) - this is the source of truth
    useEffect(() => {
        if (!dashboardOpen && flightMode === 'off') return;

        const interval = setInterval(() => {
            const map = useMapStore.getState().map;
            if (!map) return;

            const center = map.getCenter();
            setTelemetry({
                lat: center.lat,
                lng: center.lng,
                bearing: map.getBearing(),
                zoom: map.getZoom(),
                pitch: map.getPitch(),
            });
        }, 50); // Faster updates for responsive sliders

        return () => clearInterval(interval);
    }, [dashboardOpen, flightMode]);

    useEffect(() => {
        if (!dashboardOpen) return;
        const store = useFlightStore.getState();
        const map = useMapStore.getState().map;
        if (!map) return;

        if (flightMode === 'off') {
            store.setTargetHeading(map.getBearing());
            store.setTargetPitch(map.getPitch());
            store.setTargetAltitude(map.getZoom());
            store.setTargetSpeed(store.speed);
        }
    }, [dashboardOpen, flightMode]);

    useEffect(() => {
        if (!dashboardOpen || flightMode !== 'manual') return;
        const map = useMapStore.getState().map;
        if (!map) return;

        let lastTime = 0;
        let currentHeading = map.getBearing();
        let currentPitch = map.getPitch();
        let currentZoom = map.getZoom();
        let currentSpeed = useFlightStore.getState().speed;

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || flightMode !== 'manual') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();

                if (store.targetHeading !== null) {
                    currentHeading = easeHeading(currentHeading, store.targetHeading, delta, 0.12);
                }
                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 0.12);
                }
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.012);
                }
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 0.2);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                const bearingRad = (currentHeading * Math.PI) / 180;
                const zoomScale = Math.pow(2, (currentZoom - 10) * 0.5);
                const speedFactor = (currentSpeed / 250) * 0.000001 * zoomScale;
                const moveDist = speedFactor * delta;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.cos(bearingRad) * moveDist));
                const newLng = center.lng + Math.sin(bearingRad) * moveDist;

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

        return () => {
            const store = useFlightStore.getState();
            if (store.animationId) cancelAnimationFrame(store.animationId);
            store.setAnimationId(null);
        };
    }, [dashboardOpen, flightMode]);

    useEffect(() => {
        if (!dashboardOpen || flightMode !== 'orbit') return;
        const map = useMapStore.getState().map;
        if (!map) return;

        let lastTime = 0;
        let currentAngle = useFlightStore.getState().orbitAngle;
        let currentPitch = map.getPitch();
        let currentZoom = map.getZoom();
        let currentSpeed = useFlightStore.getState().speed;

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const store = useFlightStore.getState();

            if (!currentMap || flightMode !== 'orbit') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = store.orbitCenter;
                if (!center) return;

                const radiusKm = Math.max(0.5, store.orbitRadius);
                const clockwise = store.orbitClockwise;

                if (store.targetPitch !== null) {
                    currentPitch = easePitch(currentPitch, store.targetPitch, delta, 0.12);
                }
                if (store.targetAltitude !== null) {
                    currentZoom = easeZoom(currentZoom, store.targetAltitude, delta, 0.012);
                }
                if (store.targetSpeed !== null) {
                    currentSpeed = easeSpeed(currentSpeed, store.targetSpeed, delta, 0.2);
                    store.setSpeed(currentSpeed);
                } else {
                    currentSpeed = store.speed;
                }

                const effectiveSpeed = orbitPaused ? 0 : currentSpeed;
                const circumference = 2 * Math.PI * radiusKm;
                const degreesPerSecond = circumference > 0 ? (effectiveSpeed / 3600) / circumference * 360 : 0;
                const angleIncrement = degreesPerSecond * (delta / 1000) * (clockwise ? 1 : -1);

                currentAngle = (currentAngle + angleIncrement + 360) % 360;
                store.setOrbitAngle(currentAngle);

                const position = getOrbitPosition(center, radiusKm, currentAngle);
                const heading = orbitLookAtCenter
                    ? getBearingToCenter([position.lng, position.lat], center)
                    : (90 - (currentAngle + (clockwise ? -90 : 90)) + 360) % 360;

                currentMap.jumpTo({
                    center: [position.lng, position.lat],
                    bearing: heading,
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

        return () => {
            const store = useFlightStore.getState();
            if (store.animationId) cancelAnimationFrame(store.animationId);
            store.setAnimationId(null);
        };
    }, [dashboardOpen, flightMode, orbitLookAtCenter, orbitPaused]);

    useEffect(() => {
        if (!dashboardOpen || flightMode !== 'orbit') return;
        const map = useMapStore.getState().map;
        if (!map) return;

        const stopOnInteract = () => {
            stopFlight();
        };

        map.on('dragstart', stopOnInteract);
        map.on('wheel', stopOnInteract);
        map.on('touchstart', stopOnInteract);

        return () => {
            map.off('dragstart', stopOnInteract);
            map.off('wheel', stopOnInteract);
            map.off('touchstart', stopOnInteract);
        };
    }, [dashboardOpen, flightMode]);

    // Derive altitude from zoom (two-way: zoom IS altitude)
    // zoom 18 = 500m, zoom 0 = ~130km
    const altitude = Math.round(500 * Math.pow(2, 18 - telemetry.zoom));
    const clampedAltitude = Math.max(152, Math.min(30480, altitude)); // 500ft to 100,000ft in meters

    // Derive heading from bearing
    const heading = Math.round((telemetry.bearing + 360) % 360);

    // Current pitch (0-85°)
    const pitch = Math.round(telemetry.pitch);

    if (!dashboardOpen) return null;

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);
        if (store.transitionTimeoutId) clearTimeout(store.transitionTimeoutId);

        // Restore projection
        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as 'mercator' | 'globe' });
        }

        store.setAnimationId(null);
        store.setTransitionTimeoutId(null);
        store.setPrevProjection(null);
        store.setTargetHeading(null);
        store.setTargetAltitude(null);
        store.setTargetPitch(null);
        store.setTargetSpeed(null);
        setFlightMode('off');
    };

    const startOrbit = (center?: [number, number]) => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();
        setLastAction('orbit:start');

        const proj = map.getProjection();
        const currentProj = typeof proj?.type === 'string' ? proj.type : 'mercator';
        const store = useFlightStore.getState();

        store.setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });
        map.setFog({
            range: [2, 20],
            color: '#ffffff',
            'high-color': '#245cdf',
            'horizon-blend': 0.02,
            'space-color': '#000000',
            'star-intensity': 0.2
        });

        const orbitCenter = center || store.orbitCenter || [map.getCenter().lng, map.getCenter().lat];

        const currentPos: [number, number] = [map.getCenter().lng, map.getCenter().lat];
        const dx = (currentPos[0] - orbitCenter[0]) * Math.cos(toRadians(orbitCenter[1])) * 111;
        const dy = (currentPos[1] - orbitCenter[1]) * 111;
        const derivedRadius = Math.max(0.5, Math.sqrt(dx * dx + dy * dy));
        const derivedAngle = (toDegrees(Math.atan2(dy, dx)) + 360) % 360;

        store.setOrbitCenter(orbitCenter);
        store.setOrbitRadius(derivedRadius);
        store.setOrbitAngle(derivedAngle);
        setFlightMode('orbit');

        store.setTargetAltitude(map.getZoom());
        store.setTargetPitch(map.getPitch());
        store.setTargetSpeed(store.speed);

        setOrbitPaused(false);
    };

    const handleClose = () => {
        if (flightMode !== 'off') {
            stopFlight();
        }
        closeDashboard();
    };

    const handleSetOrbitCenter = () => {
        const map = useMapStore.getState().map;
        if (!map) return;
        const center = map.getCenter();
        const store = useFlightStore.getState();
        store.setOrbitCenter([center.lng, center.lat]);
        store.setOrbitAngle(0);
    };

    // Apply heading change - set target for smooth easing
    const applyHeading = (newHeading: number) => {
        const store = useFlightStore.getState();
        if (flightMode !== 'orbit') {
            setFlightMode('manual');
        }
        store.setTargetHeading(newHeading);
    };

    // Apply altitude change - set target altitude AND speed for smooth easing
    const applyAltitude = (newAlt: number, newSpeed: number) => {
        const store = useFlightStore.getState();
        if (flightMode !== 'orbit') {
            setFlightMode('manual');
        }
        store.setTargetAltitude(newAlt);
        store.setTargetSpeed(newSpeed);
        store.setSpeed(newSpeed);
    };

    // Apply pitch/tilt change - set target for smooth easing
    const applyPitch = (newPitch: number) => {
        const store = useFlightStore.getState();
        if (flightMode !== 'orbit') {
            setFlightMode('manual');
        }
        store.setTargetPitch(newPitch);
    };

    // Toggle satellite layer on map
    const toggleSatellite = () => {
        const map = useMapStore.getState().map;
        if (!map) return;

        const newEnabled = !satelliteEnabled;
        useFlightStore.getState().setSatelliteEnabled(newEnabled);

        if (newEnabled) {
            // Add satellite source if not exists
            if (!map.getSource(SATELLITE_SOURCE_ID)) {
                map.addSource(SATELLITE_SOURCE_ID, {
                    type: 'raster',
                    tiles: [SATELLITE_TILES_URL],
                    tileSize: 256,
                    maxzoom: 14
                });
            }

            // Add satellite layer if not exists
            if (!map.getLayer(SATELLITE_LAYER_ID)) {
                // Find the first fill layer to insert satellite before it
                // This puts satellite ABOVE background but BELOW fills
                const layers = map.getStyle()?.layers || [];
                const firstFillLayer = layers.find(layer => layer.type === 'fill');

                map.addLayer({
                    id: SATELLITE_LAYER_ID,
                    type: 'raster',
                    source: SATELLITE_SOURCE_ID,
                    paint: { 'raster-opacity': 1 }
                }, firstFillLayer?.id); // Insert before first fill (above background)

                // Make fill layers semi-transparent so satellite shows through
                layers.forEach(layer => {
                    if (layer.type === 'fill' && layer.id !== SATELLITE_LAYER_ID) {
                        try {
                            const currentOpacity = map.getPaintProperty(layer.id, 'fill-opacity');
                            if (currentOpacity === undefined || currentOpacity === 1) {
                                map.setPaintProperty(layer.id, 'fill-opacity', 0.3);
                            }
                        } catch (e) {
                            // Some layers may not support this
                        }
                    }
                });
            } else {
                map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', 'visible');
                // Reduce fill opacity
                const layers = map.getStyle()?.layers || [];
                layers.forEach(layer => {
                    if (layer.type === 'fill' && layer.id !== SATELLITE_LAYER_ID) {
                        try {
                            map.setPaintProperty(layer.id, 'fill-opacity', 0.3);
                        } catch (e) {}
                    }
                });
            }
        } else {
            // Hide satellite layer and restore fill opacity
            if (map.getLayer(SATELLITE_LAYER_ID)) {
                map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', 'none');
            }
            // Restore fill opacity
            const layers = map.getStyle()?.layers || [];
            layers.forEach(layer => {
                if (layer.type === 'fill' && layer.id !== SATELLITE_LAYER_ID) {
                    try {
                        map.setPaintProperty(layer.id, 'fill-opacity', 1);
                    } catch (e) {}
                }
            });
        }
    };

    // Toggle 3D buildings layer on map
    const toggleBuildings = () => {
        const map = useMapStore.getState().map;
        if (!map) return;

        const newEnabled = !buildings3dEnabled;
        useFlightStore.getState().setBuildings3dEnabled(newEnabled);

        if (newEnabled) {
            // Add buildings source if not exists
            if (!map.getSource(BUILDINGS_SOURCE_ID)) {
                map.addSource(BUILDINGS_SOURCE_ID, {
                    url: 'https://tiles.openfreemap.org/planet',
                    type: 'vector'
                });
            }

            // Add 3D buildings layer if not exists
            if (!map.getLayer(BUILDINGS_LAYER_ID)) {
                // Find the first symbol layer with text to insert before
                const layers = map.getStyle()?.layers || [];
                let labelLayerId: string | undefined;
                for (const layer of layers) {
                    if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
                        labelLayerId = layer.id;
                        break;
                    }
                }

                map.addLayer({
                    id: BUILDINGS_LAYER_ID,
                    source: BUILDINGS_SOURCE_ID,
                    'source-layer': 'building',
                    type: 'fill-extrusion',
                    minzoom: 14,
                    filter: ['!=', ['get', 'hide_3d'], true],
                    paint: {
                        'fill-extrusion-color': [
                            'interpolate', ['linear'], ['get', 'render_height'],
                            0, '#8899aa',
                            50, '#667788',
                            100, '#556677',
                            200, '#445566'
                        ],
                        'fill-extrusion-height': [
                            'interpolate', ['linear'], ['zoom'],
                            14, 0,
                            15, ['get', 'render_height']
                        ],
                        'fill-extrusion-base': [
                            'case',
                            ['>=', ['zoom'], 15],
                            ['get', 'render_min_height'],
                            0
                        ],
                        'fill-extrusion-opacity': 0.85
                    }
                } as any, labelLayerId);
            } else {
                map.setLayoutProperty(BUILDINGS_LAYER_ID, 'visibility', 'visible');
            }
        } else {
            // Hide buildings layer
            if (map.getLayer(BUILDINGS_LAYER_ID)) {
                map.setLayoutProperty(BUILDINGS_LAYER_ID, 'visibility', 'none');
            }
        }
    };

    // Update speed directly (from throttle slider) - also sets target for easing
    const setSpeed = (newSpeed: number) => {
        const store = useFlightStore.getState();
        if (flightMode !== 'orbit') {
            setFlightMode('manual');
        }
        store.setTargetSpeed(newSpeed);
        store.setSpeed(newSpeed);
    };

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* MODAL DASHBOARD - Bottom right, above flight button */}
            <div className="absolute bottom-24 right-4 pointer-events-auto w-[420px]">
                <div className="bg-black/95 backdrop-blur-xl border border-green-500/40 rounded-lg shadow-2xl shadow-green-500/10 overflow-hidden">

                    {/* Header - Military style */}
                    <div className="bg-black/90 border-b border-green-500/30 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                            <Plane className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-mono font-bold tracking-widest text-sm">FLT CMD</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`
                                px-2 py-0.5 rounded text-[10px] font-mono font-bold border
                                ${flightMode === 'manual' ? 'bg-green-500/20 text-green-400 border-green-500/50' : ''}
                                ${flightMode === 'orbit' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : ''}
                                ${flightMode === 'off' ? 'bg-slate-500/20 text-slate-300 border-slate-500/50' : ''}
                            `}>
                                {flightMode.toUpperCase()}
                            </div>
                            {/* Satellite toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSatellite}
                                title={satelliteEnabled ? 'Disable satellite view' : 'Enable satellite view'}
                                className={`h-7 w-7 rounded border transition-all ${
                                    satelliteEnabled
                                        ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                                        : 'text-cyan-400/50 hover:bg-cyan-500/20 hover:text-cyan-300 border-cyan-500/30'
                                }`}
                            >
                                <Satellite className="w-4 h-4" />
                            </Button>
                            {/* 3D Buildings toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleBuildings}
                                title={buildings3dEnabled ? 'Disable 3D buildings' : 'Enable 3D buildings'}
                                className={`h-7 w-7 rounded border transition-all ${
                                    buildings3dEnabled
                                        ? 'bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-lg shadow-amber-500/20'
                                        : 'text-amber-400/50 hover:bg-amber-500/20 hover:text-amber-300 border-amber-500/30'
                                }`}
                            >
                                <Building2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded border border-red-500/30"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Telemetry row - Military HUD style */}
                    <div className="px-3 py-2 bg-black/60 border-b border-green-500/20 grid grid-cols-5 gap-1">
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
                            <div className="text-amber-400 font-mono text-xs">{Math.round(clampedAltitude * 3.28084).toLocaleString()}ft</div>
                        </div>
                        <div className="text-center">
                            <div className="text-cyan-400/40 text-[8px] font-mono tracking-wider">TILT</div>
                            <div className="text-cyan-400 font-mono text-xs">{pitch}°</div>
                        </div>
                    </div>

                    {/* CONTROLS - Military Layout */}
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                            {/* THROTTLE - Left side, logarithmic scale */}
                            <VerticalSlider
                                value={speed}
                                onChange={setSpeed}
                                min={25}
                                max={20000}
                                step={5}
                                label="THRTL"
                                unit=""
                                color="green"
                                logarithmic={true}
                                ticks={[
                                    { value: 20000, label: '20K' },
                                    { value: 10000, label: '10K' },
                                    { value: 1000, label: '1K' },
                                    { value: 280, label: '280' },
                                    { value: 25, label: '25' },
                                ]}
                            />

                            {/* HEADING - Center compass + ORBIT controls */}
                            <div className="flex flex-col items-center gap-2">
                                {/* Show compass for non-orbit modes, orbit indicator for orbit mode */}
                                {flightMode !== 'orbit' ? (
                                    <BallCompass heading={heading} targetHeading={targetHeading} onHeadingChange={applyHeading} />
                                ) : (
                                    <OrbitIndicator heading={heading} />
                                )}

                                {/* ORBIT Button */}
                                <button
                                    onClick={() => {
                                        setLastAction('orbit:click');
                                        const map = useMapStore.getState().map;
                                        if (map) {
                                            const center = map.getCenter();
                                            startOrbit([center.lng, center.lat]);
                                        }
                                    }}
                                    onPointerDown={() => setLastAction('orbit:pointerdown')}
                                    className={`
                                        pointer-events-auto
                                        px-4 py-1.5 rounded font-mono text-xs font-bold transition-all border flex items-center gap-2
                                        ${flightMode === 'orbit'
                                            ? 'bg-orange-500 text-black border-orange-400 shadow-lg shadow-orange-500/50'
                                            : 'bg-black/60 text-orange-400/70 border-orange-500/30 hover:bg-orange-500/20 hover:text-orange-300 cursor-pointer'
                                        }
                                    `}
                                >
                                    <RotateCw className="w-3 h-3" />
                                    ORBIT
                                </button>

                                {/* Orbit controls - only show in orbit mode */}
                                {flightMode === 'orbit' ? (
                                    <OrbitControls
                                        lookAtCenter={orbitLookAtCenter}
                                        paused={orbitPaused}
                                        onToggleLook={() => setOrbitLookAtCenter((v) => !v)}
                                        onTogglePause={() => setOrbitPaused((v) => !v)}
                                        onSetCenter={handleSetOrbitCenter}
                                    />
                                ) : (
                                    <div className="text-orange-400/30 text-[8px] font-mono">
                                        {orbitCenter ? 'CENTER LOCKED' : 'CENTERED ON MAP'}
                                    </div>
                                )}
                            </div>

                            {/* ALTITUDE - Animation loop handles zoom easing */}
                            <AltitudeButtons
                                currentZoom={telemetry.zoom}
                                onAltitudeChange={(zoom, defaultSpeed) => {
                                    const store = useFlightStore.getState();
                                    if (flightMode !== 'orbit') {
                                        setFlightMode('manual');
                                    }
                                    // Set target altitude (zoom level) - animation loop will ease to it
                                    store.setTargetAltitude(zoom);
                                    // Set speed preset for this altitude
                                    store.setSpeed(defaultSpeed);
                                    store.setTargetSpeed(defaultSpeed);
                                }}
                            />

                            {/* TILT / PITCH */}
                            <VerticalSlider
                                value={pitch}
                                onChange={applyPitch}
                                min={0}
                                max={85}
                                step={5}
                                label="TILT"
                                unit="°"
                                color="cyan"
                                ticks={[
                                    { value: 85, label: '85' },
                                    { value: 60, label: '60' },
                                    { value: 45, label: '45' },
                                    { value: 30, label: '30' },
                                    { value: 0, label: '0' },
                                ]}
                            />
                        </div>
                    </div>

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

            {/* Debug panel */}
            {debugVisible && (
                <div className="absolute bottom-4 left-4 pointer-events-auto">
                    <div className="bg-black/90 border border-green-500/30 rounded-lg px-3 py-2 font-mono text-[10px] text-green-300 shadow-lg">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-green-400/70">FLIGHT DEBUG</span>
                            <button
                                onClick={() => setDebugVisible(false)}
                                className="text-green-400/50 hover:text-green-300"
                            >
                                HIDE
                            </button>
                        </div>
                        <div>mode: {flightMode}</div>
                        <div>lastAction: {lastAction}</div>
                        <div>animationId: {useFlightStore.getState().animationId ?? 'null'}</div>
                        <div>orbitCenter: {orbitCenter ? `${orbitCenter[0].toFixed(4)}, ${orbitCenter[1].toFixed(4)}` : 'null'}</div>
                        <div>orbitRadiusKm: {orbitRadius.toFixed(2)}</div>
                        <div>orbitAngle: {useFlightStore.getState().orbitAngle.toFixed(2)}</div>
                        <div>orbitClockwise: {orbitClockwise ? 'true' : 'false'}</div>
                        <div>orbitPaused: {orbitPaused ? 'true' : 'false'}</div>
                        <div>lookAtCenter: {orbitLookAtCenter ? 'true' : 'false'}</div>
                        <div>targetHeading: {targetHeading ?? 'null'}</div>
                        <div>targetAltitude: {targetAltitude ?? 'null'}</div>
                        <div>targetPitch: {targetPitch ?? 'null'}</div>
                        <div>targetSpeed: {useFlightStore.getState().targetSpeed ?? 'null'}</div>
                    </div>
                </div>
            )}
            {!debugVisible && (
                <button
                    onClick={() => setDebugVisible(true)}
                    className="absolute bottom-4 left-4 pointer-events-auto bg-black/80 border border-green-500/30 text-green-300 font-mono text-[10px] px-2 py-1 rounded"
                >
                    DEBUG
                </button>
            )}
        </div>
    );
}
