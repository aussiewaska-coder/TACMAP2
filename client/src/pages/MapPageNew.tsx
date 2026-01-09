// MapPage - Main map page (minimal)
// All functionality comes from the modular components

import { MapLayout } from '@/components/layout';

/**
 * Main map page component
 * 
 * This page is intentionally minimal. It just:
 * - Renders the MapLayout (which handles mobile/desktop)
 * - Relies on the global toaster in App
 * 
 * All map functionality comes from:
 * - MapCore (base map)
 * - Plugins (terrain, navigation, drawing, etc.)
 * - Layout components (mobile/desktop controls)
 */
export function MapPageNew() {
    return (
        <>
            <MapLayout />
        </>
    );
}

export default MapPageNew;
