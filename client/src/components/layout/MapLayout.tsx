// MapLayout - Main layout component with unified sidebar
// This is the top-level layout that renders the map and controls

import { MapContainer } from '@/core';
import { useBreakpoint } from '@/hooks';
import { UnifiedSidebar } from './UnifiedSidebar';
import { StatusIndicator } from './StatusIndicator';
import { KeyboardControls } from '@/components/controls/KeyboardControls';
import { PluginLoader } from '@/plugins/PluginLoader';
import { UserLocationLayer } from '@/layers/live/UserLocationLayer';
import { FlightButton } from '@/components/flight/FlightButton';
import { FlightDashboard } from '@/components/flight/FlightDashboard';
import { useMapProviderStore } from '@/stores';
import { useLocation } from 'wouter';
import { Z_INDEX } from '@/core/constants';

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
    const provider = useMapProviderStore((state) => state.provider);
    const [, setLocation] = useLocation();

    return (
        <div className={`relative w-full h-screen overflow-hidden ${className}`}>
            {/* Map - Shared between mobile and desktop */}
            <MapContainer className="absolute inset-0" />

            {/* Plugin system initialization */}
            <PluginLoader />

            {/* Unified sidebar - handles mobile/desktop internally */}
            {/* Police alerts are now in the sidebar's "Alerts" tab */}
            <UnifiedSidebar />

            {/* Flight simulator */}
            <FlightButton />
            <FlightDashboard />


            {/* User location with heading indicator */}
            <UserLocationLayer />

            {/* Desktop-only keyboard controls */}
            {!isMobile && <KeyboardControls enabled={true} />}

            {/* Status indicator - Shared, but styled differently per viewport */}
            <StatusIndicator />

            {/* Provider badge */}
            {!isMobile && (
                <div
                    className="fixed bottom-4 right-4 flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 backdrop-blur"
                    style={{ zIndex: Z_INDEX.CONTROLS, fontFamily: 'var(--recon-font-mono)' }}
                >
                    <span>{provider}</span>
                    <button
                        type="button"
                        onClick={() => setLocation('/')}
                        className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white"
                    >
                        Switch
                    </button>
                </div>
            )}
        </div>
    );
}

export default MapLayout;
