// DesktopControls - Desktop-specific UI controls
// Uses desktopUIStore - INDEPENDENT from mobile

import { MapPin, Settings, Layers, Search, Menu, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesktopUIStore } from '@/stores';
import { Z_INDEX } from '@/core/constants';
import { CityList } from './CityList';
import { LayersList } from './LayersList';
import { SettingsPanel } from './SettingsPanel';

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
                    {activePanel === 'settings' && <SettingsPanel />}
                </div>

                {/* Footer */}
                <div className="p-3 border-t bg-gray-50 text-xs text-gray-400 text-center">
                    Modular Map Platform v2.0
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

            {/* Top-right search button */}
            <div
                className="fixed top-4 right-16"
                style={{ zIndex: Z_INDEX.CONTROLS }}
            >
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-lg px-4 h-10 rounded-xl flex items-center gap-2 border"
                >
                    <Search className="w-4 h-4" />
                    <span className="text-sm text-gray-500">Search locations...</span>
                    <kbd className="hidden md:inline-flex ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-400">⌘K</kbd>
                </Button>
            </div>
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
