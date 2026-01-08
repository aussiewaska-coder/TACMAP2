// Mobile UI Store - INDEPENDENT from desktop
// Button states, modals, and panels on mobile do NOT affect desktop view

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type PanelType = 'layers' | 'search' | 'settings' | 'navigation' | 'tools' | null;
type BottomSheetContent = 'layers' | 'settings' | 'cities' | 'tools' | 'search' | null;

interface MobileUIState {
    // Bottom sheet state
    bottomSheetOpen: boolean;
    bottomSheetContent: BottomSheetContent;
    bottomSheetHeight: 'collapsed' | 'half' | 'full';

    // Active panel (which section is active in bottom sheet)
    activePanel: PanelType;

    // Modal state
    openModals: Set<string>;

    // Control visibility
    controlsVisible: boolean;

    // Search state
    searchOpen: boolean;
    searchQuery: string;

    // Quick action buttons state
    activeQuickAction: string | null;

    // Actions
    openBottomSheet: (content: BottomSheetContent) => void;
    closeBottomSheet: () => void;
    setBottomSheetHeight: (height: MobileUIState['bottomSheetHeight']) => void;
    setActivePanel: (panel: PanelType) => void;

    openModal: (modalId: string) => void;
    closeModal: (modalId: string) => void;
    closeAllModals: () => void;
    isModalOpen: (modalId: string) => boolean;

    setControlsVisible: (visible: boolean) => void;
    toggleControls: () => void;

    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;

    setActiveQuickAction: (action: string | null) => void;

    // Reset to initial state
    reset: () => void;
}

const initialState = {
    bottomSheetOpen: false,
    bottomSheetContent: null as BottomSheetContent,
    bottomSheetHeight: 'collapsed' as const,
    activePanel: null as PanelType,
    openModals: new Set<string>(),
    controlsVisible: true,
    searchOpen: false,
    searchQuery: '',
    activeQuickAction: null,
};

export const useMobileUIStore = create<MobileUIState>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        // Bottom sheet actions
        openBottomSheet: (content) => set({
            bottomSheetOpen: true,
            bottomSheetContent: content,
            bottomSheetHeight: 'half',
        }),

        closeBottomSheet: () => set({
            bottomSheetOpen: false,
            bottomSheetHeight: 'collapsed',
        }),

        setBottomSheetHeight: (height) => set({ bottomSheetHeight: height }),

        setActivePanel: (panel) => set({ activePanel: panel }),

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

        // Controls visibility
        setControlsVisible: (visible) => set({ controlsVisible: visible }),
        toggleControls: () => set((state) => ({ controlsVisible: !state.controlsVisible })),

        // Search
        setSearchOpen: (open) => set({ searchOpen: open }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        // Quick actions
        setActiveQuickAction: (action) => set({ activeQuickAction: action }),

        // Reset
        reset: () => set(initialState),
    }))
);

// Selector hooks
export const useBottomSheet = () => useMobileUIStore((state) => ({
    open: state.bottomSheetOpen,
    content: state.bottomSheetContent,
    height: state.bottomSheetHeight,
}));

export const useMobileControls = () => useMobileUIStore((state) => ({
    visible: state.controlsVisible,
    activeAction: state.activeQuickAction,
}));
