// UnifiedSidebar - Glassmorphic sidebar for both mobile and desktop
// Mobile: hamburger menu with slide-in animation
// Desktop: persistent sidebar with collapse toggle

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';
import {
    MapPin, Settings, Layers, Search, Menu, X, Wrench,
    ChevronLeft, Compass, Radio, Plane
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesktopUIStore } from '@/stores';
import { useBreakpoint } from '@/hooks';
import { Z_INDEX } from '@/core/constants';
import { CityList } from './CityList';
import { LayersList } from './LayersList';
import { SettingsPanel } from './SettingsPanel';
import { ToolsPanel } from './ToolsPanel';
import { SearchBox } from './SearchBox';
import { UnifiedAlertsPanel } from './UnifiedAlertsPanel';

type PanelType = 'layers' | 'search' | 'settings' | 'navigation' | 'tools' | 'alerts';

// Context for dark sidebar theme
const SidebarThemeContext = createContext<{ isDark: boolean }>({ isDark: false });
export const useSidebarTheme = () => useContext(SidebarThemeContext);

interface TabConfig {
    id: PanelType;
    icon: React.ReactNode;
    label: string;
}

const TABS: TabConfig[] = [
    { id: 'search', icon: <Search className="w-4 h-4" />, label: 'Search' },
    { id: 'alerts', icon: <Radio className="w-4 h-4" />, label: 'Alerts' },
    { id: 'layers', icon: <Layers className="w-4 h-4" />, label: 'Layers' },
    { id: 'navigation', icon: <Compass className="w-4 h-4" />, label: 'Navigate' },
    { id: 'tools', icon: <Wrench className="w-4 h-4" />, label: 'Tools' },
    { id: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings' },
];

/**
 * Unified sidebar component with glassmorphic design
 * Responsive: hamburger on mobile, persistent on desktop
 */
export function UnifiedSidebar() {
    const { isMobile } = useBreakpoint();

    // Mobile state
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState<PanelType>('layers');

    // Flight simulator
    const map = useMapStore((state) => state.map);
    const [flightMode, setFlightMode] = useState<'off' | 'pan' | 'sightseeing'>('off');
    const flightRef = useRef<number | null>(null);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevProj = useRef<string | null>(null);
    const stopFlight = () => { if (flightRef.current) { cancelAnimationFrame(flightRef.current); flightRef.current = null; } if (prevProj.current && map) { map.setProjection({ type: prevProj.current as any }); prevProj.current = null; } setFlightMode('off'); };

    // Stop flight on user interaction
    useEffect(() => {
        if (!map) return;
        const stop = () => { if (flightRef.current) stopFlight(); };
        map.on('dragstart', stop);
        map.on('wheel', stop);
        map.on('dblclick', stop);
        map.on('touchstart', stop);
        return () => { map.off('dragstart', stop); map.off('wheel', stop); map.off('dblclick', stop); map.off('touchstart', stop); };
    }, [map]);
    const startPan = () => { console.log('startPan called, map:', !!map); if (!map) { console.log('NO MAP!'); return; } stopFlight(); setFlightMode('pan'); let last = 0; const go = (t: number) => { if (!map) return; if (last) { const c = map.getCenter(); map.setCenter([c.lng, Math.min(85, c.lat + 0.00008 * (t - last))]); } last = t; flightRef.current = requestAnimationFrame(go); }; flightRef.current = requestAnimationFrame(go); toast.info('Flight: Pan north'); };
    const startSight = () => { if (!map) return; stopFlight(); prevProj.current = map.getProjection()?.type || 'mercator'; map.setProjection({ type: 'globe' }); setFlightMode('sightseeing'); let last = 0, tb = map.getBearing(), tz = map.getZoom(), wp = { lng: map.getCenter().lng, lat: map.getCenter().lat }; const go = (t: number) => { if (!map) return; if (last) { const d = Math.min(t - last, 50), c = map.getCenter(), z = map.getZoom(), dx = wp.lng - c.lng, dy = wp.lat - c.lat; if (Math.sqrt(dx*dx+dy*dy) < 0.02) { const a = Math.random()*6.28; wp = { lng: ((c.lng+Math.cos(a)*0.15+180)%360)-180, lat: Math.max(-85,Math.min(85,c.lat+Math.sin(a)*0.15)) }; tb = (tb+Math.random()*90-45+360)%360; tz = 3 + Math.random()*10; } const ma = Math.atan2(dy,dx), b = map.getBearing(), bd = ((tb-b+540)%360)-180, zd = tz - z; map.jumpTo({ center: [c.lng+Math.cos(ma)*0.00012*d, Math.max(-85,Math.min(85,c.lat+Math.sin(ma)*0.00012*d))], bearing: b+Math.sign(bd)*Math.min(Math.abs(bd),0.03*d), zoom: z+Math.sign(zd)*Math.min(Math.abs(zd),0.005*d) }); } last = t; flightRef.current = requestAnimationFrame(go); }; flightRef.current = requestAnimationFrame(go); toast.info('Flight: Sightseeing'); };
    const fDown = () => { pressTimer.current = setTimeout(() => { startSight(); pressTimer.current = null; }, 500); };
    const fUp = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; if (flightMode === 'off') startPan(); else stopFlight(); } };

    // Desktop state from store
    const sidebarCollapsed = useDesktopUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useDesktopUIStore((state) => state.toggleSidebar);
    const activePanel = useDesktopUIStore((state) => state.activePanel);
    const setActivePanel = useDesktopUIStore((state) => state.setActivePanel);
    const sidebarWidth = useDesktopUIStore((state) => state.sidebarWidth);

    // Close mobile sidebar on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileOpen) {
                setMobileOpen(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [mobileOpen]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen && isMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen, isMobile]);

    const currentTab = isMobile ? mobileActiveTab : (activePanel || 'layers');
    const setCurrentTab = isMobile
        ? setMobileActiveTab
        : (tab: PanelType) => setActivePanel(tab);

    const handleResultSelect = () => {
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const closeSidebar = () => {
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    // Mobile hamburger button
    const MobileHamburger = () => (
        <Button
            variant="default"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="
                fixed top-4 left-4 
                bg-white/80 backdrop-blur-xl text-gray-800 
                hover:bg-white/95 shadow-2xl 
                w-12 h-12 rounded-2xl border border-white/50
                transition-all duration-300 hover:scale-105
                active:scale-95
            "
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Menu className="w-5 h-5" />
        </Button>
    );

    // Sidebar content (shared between mobile and desktop)
    const SidebarContent = ({ isDesktop = false }: { isDesktop?: boolean }) => (
        <SidebarThemeContext.Provider value={{ isDark: true }}>
            {/* Header */}
            <div className="
                flex items-center justify-between p-4 
                border-b border-white/10
                bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90
            ">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-wide">TACMAP</h1>
                        <p className="text-xs text-white/70">Tactical Mapping</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => isMobile ? setMobileOpen(false) : toggleSidebar()}
                    className="h-9 w-9 text-white hover:bg-white/20 rounded-xl"
                >
                    {isMobile ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </Button>
            </div>

            {/* Search always visible at top */}
            <div className="p-4 border-b border-white/10 bg-black/20">
                <SearchBox
                    onResultSelect={handleResultSelect}
                    placeholder="Search Australia..."
                    className="w-full"
                />
            </div>

            {/* Panel tabs */}
            <div className="flex border-b border-white/10 bg-black/10 overflow-x-auto scrollbar-hide">
                {TABS.filter(t => t.id !== 'search').map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setCurrentTab(tab.id)}
                        className={`
                            flex-1 min-w-[70px] flex flex-col items-center justify-center py-3 px-2
                            text-xs font-medium transition-all duration-200
                            ${currentTab === tab.id
                                ? 'text-white border-b-2 border-white bg-white/10'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        {tab.icon}
                        <span className="mt-1 text-[10px] sm:text-xs">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Panel content - with dark theme wrapper */}
            <div className="flex-1 overflow-y-auto p-4 overscroll-contain sidebar-dark-theme">
                {currentTab === 'search' && (
                    <div className="text-center py-8 text-white/50">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Use the search box above</p>
                    </div>
                )}
                {currentTab === 'alerts' && <UnifiedAlertsPanel />}
                {currentTab === 'layers' && <LayersList />}
                {currentTab === 'navigation' && <CityList onSelect={closeSidebar} />}
                {currentTab === 'tools' && <ToolsPanel />}
                {currentTab === 'settings' && <SettingsPanel />}
            </div>

            {/* Footer with keyboard hints (desktop only) */}
            {isDesktop && (
                <div className="p-3 border-t border-white/10 bg-black/20 text-xs text-white/50">
                    <div className="font-medium mb-1 text-white/70">Keyboard shortcuts:</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <span><kbd className="bg-white/20 px-1 rounded text-white/80">R</kbd> Reset north</span>
                        <span><kbd className="bg-white/20 px-1 rounded text-white/80">T</kbd> Toggle 3D</span>
                        <span><kbd className="bg-white/20 px-1 rounded text-white/80">⌘K</kbd> Search</span>
                        <span><kbd className="bg-white/20 px-1 rounded text-white/80">Esc</kbd> Close</span>
                    </div>
                </div>
            )}
        </SidebarThemeContext.Provider>
    );

    // Flight button component
    const FlightButton = () => (
        <Button
            variant={flightMode !== 'off' ? 'default' : 'outline'}
            size="icon"
            onMouseDown={fDown}
            onMouseUp={fUp}
            onMouseLeave={() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }}
            onTouchStart={fDown}
            onTouchEnd={fUp}
            title="Flight (click: pan, hold: sightseeing)"
            className={`fixed bottom-6 right-4 shadow-2xl w-14 h-14 rounded-2xl select-none transition-all ${flightMode === 'pan' ? 'bg-blue-600 text-white' : flightMode === 'sightseeing' ? 'bg-purple-600 text-white animate-pulse' : 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50'}`}
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );

    // --- MOBILE LAYOUT ---
    if (isMobile) {
        return (
            <>
                <MobileHamburger />
                <FlightButton />

                {/* Backdrop with fade */}
                <div
                    className={`
                        fixed inset-0 bg-black/60 backdrop-blur-sm
                        transition-opacity duration-300 ease-out
                        ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                    style={{ zIndex: Z_INDEX.SIDEBAR - 1 }}
                    onClick={() => setMobileOpen(false)}
                />

                {/* Slide-in sidebar */}
                <div
                    className={`
                        fixed top-0 left-0 h-full w-[85vw] max-w-[360px]
                        bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98
                        backdrop-blur-2xl shadow-2xl
                        flex flex-col
                        border-r border-white/10
                        transition-transform duration-300 ease-out
                        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}
                    style={{ zIndex: Z_INDEX.SIDEBAR }}
                >
                    <SidebarContent />
                </div>
            </>
        );
    }

    // --- DESKTOP LAYOUT ---
    return (
        <>
            <FlightButton />

            {/* Sidebar toggle button (when collapsed) */}
            {sidebarCollapsed && (
                <Button
                    variant="default"
                    size="icon"
                    onClick={toggleSidebar}
                    className="
                        fixed top-4 left-4 
                        bg-white/90 backdrop-blur-xl text-gray-800 
                        hover:bg-white shadow-xl 
                        w-12 h-12 rounded-xl border border-gray-200
                        transition-all duration-300 hover:scale-105
                    "
                    style={{ zIndex: Z_INDEX.CONTROLS }}
                >
                    <Menu className="w-5 h-5" />
                </Button>
            )}

            {/* Desktop sidebar */}
            <div
                className={`
                    fixed top-0 left-0 h-full
                    bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98
                    backdrop-blur-2xl shadow-2xl
                    flex flex-col
                    border-r border-white/10
                    transition-all duration-300 ease-out
                `}
                style={{
                    zIndex: Z_INDEX.SIDEBAR,
                    width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`,
                    transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                    opacity: sidebarCollapsed ? 0 : 1,
                }}
            >
                <SidebarContent isDesktop />
            </div>
        </>
    );
}

export default UnifiedSidebar;
