// MobileControls - Mobile-specific UI controls
// Uses mobileUIStore - INDEPENDENT from desktop

import { MapPin, Settings, Layers, Search, RotateCw, Navigation, Wrench } from 'lucide-react';
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
    const toggleControls = useMobileUIStore((state) => state.toggleControls);

    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    if (!controlsVisible) {
        // Show a small button to bring controls back
        return (
            <Button
                variant="default"
                size="icon"
                onClick={toggleControls}
                title="Show Controls"
                className="fixed bottom-4 right-4 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl w-12 h-12 rounded-full"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Settings className="w-5 h-5" />
            </Button>
        );
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

    const handleTools = () => {
        openBottomSheet('tools');
    };

    return (
        <>
            {/* Bottom action buttons - floating on right */}
            <div
                className="fixed bottom-6 right-4 flex flex-col gap-3"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                {/* Navigation - Cities */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleNavigation}
                    title="Cities & Locations"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-xl w-14 h-14 rounded-2xl"
                >
                    <Navigation className="w-6 h-6" />
                </Button>

                {/* Layers & Styles */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleLayers}
                    title="Layers & Styles"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-xl w-14 h-14 rounded-2xl"
                >
                    <Layers className="w-6 h-6" />
                </Button>

                {/* Tools */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleTools}
                    title="Measurement & Directions"
                    className="bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-xl w-14 h-14 rounded-2xl"
                >
                    <Wrench className="w-6 h-6" />
                </Button>

                {/* Settings */}
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleSettings}
                    title="Settings"
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-xl w-14 h-14 rounded-2xl"
                >
                    <Settings className="w-6 h-6" />
                </Button>

                {/* Rotate */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRotate}
                    title="Rotate Map 90°"
                    className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-xl w-14 h-14 rounded-2xl border-0"
                >
                    <RotateCw className="w-6 h-6" />
                </Button>
            </div>

            {/* Top left - Search and hide controls */}
            <div
                className="fixed top-4 left-4 flex gap-2"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSearch}
                    title="Search"
                    className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-xl w-12 h-12 rounded-2xl border-0"
                >
                    <Search className="w-5 h-5" />
                </Button>
            </div>

            {/* Top right - Hide controls button */}
            <div
                className="fixed top-4 right-4"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleControls}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                >
                    Hide UI
                </Button>
            </div>
        </>
    );
}

export default MobileControls;
