import { create } from 'zustand';

interface FlightState {
    dashboardOpen: boolean;
    animationId: number | null;
    transitionTimeoutId: number | null; // For orbit transition setTimeout
    prevProjection: string | null;
    speed: number; // km/h (current smoothed value)
    userZooming: boolean; // Track when user is actively zooming (double-click, pinch, wheel)

    // Target values for smooth easing
    targetHeading: number | null; // null = no override, use current
    targetAltitude: number | null; // in meters, null = no override
    targetPitch: number | null; // 0-85 degrees, null = no override
    targetSpeed: number | null; // km/h, null = no override

    // Satellite view
    satelliteEnabled: boolean;
    buildings3dEnabled: boolean;

    openDashboard: () => void;
    closeDashboard: () => void;
    setAnimationId: (id: number | null) => void;
    setTransitionTimeoutId: (id: number | null) => void;
    setPrevProjection: (proj: string | null) => void;
    setSpeed: (speed: number) => void;
    setUserZooming: (zooming: boolean) => void;
    setTargetHeading: (heading: number | null) => void;
    setTargetAltitude: (altitude: number | null) => void;
    setTargetPitch: (pitch: number | null) => void;
    setTargetSpeed: (speed: number | null) => void;
    setSatelliteEnabled: (enabled: boolean) => void;
    setBuildings3dEnabled: (enabled: boolean) => void;
}

export const useFlightStore = create<FlightState>((set) => ({
    dashboardOpen: false,
    animationId: null,
    transitionTimeoutId: null,
    prevProjection: null,
    speed: 250,
    userZooming: false,
    targetHeading: null,
    targetAltitude: null,
    targetPitch: null,
    targetSpeed: null,
    satelliteEnabled: false,
    buildings3dEnabled: false,

    openDashboard: () => set({ dashboardOpen: true }),
    closeDashboard: () => set({ dashboardOpen: false }),
    setAnimationId: (id) => set({ animationId: id }),
    setTransitionTimeoutId: (id) => set({ transitionTimeoutId: id }),
    setPrevProjection: (proj) => set({ prevProjection: proj }),
    setSpeed: (speed) => set({ speed }),
    setUserZooming: (zooming) => set({ userZooming: zooming }),
    setTargetHeading: (heading) => set({ targetHeading: heading }),
    setTargetAltitude: (altitude) => set({ targetAltitude: altitude }),
    setTargetPitch: (pitch) => set({ targetPitch: pitch }),
    setTargetSpeed: (speed) => set({ targetSpeed: speed }),
    setSatelliteEnabled: (enabled) => set({ satelliteEnabled: enabled }),
    setBuildings3dEnabled: (enabled) => set({ buildings3dEnabled: enabled }),
}));

// SIMPLE selectors - primitives don't need shallow
export const useFlightDashboardOpen = () => useFlightStore((s) => s.dashboardOpen);
export const useFlightSpeed = () => useFlightStore((s) => s.speed);
