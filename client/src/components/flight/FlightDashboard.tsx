import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';

export function FlightDashboard() {
    const mode = useFlightMode();

    // Show dashboard when flight is active
    if (mode === 'off') return null;

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);
        store.setAnimationId(null);
        store.setMode('off');
    };

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* Top bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md border border-cyan-500/50 rounded-lg px-6 py-2 text-cyan-400 font-mono">
                    MODE: {mode.toUpperCase()}
                </div>
            </div>

            {/* Close button */}
            <div className="absolute top-4 right-4 pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={stopFlight}
                    className="text-cyan-400 hover:bg-cyan-500/20"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
