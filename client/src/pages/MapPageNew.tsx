// MapPage - Main map page (minimal)
// All functionality comes from the modular components

import { useEffect } from 'react';
import { MapLayout } from '@/components/layout';
import { useDesktopUIStore, useMapProviderStore, type MapProvider } from '@/stores';

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
    const setProvider = useMapProviderStore((state) => state.setProvider);
    const setActivePanel = useDesktopUIStore((state) => state.setActivePanel);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const providerParam = params.get('provider') as MapProvider | null;
        const panelParam = params.get('panel');

        if (providerParam === 'mapbox' || providerParam === 'maptiler') {
            setProvider(providerParam);
        }
        if (panelParam === 'alerts') {
            setActivePanel('alerts');
        }
    }, [setProvider, setActivePanel]);

    return (
        <>
            <MapLayout />
        </>
    );
}

export default MapPageNew;
