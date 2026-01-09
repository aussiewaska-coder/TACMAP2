import { X, Plane, Compass, Gauge, Navigation, Globe, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode, useFlightSpeed } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { useEffect, useState } from 'react';

export function FlightDashboard() {
    const mode = useFlightMode();
    const speed = useFlightSpeed(); // From store
    const [telemetry, setTelemetry] = useState({
        lat: 0,
        lng: 0,
        bearing: 0,
        zoom: 0,
    });

    // Local controls state - initialized from map ONCE when flight starts
    const [heading, setHeading] = useState(0);
    const [altitude, setAltitude] = useState(10000);
    const [initialized, setInitialized] = useState(false);

    // Initialize controls from current map state when dashboard opens (ONCE)
    useEffect(() => {
        if (mode === 'off') {
            setInitialized(false);
            return;
        }

        const map = useMapStore.getState().map;
        if (!map || initialized) return;

        // Sync heading with current bearing
        setHeading(Math.round((map.getBearing() + 360) % 360));

        // Sync altitude with current zoom
        // zoom 18 = 500m, zoom 1 = 50000m (inverse log scale)
        const zoom = map.getZoom();
        const alt = Math.round(500 * Math.pow(2, 18 - zoom));
        setAltitude(Math.max(1000, Math.min(50000, alt)));

        setInitialized(true);
    }, [mode, initialized]);

    // Update telemetry display only (no control sync)
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
        }, 100);

        return () => clearInterval(interval);
    }, [mode]);

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

    // Apply heading change
    const applyHeading = (newHeading: number) => {
        setHeading(newHeading);
        const map = useMapStore.getState().map;
        if (map) {
            map.easeTo({ bearing: newHeading, duration: 300 });
        }
    };

    // Apply altitude change (affects zoom)
    const applyAltitude = (newAlt: number) => {
        setAltitude(newAlt);
        // Convert altitude to zoom: higher altitude = lower zoom
        // 1000m = zoom 15, 50000m = zoom 3
        const zoom = 18 - (Math.log(newAlt / 500) / Math.log(2));
        const map = useMapStore.getState().map;
        if (map) {
            map.easeTo({ zoom: Math.max(1, Math.min(18, zoom)), duration: 300 });
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
                            <div className="text-cyan-400 font-mono text-sm">{altitude.toLocaleString()}m</div>
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

                        {/* HEADING */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-cyan-400/70 text-xs font-mono flex items-center gap-2">
                                    <Compass className="w-3 h-3" />
                                    HEADING
                                </label>
                                <span className="text-cyan-400 font-mono text-sm font-bold">{heading}°</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="359"
                                    value={heading}
                                    onChange={(e) => applyHeading(Number(e.target.value))}
                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-4
                                        [&::-webkit-slider-thumb]:h-4
                                        [&::-webkit-slider-thumb]:bg-cyan-500
                                        [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:cursor-pointer"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => applyHeading(0)}
                                    className="h-7 px-2 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                                >
                                    <RotateCw className="w-3 h-3 mr-1" />
                                    N
                                </Button>
                            </div>
                            <div className="flex justify-between text-[10px] text-cyan-400/40 font-mono">
                                <span>N 0°</span>
                                <span>E 90°</span>
                                <span>S 180°</span>
                                <span>W 270°</span>
                            </div>
                        </div>

                        {/* ALTITUDE */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-cyan-400/70 text-xs font-mono flex items-center gap-2">
                                    <Navigation className="w-3 h-3 -rotate-45" />
                                    ALTITUDE
                                </label>
                                <span className="text-cyan-400 font-mono text-sm font-bold">{altitude.toLocaleString()}m</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="50000"
                                step="1000"
                                value={altitude}
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
