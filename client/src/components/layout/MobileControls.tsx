// MobileControls - Mobile-specific UI controls
// Uses mobileUIStore - INDEPENDENT from desktop

import { MapPin, Settings, Layers, Search, RotateCw, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileUIStore } from '@/stores';
import { useMapStore } from '@/stores';
import { Z_INDEX } from '@/core/constants';
import { toast } from 'sonner';

/**
 * Mobile control buttons
 * 
 * These buttons have their own state in mobileUIStore.
 * Pressing a button here does NOT affect the desktop UI.
 */
export function MobileControls() {
    const controlsVisible = useMobileUIStore((state) => state.controlsVisible);
    const openBottomSheet = useMobileUIStore((state) => state.openBottomSheet);
    const activeQuickAction = useMobileUIStore((state) => state.activeQuickAction);
    const setActiveQuickAction = useMobileUIStore((state) => state.setActiveQuickAction);

    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    if (!controlsVisible) {
        return null;
    }

    const handleRotate = () => {
        if (map && isLoaded) {
            const currentBearing = map.getBearing();
            map.easeTo({
                bearing: currentBearing + 90,
                duration: 500,
            });
            toast.info('Rotating map 90°');
        }
    };

    const handleNavigation = () => {
        openBottomSheet('cities');
    };

    const handleLayers = () => {
        openBottomSheet('layers');
    };

    const handleSettings = () => {
        openBottomSheet('settings');
    };

    const handleSearch = () => {
        openBottomSheet('search');
    };

    return (
        <>
            {/* Bottom action buttons */}
            <div
                className="fixed bottom-24 right-4 flex flex-col gap-3"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                {/* Navigation - Cities */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleNavigation}
                    title="Cities & Locations"
                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-xl w-14 h-14 rounded-full"
                >
                    <Navigation className="w-6 h-6" />
                </Button>

                {/* Layers */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleLayers}
                    title="Layers"
                    className="bg-purple-600 text-white hover:bg-purple-700 shadow-xl w-14 h-14 rounded-full"
                >
                    <Layers className="w-6 h-6" />
                </Button>

                {/* Settings */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleSettings}
                    title="Settings"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl w-14 h-14 rounded-full"
                >
                    <Settings className="w-6 h-6" />
                </Button>

                {/* Rotate */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRotate}
                    title="Rotate Map 90°"
                    className="bg-white text-gray-800 hover:bg-gray-100 shadow-xl w-14 h-14 rounded-full"
                >
                    <RotateCw className="w-6 h-6" />
                </Button>
            </div>

            {/* Top search button */}
            <div
                className="fixed top-4 left-4"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSearch}
                    title="Search"
                    className="bg-white text-gray-800 hover:bg-gray-100 shadow-xl w-12 h-12 rounded-full"
                >
                    <Search className="w-5 h-5" />
                </Button>
            </div>
        </>
    );
}

export default MobileControls;
