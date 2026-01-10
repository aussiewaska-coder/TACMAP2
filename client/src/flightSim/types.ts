export interface LatLng {
  lat: number;
  lng: number;
}

export interface Target {
  lat: number;
  lng: number;
  orbitMode?: boolean; // Immediate orbit mode
  orbitRadius?: number; // Orbit radius in meters
  orbitSpeed?: number; // Orbit speed in rad/sec
}

export type FlightMode = "MANUAL" | "NAVIGATE" | "ORBIT";

export interface FlightState {
  lat: number; // degrees
  lng: number; // degrees
  altitudeFt: number; // feet
  speedMps: number; // meters per second
  pitch: number; // radians
  roll: number; // radians
  yaw: number; // radians per second
  heading: number; // radians
  mode: FlightMode;
  target: Target | null;
  speedTier: SpeedTierId;
  globe: boolean;
}

export type SpeedTierId = 100 | 500 | 1000 | 5000 | 3430 | 6860 | 17150; // m/s

export interface SpeedTier {
  id: SpeedTierId;
  label: string;
  speedMps: number;
  maxAltitudeFt: number;
}

export interface ControlFrameInput {
  pitchInput: number;
  yawInput: number;
  altitudeDelta: number;
  speedTierDelta: number;
  toggleGlobe: boolean;
  cancelTarget: boolean;
  orbitRadiusDelta: number; // -1, 0, or 1 for decreasing/increasing orbit radius
  orbitSpeedDelta: number; // -1, 0, or 1 for decreasing/increasing orbit speed
}
