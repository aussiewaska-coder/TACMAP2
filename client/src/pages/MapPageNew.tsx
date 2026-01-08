// MapPage - Main map page (minimal)
// All functionality comes from the modular components

import { MapLayout } from '@/components/layout';
import { Toaster } from 'sonner';

/**
 * Main map page component
 * 
 * This page is intentionally minimal. It just:
 * - Renders the MapLayout (which handles mobile/desktop)
 * - Provides toast notifications
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
            <Toaster position="top-center" richColors />
        </>
    );
}

export default MapPageNew;
