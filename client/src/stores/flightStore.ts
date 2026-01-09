import { create } from 'zustand';

interface FlightState {
    dashboardOpen: boolean;
    mode: 'off' | 'pan' | 'sightseeing';
    animationId: number | null;
    prevProjection: string | null;

    openDashboard: () => void;
    closeDashboard: () => void;
    setMode: (mode: 'off' | 'pan' | 'sightseeing') => void;
    setAnimationId: (id: number | null) => void;
    setPrevProjection: (proj: string | null) => void;
}

export const useFlightStore = create<FlightState>((set) => ({
    dashboardOpen: false,
    mode: 'off',
    animationId: null,
    prevProjection: null,

    openDashboard: () => set({ dashboardOpen: true }),
    closeDashboard: () => set({ dashboardOpen: false }),
    setMode: (mode) => set({ mode }),
    setAnimationId: (id) => set({ animationId: id }),
    setPrevProjection: (proj) => set({ prevProjection: proj }),
}));

// SIMPLE selectors - primitives don't need shallow
export const useFlightDashboardOpen = () => useFlightStore((s) => s.dashboardOpen);
export const useFlightMode = () => useFlightStore((s) => s.mode);
