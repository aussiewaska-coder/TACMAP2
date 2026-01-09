import { X, Plane, Compass, Gauge, Navigation, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { useEffect, useState } from 'react';

export function FlightDashboard() {
    const mode = useFlightMode();
    const [telemetry, setTelemetry] = useState({
        lat: 0,
        lng: 0,
        bearing: 0,
        zoom: 0,
        speed: 0,
    });

    // Update telemetry from map
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
                speed: mode === 'pan' ? 500 : 720,
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

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* MODAL DASHBOARD - Bottom right, above flight button */}
            <div className="absolute bottom-24 right-4 pointer-events-auto w-80">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Plane className="w-5 h-5 text-white" />
                            <span className="text-white font-bold tracking-wide">FLIGHT COMMAND</span>
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

                    {/* Mode indicator */}
                    <div className="px-4 py-3 border-b border-cyan-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-cyan-400/70 text-sm font-mono">MODE</span>
                            <div className={`
                                px-3 py-1 rounded-full font-mono font-bold text-sm
                                ${mode === 'pan' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : ''}
                                ${mode === 'sightseeing' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 animate-pulse' : ''}
                            `}>
                                {mode === 'pan' && '↑ PAN NORTH'}
                                {mode === 'sightseeing' && '🌍 SIGHTSEEING'}
                            </div>
                        </div>
                    </div>

                    {/* Telemetry grid */}
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {/* Latitude */}
                        <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                            <div className="flex items-center gap-2 text-cyan-400/60 text-xs mb-1">
                                <Navigation className="w-3 h-3" />
                                LAT
                            </div>
                            <div className="text-cyan-400 font-mono text-lg">
                                {telemetry.lat.toFixed(4)}°
                            </div>
                        </div>

                        {/* Longitude */}
                        <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                            <div className="flex items-center gap-2 text-cyan-400/60 text-xs mb-1">
                                <Navigation className="w-3 h-3 rotate-90" />
                                LNG
                            </div>
                            <div className="text-cyan-400 font-mono text-lg">
                                {telemetry.lng.toFixed(4)}°
                            </div>
                        </div>

                        {/* Bearing */}
                        <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                            <div className="flex items-center gap-2 text-cyan-400/60 text-xs mb-1">
                                <Compass className="w-3 h-3" />
                                BEARING
                            </div>
                            <div className="text-cyan-400 font-mono text-lg">
                                {telemetry.bearing.toFixed(0)}°
                            </div>
                        </div>

                        {/* Zoom/Altitude */}
                        <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                            <div className="flex items-center gap-2 text-cyan-400/60 text-xs mb-1">
                                <Gauge className="w-3 h-3" />
                                ZOOM
                            </div>
                            <div className="text-cyan-400 font-mono text-lg">
                                {telemetry.zoom.toFixed(1)}
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
                    <div className="p-4 pt-0">
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
