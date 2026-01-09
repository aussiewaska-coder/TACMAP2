import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightDashboardOpen, useFlightStore } from '@/stores/flightStore';

export function FlightButton() {
    const dashboardOpen = useFlightDashboardOpen();
    const openDashboard = useFlightStore((s) => s.openDashboard);

    return (
        <Button
            variant={dashboardOpen ? 'default' : 'outline'}
            size="icon"
            onClick={() => {
                if (!dashboardOpen) {
                    openDashboard();
                }
            }}
            title="Open flight simulator"
            className={
                `
                fixed bottom-6 right-4 w-14 h-14 rounded-2xl shadow-2xl select-none
                ${dashboardOpen ? 'bg-blue-600 text-white' : 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50'}
            `
            }
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );
}

export default FlightButton;
