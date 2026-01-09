// FlightDashboard - Simplified to work
import { useFlightStore } from '@/stores';
import { Z_INDEX } from '@/core/constants';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FlightDashboard() {
    const dashboardOpen = useFlightStore((state) => state.dashboardOpen);
    const closeDashboard = useFlightStore((state) => state.closeDashboard);

    if (!dashboardOpen) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            <div className="absolute top-4 right-4 pointer-events-auto">
                <div className="bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg p-4 text-cyan-400 font-mono">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-bold">Flight Dashboard</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeDashboard}
                            className="text-cyan-400 hover:bg-cyan-500/20"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <p className="text-sm text-cyan-500/70">Dashboard is working.</p>
                </div>
            </div>
        </div>
    );
}

export default FlightDashboard;
