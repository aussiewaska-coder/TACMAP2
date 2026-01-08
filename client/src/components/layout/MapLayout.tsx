// MapLayout - Main layout component with independent mobile/desktop views
// This is the top-level layout that decides which UI to render

import { MapContainer } from '@/core';
import { useBreakpoint } from '@/hooks';
import { MobileControls } from './MobileControls';
import { DesktopControls } from './DesktopControls';
import { StatusIndicator } from './StatusIndicator';
import { BottomSheet } from './BottomSheet';
import { KeyboardControls } from '@/components/controls/KeyboardControls';
import { PluginLoader } from '@/plugins/PluginLoader';

interface MapLayoutProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Main map layout component
 * 
 * Renders:
 * - MapContainer (shared between mobile/desktop)
 * - MobileControls OR DesktopControls (independent, not both)
 * - BottomSheet (mobile only)
 * - StatusIndicator (shared)
 * - KeyboardControls (desktop only)
 * 
 * Mobile and desktop UIs are COMPLETELY INDEPENDENT.
 * They share the map and its state, but UI state is separate.
 */
export function MapLayout({ className = '' }: MapLayoutProps) {
    const { isMobile, isDesktop } = useBreakpoint();

    return (
        <div className={`relative w-full h-screen overflow-hidden ${className}`}>
            {/* Map - Shared between mobile and desktop */}
            <MapContainer className="absolute inset-0" />

            {/* Plugin system initialization */}
            <PluginLoader />

            {/* Controls - Separate implementations for mobile/desktop */}
            {/* Only ONE is rendered at a time */}
            {isMobile ? (
                <>
                    <MobileControls />
                    <BottomSheet />
                </>
            ) : isDesktop ? (
                <>
                    <DesktopControls />
                    <KeyboardControls enabled={true} />
                </>
            ) : (
                // Tablet uses desktop controls with some mobile elements
                <>
                    <DesktopControls />
                    <KeyboardControls enabled={true} />
                </>
            )}

            {/* Status indicator - Shared, but styled differently per viewport */}
            <StatusIndicator />
        </div>
    );
}

export default MapLayout;
