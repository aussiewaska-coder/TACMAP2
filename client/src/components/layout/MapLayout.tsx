// MapLayout - Main layout component with unified sidebar
// This is the top-level layout that renders the map and controls

import { MapContainer } from '@/core';
import { useBreakpoint } from '@/hooks';
import { UnifiedSidebar } from './UnifiedSidebar';
import { StatusIndicator } from './StatusIndicator';
import { KeyboardControls } from '@/components/controls/KeyboardControls';
import { PluginLoader } from '@/plugins/PluginLoader';
import { UserLocationLayer } from '@/layers/live/UserLocationLayer';

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
 *   - Includes Police Alerts panel in the sidebar tabs
 * - StatusIndicator (shared)
 * - KeyboardControls (desktop only)
 * 
 * The UnifiedSidebar handles all the responsive behavior internally.
 * Police alerts are now controlled from the sidebar's "Alerts" tab.
 */
export function MapLayout({ className = '' }: MapLayoutProps) {
    const { isMobile } = useBreakpoint();

    return (
        <div className={`relative w-full h-screen overflow-hidden ${className}`}>
            {/* Map - Shared between mobile and desktop */}
            <MapContainer className="absolute inset-0" />

            {/* Plugin system initialization */}
            <PluginLoader />

            {/* Unified sidebar - handles mobile/desktop internally */}
            {/* Police alerts are now in the sidebar's "Alerts" tab */}
            <UnifiedSidebar />


            {/* User location with heading indicator */}
            <UserLocationLayer />

            {/* Desktop-only keyboard controls */}
            {!isMobile && <KeyboardControls enabled={true} />}

            {/* Status indicator - Shared, but styled differently per viewport */}
            <StatusIndicator />
        </div>
    );
}

export default MapLayout;
