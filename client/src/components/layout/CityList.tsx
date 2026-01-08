// CityList - List of Australian cities for navigation
// Used in both mobile bottom sheet and desktop sidebar

import { MapPin, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUSTRALIAN_CITIES, SCENIC_LOCATIONS } from '@/core/constants';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

interface CityListProps {
    onSelect?: () => void;
}

/**
 * City and location list for quick navigation
 */
export function CityList({ onSelect }: CityListProps) {
    const flyTo = useMapStore((state) => state.flyTo);
    const resetView = useMapStore((state) => state.resetView);

    const handleCityClick = (city: typeof AUSTRALIAN_CITIES[number]) => {
        flyTo(city.coordinates as [number, number], city.zoom, {
            pitch: 60,
            duration: 3500,
        });
        toast.success(`Flying to ${city.name}`, {
            duration: 2000,
        });
        onSelect?.();
    };

    const handleScenicClick = (location: typeof SCENIC_LOCATIONS[number]) => {
        flyTo(location.coordinates as [number, number], location.zoom, {
            pitch: 70, // Higher pitch for scenic views
            duration: 4000,
        });
        toast.success(`Flying to ${location.name}`, {
            duration: 2000,
        });
        onSelect?.();
    };

    const handleReset = () => {
        resetView();
        toast.info('Returning to Australia overview');
        onSelect?.();
    };

    return (
        <div className="space-y-6">
            {/* Reset button */}
            <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleReset}
            >
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Reset to Australia Overview</span>
            </Button>

            {/* Cities */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Major Cities
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {AUSTRALIAN_CITIES.map((city) => (
                        <Button
                            key={city.id}
                            variant="outline"
                            className="justify-start gap-2 h-11"
                            onClick={() => handleCityClick(city)}
                        >
                            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate">{city.name}</span>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Scenic Locations */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Scenic Locations
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {SCENIC_LOCATIONS.map((location) => (
                        <Button
                            key={location.id}
                            variant="outline"
                            className="justify-start gap-2 h-11"
                            onClick={() => handleScenicClick(location)}
                        >
                            <Mountain className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="truncate">{location.name}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CityList;
