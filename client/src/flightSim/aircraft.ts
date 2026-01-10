import type { Map } from "maplibre-gl";
import { easeInOut } from "./easing";
import { smoothSetMapView, setProjection } from "./map";
import { ControlFrameInput, FlightMode, FlightState, SpeedTier, SpeedTierId, Target } from "./types";

const EARTH_RADIUS_M = 6_371_000;

const SPEED_TIERS: SpeedTier[] = [
  { id: 100, label: "100 m/s", speedMps: 100, maxAltitudeFt: 500 },
  { id: 500, label: "500 m/s", speedMps: 500, maxAltitudeFt: 5_000 },
  { id: 1000, label: "1,000 m/s", speedMps: 1_000, maxAltitudeFt: 15_000 },
  { id: 5000, label: "5,000 m/s", speedMps: 5_000, maxAltitudeFt: 45_000 },
  { id: 3430, label: "Mach 10", speedMps: 3_430, maxAltitudeFt: 80_000 },
  { id: 6860, label: "Mach 20", speedMps: 6_860, maxAltitudeFt: 95_000 },
  { id: 17150, label: "Mach 50", speedMps: 17_150, maxAltitudeFt: 100_000 }
];

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;

interface InternalState {
  targetAltitudeFt: number;
  targetSpeedMps: number;
  speedTierIndex: number;
  lastUpdate: number;
  orbitAngle: number;
  globeOverride: boolean | null;
}

export interface InitialFlightConfig {
  lat: number;
  lng: number;
  altitudeFt?: number;
  speedKph?: number;
}

function randomAustralia(): { lat: number; lng: number } {
  // Rough bounding box over mainland + Tasmania
  const lat = -44 + Math.random() * (-10 - -44); // -44 to -10
  const lng = 112 + Math.random() * (154 - 112); // 112 to 154
  return { lat, lng };
}

export function initAircraft(map: Map, initial?: InitialFlightConfig) {
  const initialPos = initial ?? { ...randomAustralia(), altitudeFt: 10_000, speedKph: 15_000 };
  const initialAlt = initialPos.altitudeFt ?? 10_000;
  const initialSpeedMps = (initialPos.speedKph ?? 15_000) / 3.6; // 15,000 kph ≈ 4,166 m/s

  const initialTierIndex = Math.max(
    0,
    SPEED_TIERS.findIndex((t) => t.speedMps >= initialSpeedMps)
  );
  const tierIndex = initialTierIndex === -1 ? SPEED_TIERS.length - 1 : initialTierIndex;
  const state: FlightState = {
    lat: initialPos.lat,
    lng: initialPos.lng,
    altitudeFt: initialAlt,
    speedMps: initialSpeedMps,
    pitch: 0,
    roll: 0,
    yaw: 0,
    heading: 0,
    mode: "MANUAL",
    target: null,
    speedTier: SPEED_TIERS[tierIndex].id,
    globe: false
  };

  const internal: InternalState = {
    targetAltitudeFt: state.altitudeFt,
    targetSpeedMps: SPEED_TIERS[tierIndex].speedMps,
    speedTierIndex: tierIndex,
    lastUpdate: performance.now(),
    orbitAngle: 0,
    globeOverride: null
  };

  function getSpeedTier(): SpeedTier {
    return SPEED_TIERS[internal.speedTierIndex];
  }

  function adjustSpeedTier(delta: number) {
    if (delta === 0) return;
    internal.speedTierIndex = Math.min(Math.max(internal.speedTierIndex + delta, 0), SPEED_TIERS.length - 1);
    const tier = getSpeedTier();
    state.speedTier = tier.id;
    internal.targetSpeedMps = tier.speedMps;
    internal.targetAltitudeFt = Math.min(internal.targetAltitudeFt, tier.maxAltitudeFt);
  }

  function clampAltitude() {
    const tier = getSpeedTier();
    internal.targetAltitudeFt = Math.max(0, Math.min(internal.targetAltitudeFt, tier.maxAltitudeFt));
    state.altitudeFt = Math.max(0, Math.min(state.altitudeFt, tier.maxAltitudeFt));
  }

  function applyPitch(input: number) {
    if (input !== 0) {
      state.pitch += input * 0.012;
      state.pitch = clamp(state.pitch, -0.8, 0.8);
    } else {
      state.pitch *= 0.96; // decay toward level
    }
  }

  function applyYawAndRoll(input: number, deltaTime: number) {
    const yawRate = 0.9; // radians/sec at full input
    state.yaw = input * yawRate;
    state.heading += state.yaw * deltaTime;

    state.roll += input * 0.015;
    state.roll *= 0.92;
    state.roll = clamp(state.roll, -1.4, 1.4);
  }

  function applyAltitude(delta: number, deltaTime: number) {
    if (delta !== 0) {
      internal.targetAltitudeFt += delta * 900 * deltaTime; // ft per second change target
      clampAltitude();
    }
    // ease altitude toward target
    const diff = internal.targetAltitudeFt - state.altitudeFt;
    const step = diff * 0.08 * easeInOut(clamp(deltaTime * 2, 0, 1));
    state.altitudeFt += step;
    clampAltitude();
  }

  function applySpeed(deltaTime: number) {
    const diff = internal.targetSpeedMps - state.speedMps;
    const step = diff * 0.08 * easeInOut(clamp(deltaTime * 2, 0, 1));
    state.speedMps += step;
  }

  function forwardDistance(deltaTime: number): number {
    return state.speedMps * deltaTime;
  }

  function advancePosition(deltaTime: number) {
    const distanceMeters = forwardDistance(deltaTime);
    const heading = state.heading;
    const northComponent = Math.cos(heading);
    const eastComponent = Math.sin(heading);

    const deltaLat = (distanceMeters / EARTH_RADIUS_M) * DEG_PER_RAD * northComponent;
    const denom = Math.cos(state.lat * RAD_PER_DEG) || 0.0001;
    const deltaLng = (distanceMeters / EARTH_RADIUS_M) * DEG_PER_RAD * eastComponent / denom;

    state.lat += deltaLat;
    state.lng += deltaLng;
  }

  function updateMode(input: ControlFrameInput) {
    if (input.cancelTarget) {
      state.target = null;
      state.mode = "MANUAL";
    }

    if (state.mode === "NAVIGATE" && state.target) {
      const distance = distanceToTargetMeters(state);
      const arrivalRadius = Math.max(500, state.altitudeFt * 0.3);
      if (distance !== null && distance < arrivalRadius) {
        state.mode = "ORBIT";
        internal.orbitAngle = 0;
        // set bank for orbit look
        state.roll = degToRad(30);
      }
    }
  }

  function updateNavigation(deltaTime: number) {
    if (!state.target) return;
    if (state.mode === "NAVIGATE") {
      const targetHeading = bearingToTarget(state);
      const headingDiff = normalizeAngle(targetHeading - state.heading);
      // ease heading toward target
      state.heading += headingDiff * 0.05 * easeInOut(clamp(deltaTime * 2, 0, 1));
      // small altitude bias toward mid-altitude for cinematic approach
      const tier = getSpeedTier();
      const targetAlt = Math.min(Math.max(state.altitudeFt, 1_000), tier.maxAltitudeFt * 0.6);
      internal.targetAltitudeFt = targetAlt;
    } else if (state.mode === "ORBIT" && state.target) {
      const orbitRate = 0.45; // rad/sec
      internal.orbitAngle += orbitRate * deltaTime;
      const radiusMeters = Math.max(800, state.altitudeFt * 0.6);
      const angularDistance = radiusMeters / EARTH_RADIUS_M;
      // orbit heading rotates clockwise
      const centerHeading = internal.orbitAngle;
      state.heading = normalizeAngle(centerHeading + Math.PI / 2);
      // derive position around target
      const lat1 = state.target.lat * RAD_PER_DEG;
      const lng1 = state.target.lng * RAD_PER_DEG;
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(centerHeading));
      const lng2 = lng1 + Math.atan2(Math.sin(centerHeading) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
      state.lat = lat2 * DEG_PER_RAD;
      state.lng = lng2 * DEG_PER_RAD;
    }
  }

  function updateMap() {
    const cameraPitch = clamp(30 + (state.altitudeFt / 100_000) * 40 + (state.speedMps / 17_150) * 10, 35, 80);
    smoothSetMapView(map, [state.lng, state.lat], cameraPitch, radToDeg(state.heading));
    const autoGlobe = state.altitudeFt >= 60_000 || state.speedTier >= 3430;
    const shouldGlobe = internal.globeOverride !== null ? internal.globeOverride : autoGlobe;
    state.globe = shouldGlobe;
    setProjection(map, shouldGlobe);
  }

  function updateAircraftModel() {
    // Custom 3D layer would consume state.heading/pitch/roll to orient the GLB.
    // Placeholder hook for renderer integration.
  }

  function updateFrame(input: ControlFrameInput) {
    const now = performance.now();
    const deltaTime = clamp((now - internal.lastUpdate) / 1000, 0, 0.05);
    internal.lastUpdate = now;

    if (input.toggleGlobe) {
      internal.globeOverride = !(internal.globeOverride ?? state.globe);
    }

    adjustSpeedTier(input.speedTierDelta);
    applyPitch(input.pitchInput);
    applyYawAndRoll(input.yawInput, deltaTime);
    applyAltitude(input.altitudeDelta, deltaTime);
    applySpeed(deltaTime);
    updateMode(input);
    updateNavigation(deltaTime);
    if (state.mode !== "ORBIT") {
      advancePosition(deltaTime);
    }
    updateMap();
    updateAircraftModel();
  }

  function setTarget(target: Target | null) {
    state.target = target;
    state.mode = target ? "NAVIGATE" : "MANUAL";
  }

  function setMode(mode: FlightMode) {
    state.mode = mode;
  }

  return {
    state,
    update: updateFrame,
    setTarget,
    setMode,
    getSpeedTier
  };
}

export function distanceToTargetMeters(state: FlightState): number | null {
  if (!state.target) return null;
  const dLat = (state.target.lat - state.lat) * RAD_PER_DEG;
  const dLon = (state.target.lng - state.lng) * RAD_PER_DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(state.lat * RAD_PER_DEG) * Math.cos(state.target.lat * RAD_PER_DEG) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function bearingToTarget(state: FlightState): number {
  if (!state.target) return state.heading;
  const lat1 = state.lat * RAD_PER_DEG;
  const lat2 = state.target.lat * RAD_PER_DEG;
  const dLon = (state.target.lng - state.lng) * RAD_PER_DEG;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function radToDeg(rad: number): number {
  return rad * DEG_PER_RAD;
}

function degToRad(deg: number): number {
  return deg * RAD_PER_DEG;
}
