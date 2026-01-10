// MapPage - Main map page (minimal)
// All functionality comes from the modular components

import { useEffect } from 'react';
import { ReconLayout } from '@/components/recon';
import { useMapProviderStore, type MapProvider } from '@/stores';

/**
 * Main map page component
 *
 * This page is intentionally minimal. It just:
 * - Renders the RECONMAP layout (alerts-only dashboard)
 * - Relies on the global toaster in App
 */
export function MapPageNew() {
    const setProvider = useMapProviderStore((state) => state.setProvider);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const providerParam = params.get('provider') as MapProvider | null;

        if (providerParam === 'mapbox' || providerParam === 'maptiler') {
            setProvider(providerParam);
        }
    }, [setProvider]);

    return (
        <>
            <ReconLayout />
        </>
    );
}

export default MapPageNew;
