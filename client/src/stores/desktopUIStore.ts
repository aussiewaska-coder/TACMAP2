// Desktop UI Store - INDEPENDENT from mobile
// Button states, modals, and panels on desktop do NOT affect mobile view

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';

type PanelType = 'layers' | 'search' | 'settings' | 'navigation' | 'tools' | 'alerts' | 'emergency' | 'data' | null;

interface PanelPosition {
    x: number;
    y: number;
}

interface DesktopUIState {
    // Sidebar state
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    sidebarPosition: 'left' | 'right';

    // Active panel in sidebar
    activePanel: PanelType;

    // Floating panels state
    floatingPanels: Set<string>;
    panelPositions: Record<string, PanelPosition>;

    // Modal state
    openModals: Set<string>;

    // Toolbar state
    toolbarExpanded: boolean;
    activeToolGroup: string | null;

    // Search state
    searchOpen: boolean;
    searchQuery: string;

    // Context menu
    contextMenuOpen: boolean;
    contextMenuPosition: { x: number; y: number } | null;

    // Actions
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setSidebarWidth: (width: number) => void;
    setSidebarPosition: (position: 'left' | 'right') => void;
    setActivePanel: (panel: PanelType) => void;

    openFloatingPanel: (panelId: string, position?: PanelPosition) => void;
    closeFloatingPanel: (panelId: string) => void;
    updatePanelPosition: (panelId: string, position: PanelPosition) => void;

    openModal: (modalId: string) => void;
    closeModal: (modalId: string) => void;
    closeAllModals: () => void;
    isModalOpen: (modalId: string) => boolean;

    setToolbarExpanded: (expanded: boolean) => void;
    setActiveToolGroup: (group: string | null) => void;

    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;

    openContextMenu: (position: { x: number; y: number }) => void;
    closeContextMenu: () => void;

    // Reset to initial state
    reset: () => void;
}

const initialState = {
    sidebarCollapsed: false,
    sidebarWidth: 320,
    sidebarPosition: 'left' as const,
    activePanel: 'layers' as PanelType,
    floatingPanels: new Set<string>(),
    panelPositions: {} as Record<string, PanelPosition>,
    openModals: new Set<string>(),
    toolbarExpanded: true,
    activeToolGroup: null,
    searchOpen: false,
    searchQuery: '',
    contextMenuOpen: false,
    contextMenuPosition: null,
};

export const useDesktopUIStore = create<DesktopUIState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                ...initialState,

                // Sidebar actions
                toggleSidebar: () => set((state) => ({
                    sidebarCollapsed: !state.sidebarCollapsed,
                })),

                setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
                setSidebarWidth: (width) => set({ sidebarWidth: Math.max(240, Math.min(600, width)) }),
                setSidebarPosition: (position) => set({ sidebarPosition: position }),
                setActivePanel: (panel) => set({ activePanel: panel }),

                // Floating panels
                openFloatingPanel: (panelId, position = { x: 100, y: 100 }) => set((state) => ({
                    floatingPanels: new Set([...Array.from(state.floatingPanels), panelId]),
                    panelPositions: { ...state.panelPositions, [panelId]: position },
                })),

                closeFloatingPanel: (panelId) => set((state) => {
                    const newPanels = new Set(state.floatingPanels);
                    newPanels.delete(panelId);
                    const { [panelId]: _, ...restPositions } = state.panelPositions;
                    return {
                        floatingPanels: newPanels,
                        panelPositions: restPositions,
                    };
                }),

                updatePanelPosition: (panelId, position) => set((state) => ({
                    panelPositions: { ...state.panelPositions, [panelId]: position },
                })),

                // Modal actions
                openModal: (modalId) => set((state) => ({
                    openModals: new Set([...Array.from(state.openModals), modalId]),
                })),

                closeModal: (modalId) => set((state) => {
                    const newModals = new Set(state.openModals);
                    newModals.delete(modalId);
                    return { openModals: newModals };
                }),

                closeAllModals: () => set({ openModals: new Set() }),

                isModalOpen: (modalId) => get().openModals.has(modalId),

                // Toolbar
                setToolbarExpanded: (expanded) => set({ toolbarExpanded: expanded }),
                setActiveToolGroup: (group) => set({ activeToolGroup: group }),

                // Search
                setSearchOpen: (open) => set({ searchOpen: open }),
                setSearchQuery: (query) => set({ searchQuery: query }),

                // Context menu
                openContextMenu: (position) => set({
                    contextMenuOpen: true,
                    contextMenuPosition: position,
                }),

                closeContextMenu: () => set({
                    contextMenuOpen: false,
                    contextMenuPosition: null,
                }),

                // Reset
                reset: () => set(initialState),
            }),
            {
                name: 'tacmap-desktop-ui',
                // Only persist layout preferences, not ephemeral state
                partialize: (state) => ({
                    sidebarCollapsed: state.sidebarCollapsed,
                    sidebarWidth: state.sidebarWidth,
                    sidebarPosition: state.sidebarPosition,
                    activePanel: state.activePanel,
                    panelPositions: state.panelPositions,
                }),
            }
        )
    )
);

// Selector hooks
export const useSidebar = () => useDesktopUIStore((state) => ({
    collapsed: state.sidebarCollapsed,
    width: state.sidebarWidth,
    position: state.sidebarPosition,
    activePanel: state.activePanel,
}));

export const useDesktopModals = () => useDesktopUIStore((state) => ({
    openModals: state.openModals,
    isModalOpen: state.isModalOpen,
}));
