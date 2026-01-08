// MapLayout - Main layout component with unified sidebar
// This is the top-level layout that renders the map and controls

import { MapContainer } from '@/core';
import { useBreakpoint } from '@/hooks';
import { UnifiedSidebar } from './UnifiedSidebar';
import { StatusIndicator } from './StatusIndicator';
import { KeyboardControls } from '@/components/controls/KeyboardControls';
import { PluginLoader } from '@/plugins/PluginLoader';
import { PoliceLayer } from '@/layers/live/PoliceLayer';

interface MapLayoutProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Main map layout component
 * 
 * Renders:
 * - MapContainer (shared between mobile/desktop)
 * - UnifiedSidebar (responsive - hamburger on mobile, persistent on desktop)
 * - StatusIndicator (shared)
 * - KeyboardControls (desktop only)
 * - PoliceLayer (map data layer)
 * 
 * The UnifiedSidebar handles all the responsive behavior internally.
 */
export function MapLayout({ className = '' }: MapLayoutProps) {
    const { isMobile, isDesktop } = useBreakpoint();

    return (
        <div className={`relative w-full h-screen overflow-hidden ${className}`}>
            {/* Map - Shared between mobile and desktop */}
            <MapContainer className="absolute inset-0" />

            {/* Plugin system initialization */}
            <PluginLoader />

            {/* Unified sidebar - handles mobile/desktop internally */}
            <UnifiedSidebar />

            {/* Desktop-only components */}
            {!isMobile && (
                <>
                    <KeyboardControls enabled={true} />
                    <PoliceLayer />
                </>
            )}

            {/* Mobile also gets police layer */}
            {isMobile && <PoliceLayer />}

            {/* Status indicator - Shared, but styled differently per viewport */}
            <StatusIndicator />
        </div>
    );
}

export default MapLayout;
