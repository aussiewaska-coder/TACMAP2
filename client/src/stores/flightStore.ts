import { create } from 'zustand';

interface FlightState {
    dashboardOpen: boolean;
    mode: 'off' | 'pan' | 'sightseeing' | 'manual';
    animationId: number | null;
    prevProjection: string | null;
    speed: number; // km/h (current smoothed value)
    userZooming: boolean; // Track when user is actively zooming (double-click, pinch, wheel)

    // Target values for smooth easing
    targetHeading: number | null; // null = no override, use current
    targetAltitude: number | null; // in meters, null = no override
    targetPitch: number | null; // 0-85 degrees, null = no override
    targetSpeed: number | null; // km/h, null = no override

    openDashboard: () => void;
    closeDashboard: () => void;
    setMode: (mode: 'off' | 'pan' | 'sightseeing' | 'manual') => void;
    setAnimationId: (id: number | null) => void;
    setPrevProjection: (proj: string | null) => void;
    setSpeed: (speed: number) => void;
    setUserZooming: (zooming: boolean) => void;
    setTargetHeading: (heading: number | null) => void;
    setTargetAltitude: (altitude: number | null) => void;
    setTargetPitch: (pitch: number | null) => void;
    setTargetSpeed: (speed: number | null) => void;
}

export const useFlightStore = create<FlightState>((set) => ({
    dashboardOpen: false,
    mode: 'off',
    animationId: null,
    prevProjection: null,
    speed: 250,
    userZooming: false,
    targetHeading: null,
    targetAltitude: null,
    targetPitch: null,
    targetSpeed: null,

    openDashboard: () => set({ dashboardOpen: true }),
    closeDashboard: () => set({ dashboardOpen: false }),
    setMode: (mode) => set({ mode, targetHeading: null, targetAltitude: null, targetPitch: null, targetSpeed: null }),
    setAnimationId: (id) => set({ animationId: id }),
    setPrevProjection: (proj) => set({ prevProjection: proj }),
    setSpeed: (speed) => set({ speed }),
    setUserZooming: (zooming) => set({ userZooming: zooming }),
    setTargetHeading: (heading) => set({ targetHeading: heading }),
    setTargetAltitude: (altitude) => set({ targetAltitude: altitude }),
    setTargetPitch: (pitch) => set({ targetPitch: pitch }),
    setTargetSpeed: (speed) => set({ targetSpeed: speed }),
}));

// SIMPLE selectors - primitives don't need shallow
export const useFlightDashboardOpen = () => useFlightStore((s) => s.dashboardOpen);
export const useFlightMode = () => useFlightStore((s) => s.mode);
export const useFlightSpeed = () => useFlightStore((s) => s.speed);
