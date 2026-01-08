// StatusIndicator - Shows terrain and connection status
// Responsive - different position/style on mobile vs desktop

import { useMapStore } from '@/stores';
import { useBreakpoint } from '@/hooks';
import { Z_INDEX } from '@/core/constants';

/**
 * Status indicator showing terrain status
 * Positioned differently on mobile vs desktop
 */
export function StatusIndicator() {
    const { isMobile } = useBreakpoint();
    const isLoaded = useMapStore((state) => state.isLoaded);
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);

    if (!isLoaded) {
        return null;
    }

    // Hide on mobile to keep clean interface
    if (isMobile) {
        return null;
    }

    return (
        <div
            className="fixed bottom-4 left-4 flex items-center gap-2 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-xl"
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            {terrainEnabled ? 'AWS 3D Terrain Active' : 'Map Ready'}
        </div>
    );
}

export default StatusIndicator;
