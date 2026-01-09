// Flight store - State management for the tactical flight command dashboard
// Manages flight modes, telemetry, manual controls, and autopilot destinations

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Destination {
    name: string;
    coordinates: [number, number]; // [lng, lat]
}

export interface FlightTelemetry {
    currentSpeed: number;      // km/h
    currentHeading: number;    // degrees 0-360
    currentAltitude: number;   // meters
    currentPosition: [number, number]; // [lng, lat]
}

export interface FlightState {
    // Dashboard visibility
    dashboardOpen: boolean;

    // Flight mode: off = no flight, manual = user controls, autopilot = automated route
    mode: 'off' | 'manual' | 'autopilot';

    // Manual control target values (what user sets via sliders)
    targetSpeed: number;       // km/h (100-2000)
    targetHeading: number;     // degrees 0-360
    targetAltitude: number;    // meters (1000-50000)

    // Current telemetry (updated each animation frame)
    telemetry: FlightTelemetry;

    // Autopilot mission
    destination: Destination | null;
    routeGeometry: GeoJSON.LineString | null;
    distanceRemaining: number;  // meters
    etaSeconds: number;         // seconds until arrival

    // Previous projection (to restore after flight)
    previousProjection: string | null;

    // Actions
    toggleDashboard: () => void;
    openDashboard: () => void;
    closeDashboard: () => void;

    setMode: (mode: 'off' | 'manual' | 'autopilot') => void;

    setTargetSpeed: (speed: number) => void;
    setTargetHeading: (heading: number) => void;
    setTargetAltitude: (altitude: number) => void;

    setDestination: (dest: Destination | null) => void;
    setRouteGeometry: (geometry: GeoJSON.LineString | null) => void;

    updateTelemetry: (data: Partial<FlightTelemetry>) => void;
    updateFlightProgress: (distanceRemaining: number, etaSeconds: number) => void;

    setPreviousProjection: (projection: string | null) => void;

    // Convenience actions
    startManualFlight: () => void;
    startAutopilot: (destination: Destination) => void;
    stopFlight: () => void;
    reset: () => void;
}

// Default/initial values
const DEFAULT_SPEED = 500;      // km/h
const DEFAULT_HEADING = 0;      // degrees (north)
const DEFAULT_ALTITUDE = 10000; // meters

const initialTelemetry: FlightTelemetry = {
    currentSpeed: 0,
    currentHeading: 0,
    currentAltitude: 0,
    currentPosition: [0, 0],
};

export const useFlightStore = create<FlightState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        dashboardOpen: false,
        mode: 'off',

        targetSpeed: DEFAULT_SPEED,
        targetHeading: DEFAULT_HEADING,
        targetAltitude: DEFAULT_ALTITUDE,

        telemetry: { ...initialTelemetry },

        destination: null,
        routeGeometry: null,
        distanceRemaining: 0,
        etaSeconds: 0,

        previousProjection: null,

        // Dashboard actions
        toggleDashboard: () => set((state) => ({ dashboardOpen: !state.dashboardOpen })),
        openDashboard: () => set({ dashboardOpen: true }),
        closeDashboard: () => set({ dashboardOpen: false }),

        // Mode actions
        setMode: (mode) => set({ mode }),

        // Manual control actions
        setTargetSpeed: (speed) => {
            const clampedSpeed = Math.max(100, Math.min(2000, speed));
            set({ targetSpeed: clampedSpeed });
        },

        setTargetHeading: (heading) => {
            // Normalize to 0-360
            const normalizedHeading = ((heading % 360) + 360) % 360;
            set({ targetHeading: normalizedHeading });
        },

        setTargetAltitude: (altitude) => {
            const clampedAltitude = Math.max(1000, Math.min(50000, altitude));
            set({ targetAltitude: clampedAltitude });
        },

        // Destination actions
        setDestination: (dest) => set({ destination: dest }),
        setRouteGeometry: (geometry) => set({ routeGeometry: geometry }),

        // Telemetry updates (called frequently during flight)
        updateTelemetry: (data) => set((state) => ({
            telemetry: { ...state.telemetry, ...data },
        })),

        updateFlightProgress: (distanceRemaining, etaSeconds) => set({
            distanceRemaining,
            etaSeconds,
        }),

        setPreviousProjection: (projection) => set({ previousProjection: projection }),

        // Convenience: Start manual flight
        startManualFlight: () => {
            set({
                mode: 'manual',
                destination: null,
                routeGeometry: null,
                distanceRemaining: 0,
                etaSeconds: 0,
            });
        },

        // Convenience: Start autopilot to destination
        startAutopilot: (destination) => {
            set({
                mode: 'autopilot',
                destination,
            });
        },

        // Convenience: Stop all flight
        stopFlight: () => {
            set({
                mode: 'off',
                destination: null,
                routeGeometry: null,
                distanceRemaining: 0,
                etaSeconds: 0,
            });
        },

        // Full reset
        reset: () => set({
            dashboardOpen: false,
            mode: 'off',
            targetSpeed: DEFAULT_SPEED,
            targetHeading: DEFAULT_HEADING,
            targetAltitude: DEFAULT_ALTITUDE,
            telemetry: { ...initialTelemetry },
            destination: null,
            routeGeometry: null,
            distanceRemaining: 0,
            etaSeconds: 0,
            previousProjection: null,
        }),
    }))
);

// Selector hooks for performance optimization
export const useFlightDashboard = () => useFlightStore((state) => state.dashboardOpen);
export const useFlightMode = () => useFlightStore((state) => state.mode);
export const useFlightTelemetry = () => useFlightStore((state) => state.telemetry);
export const useFlightControls = () => useFlightStore((state) => ({
    targetSpeed: state.targetSpeed,
    targetHeading: state.targetHeading,
    targetAltitude: state.targetAltitude,
}));
export const useFlightDestination = () => useFlightStore((state) => ({
    destination: state.destination,
    routeGeometry: state.routeGeometry,
    distanceRemaining: state.distanceRemaining,
    etaSeconds: state.etaSeconds,
}));

// Predefined destinations
export const DESTINATIONS: Destination[] = [
    { name: 'Sydney', coordinates: [151.2093, -33.8688] },
    { name: 'Nimbin', coordinates: [153.2240, -28.5959] },
    { name: 'Melbourne', coordinates: [144.9631, -37.8136] },
    { name: 'Brisbane', coordinates: [153.0251, -27.4698] },
    { name: 'Perth', coordinates: [115.8605, -31.9505] },
    { name: 'Adelaide', coordinates: [138.6007, -34.9285] },
    { name: 'Hobart', coordinates: [147.3272, -42.8821] },
    { name: 'Darwin', coordinates: [130.8456, -12.4634] },
    { name: 'Cairns', coordinates: [145.7781, -16.9186] },
    { name: 'Uluru', coordinates: [131.0369, -25.3444] },
];
