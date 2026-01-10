// MapContainer - Responsive container for the map
// Handles sizing and passes correct dimensions to MapCore

import { MapCore } from './MapCore';

interface MapContainerProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Container component that provides proper sizing for MapCore
 * 
 * This component ensures the map fills the available space and
 * handles responsive sizing. It's a thin wrapper around MapCore.
 */
export function MapContainer({ className = '' }: MapContainerProps) {
    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            <MapCore className="absolute inset-0" />
        </div>
    );
}

export default MapContainer;
