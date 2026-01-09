import { create } from 'zustand';

interface FlightState {
    dashboardOpen: boolean;
    mode: 'off' | 'pan' | 'sightseeing' | 'manual';
    animationId: number | null;
    prevProjection: string | null;
    speed: number; // km/h

    openDashboard: () => void;
    closeDashboard: () => void;
    setMode: (mode: 'off' | 'pan' | 'sightseeing' | 'manual') => void;
    setAnimationId: (id: number | null) => void;
    setPrevProjection: (proj: string | null) => void;
    setSpeed: (speed: number) => void;
}

export const useFlightStore = create<FlightState>((set) => ({
    dashboardOpen: false,
    mode: 'off',
    animationId: null,
    prevProjection: null,
    speed: 500,

    openDashboard: () => set({ dashboardOpen: true }),
    closeDashboard: () => set({ dashboardOpen: false }),
    setMode: (mode) => set({ mode }),
    setAnimationId: (id) => set({ animationId: id }),
    setPrevProjection: (proj) => set({ prevProjection: proj }),
    setSpeed: (speed) => set({ speed }),
}));

// SIMPLE selectors - primitives don't need shallow
export const useFlightDashboardOpen = () => useFlightStore((s) => s.dashboardOpen);
export const useFlightMode = () => useFlightStore((s) => s.mode);
export const useFlightSpeed = () => useFlightStore((s) => s.speed);
