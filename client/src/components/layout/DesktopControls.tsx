// DesktopControls - Desktop-specific UI controls
// Uses desktopUIStore - INDEPENDENT from mobile

import { MapPin, Settings, Layers, Search, Menu, ChevronLeft, Wrench, Cloud, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesktopUIStore, useMapStore } from '@/stores';
import { Z_INDEX } from '@/core/constants';
import { CityList } from './CityList';
import { LayersList } from './LayersList';
import { SettingsPanel } from './SettingsPanel';
import { ToolsPanel } from './ToolsPanel';
import { SearchBox } from './SearchBox';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Desktop control elements
 * 
 * These components use desktopUIStore.
 * Actions here do NOT affect the mobile UI.
 */
export function DesktopControls() {
    const sidebarCollapsed = useDesktopUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useDesktopUIStore((state) => state.toggleSidebar);
    const activePanel = useDesktopUIStore((state) => state.activePanel);
    const setActivePanel = useDesktopUIStore((state) => state.setActivePanel);
    const sidebarWidth = useDesktopUIStore((state) => state.sidebarWidth);

    const [searchOpen, setSearchOpen] = useState(false);

    const map = useMapStore((state) => state.map);
    const [flightMode, setFlightMode] = useState<'off' | 'pan' | 'sightseeing'>('off');
    const flightRef = useRef<number | null>(null);
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevProjRef = useRef<string | null>(null);

    const stopFlight = () => {
        if (flightRef.current) { cancelAnimationFrame(flightRef.current); flightRef.current = null; }
        if (prevProjRef.current && map) { map.setProjection({ type: prevProjRef.current as 'mercator' | 'globe' }); prevProjRef.current = null; }
        setFlightMode('off');
    };
    const startPan = () => {
        if (!map) return; stopFlight(); setFlightMode('pan'); let last = 0;
        const go = (t: number) => { if (!map) return; if (last) { const c = map.getCenter(); map.setCenter([c.lng, Math.min(85, c.lat + 0.00008 * (t - last))]); } last = t; flightRef.current = requestAnimationFrame(go); };
        flightRef.current = requestAnimationFrame(go); toast.info('Flight: Pan north');
    };
    const startSightseeing = () => {
        if (!map) return; stopFlight(); prevProjRef.current = map.getProjection()?.type || 'mercator'; map.setProjection({ type: 'globe' }); setFlightMode('sightseeing');
        let last = 0, tb = map.getBearing(), wp = { lng: map.getCenter().lng, lat: map.getCenter().lat };
        const go = (t: number) => { if (!map) return; if (last) { const d = Math.min(t - last, 50), c = map.getCenter(), dx = wp.lng - c.lng, dy = wp.lat - c.lat; if (Math.sqrt(dx*dx + dy*dy) < 0.02) { const a = Math.random() * 6.28; wp = { lng: ((c.lng + Math.cos(a) * 0.15 + 180) % 360) - 180, lat: Math.max(-85, Math.min(85, c.lat + Math.sin(a) * 0.15)) }; tb = (tb + Math.random() * 90 - 45 + 360) % 360; } const ma = Math.atan2(dy, dx), b = map.getBearing(), bd = ((tb - b + 540) % 360) - 180; map.jumpTo({ center: [c.lng + Math.cos(ma) * 0.00012 * d, Math.max(-85, Math.min(85, c.lat + Math.sin(ma) * 0.00012 * d))], bearing: b + Math.sign(bd) * Math.min(Math.abs(bd), 0.03 * d) }); } last = t; flightRef.current = requestAnimationFrame(go); };
        flightRef.current = requestAnimationFrame(go); toast.info('Flight: Sightseeing');
    };
    const flightDown = () => { pressTimerRef.current = setTimeout(() => { startSightseeing(); pressTimerRef.current = null; }, 500); };
    const flightUp = () => { if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; if (flightMode === 'off') startPan(); else stopFlight(); } };

    return (
        <>
            {/* Sidebar */}
            <div
                className={`
          fixed top-0 left-0 h-full bg-white/95 backdrop-blur-md shadow-2xl
          transition-all duration-300 ease-in-out
          flex flex-col border-r border-gray-200
        `}
                style={{
                    zIndex: Z_INDEX.SIDEBAR,
                    width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`,
                    transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                }}
            >
                {/* Sidebar header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
                    <h1 className="text-xl font-bold text-white tracking-wide">TACMAP</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </div>

                {/* Panel tabs */}
                <div className="flex border-b bg-gray-50">
                    <PanelTab
                        icon={<Layers className="w-4 h-4" />}
                        label="Layers"
                        active={activePanel === 'layers'}
                        onClick={() => setActivePanel('layers')}
                    />
                    <PanelTab
                        icon={<MapPin className="w-4 h-4" />}
                        label="Navigate"
                        active={activePanel === 'navigation'}
                        onClick={() => setActivePanel('navigation')}
                    />
                    <PanelTab
                        icon={<Wrench className="w-4 h-4" />}
                        label="Tools"
                        active={activePanel === 'tools'}
                        onClick={() => setActivePanel('tools')}
                    />
                    <PanelTab
                        icon={<Settings className="w-4 h-4" />}
                        label="Settings"
                        active={activePanel === 'settings'}
                        onClick={() => setActivePanel('settings')}
                    />
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activePanel === 'layers' && <LayersList />}
                    {activePanel === 'navigation' && <CityList />}
                    {activePanel === 'tools' && <ToolsPanel />}
                    {activePanel === 'settings' && <SettingsPanel />}
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
                    <div className="font-medium mb-1">Keyboard shortcuts:</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <span><kbd className="bg-gray-200 px-1 rounded">R</kbd> Reset north</span>
                        <span><kbd className="bg-gray-200 px-1 rounded">T</kbd> Toggle 3D</span>
                        <span><kbd className="bg-gray-200 px-1 rounded">Shift</kbd>+drag: Pitch</span>
                        <span><kbd className="bg-gray-200 px-1 rounded">Ctrl</kbd>+drag: Rotate</span>
                    </div>
                </div>
            </div>

            {/* Sidebar toggle button (when collapsed) */}
            {sidebarCollapsed && (
                <Button
                    variant="default"
                    size="icon"
                    onClick={toggleSidebar}
                    className="fixed top-4 left-4 bg-white text-gray-800 hover:bg-gray-100 shadow-xl w-12 h-12 rounded-xl border"
                    style={{ zIndex: Z_INDEX.CONTROLS }}
                >
                    <Menu className="w-5 h-5" />
                </Button>
            )}

            {/* Top-right search */}
            <div
                className="fixed top-4 right-4"
                style={{ zIndex: Z_INDEX.CONTROLS, width: searchOpen ? '400px' : 'auto' }}
            >
                {searchOpen ? (
                    <div className="relative">
                        <SearchBox
                            onResultSelect={() => setSearchOpen(false)}
                            placeholder="Search locations in Australia..."
                        />
                        <button
                            onClick={() => setSearchOpen(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchOpen(true)}
                        className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-lg px-4 h-10 rounded-xl flex items-center gap-2 border"
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-sm text-gray-500">Search locations...</span>
                        <kbd className="hidden md:inline-flex ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-400">⌘K</kbd>
                    </Button>
                )}
            </div>

            {/* Flight button - bottom right */}
            <Button
                variant={flightMode !== 'off' ? 'default' : 'outline'}
                size="icon"
                onMouseDown={flightDown}
                onMouseUp={flightUp}
                onMouseLeave={() => { if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; } }}
                title="Flight (click: pan, hold: sightseeing)"
                className={`fixed bottom-4 right-4 shadow-xl w-14 h-14 rounded-2xl select-none ${flightMode === 'pan' ? 'bg-blue-600 text-white' : flightMode === 'sightseeing' ? 'bg-purple-600 text-white animate-pulse' : 'bg-white text-gray-800 hover:bg-gray-100 border'}`}
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Plane className="w-6 h-6" />
            </Button>
        </>
    );
}

// Panel tab component
function PanelTab({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        flex-1 flex flex-col items-center justify-center py-3 px-2
        text-xs font-medium transition-all duration-200
        ${active
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
      `}
        >
            {icon}
            <span className="mt-1">{label}</span>
        </button>
    );
}

export default DesktopControls;
