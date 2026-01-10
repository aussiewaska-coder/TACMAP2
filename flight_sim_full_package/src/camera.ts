import type { Map } from "maplibre-gl";
import { easeInOut } from "./easing";
import { setProjection } from "./map";
import type { FlightState } from "./types";

interface CameraState {
  center: [number, number];
  pitch: number;
  bearing: number;
  zoom: number;
  offset: [number, number];
  lastUpdate: number;
  projection: "mercator" | "globe";
  targetProjection: "mercator" | "globe";
  projectionStartedAt: number;
  globeBlend: number;
}

const MAX_DELTA = 0.05; // avoid large jumps if frame stalls

export function initCamera(map: Map) {
  const camera: CameraState = {
    center: [0, 0],
    pitch: 55,
    bearing: 0,
    zoom: 6,
    offset: [0, 0],
    lastUpdate: performance.now(),
    projection: "mercator",
    targetProjection: "mercator",
    projectionStartedAt: performance.now(),
    globeBlend: 0
  };

  function smoothScalar(current: number, target: number, deltaSeconds: number) {
    const timeWeight = clamp(deltaSeconds * 4, 0, 1);
    const eased = easeInOut(timeWeight);
    const weight = 0.12 + 0.36 * eased;
    return current + (target - current) * weight;
  }

  function smoothAngle(current: number, target: number, deltaSeconds: number) {
    let diff = target - current;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return smoothScalar(current, current + diff, deltaSeconds);
  }

  function smoothVec2(current: [number, number], target: [number, number], deltaSeconds: number): [number, number] {
    return [
      smoothScalar(current[0], target[0], deltaSeconds),
      smoothScalar(current[1], target[1], deltaSeconds)
    ];
  }

  function updateProjection(targetGlobe: boolean, now: number) {
    const desired: "mercator" | "globe" = targetGlobe ? "globe" : "mercator";
    if (desired !== camera.targetProjection) {
      camera.targetProjection = desired;
      camera.projectionStartedAt = now;
    }
    if (camera.projection === desired) return;
    const elapsed = (now - camera.projectionStartedAt) / 1000;
    const progress = clamp(elapsed / 0.9, 0, 1);
    if (progress >= 1) {
      setProjection(map, targetGlobe);
      camera.projection = desired;
      return;
    }
    // interim easing keeps other camera params smooth while projection flips at the end.
  }

  function update(flight: FlightState) {
    const now = performance.now();
    const delta = clamp((now - camera.lastUpdate) / 1000, 0, MAX_DELTA);
    camera.lastUpdate = now;

    const altFactor = clamp(flight.altitudeFt / 100_000, 0, 1);
    const speedFactor = clamp(flight.speedMps / 17_150, 0, 1);

    const targetGlobeBlend = flight.globe ? 1 : 0;
    camera.globeBlend = smoothScalar(camera.globeBlend, targetGlobeBlend, delta);

    const targetPitch = clamp(55 + altFactor * 25 + speedFactor * 8 + camera.globeBlend * 6, 45, 88);
    const targetZoom = clamp(12 - altFactor * 7 - speedFactor * 2 - camera.globeBlend * 1.8, 3.2, 12);
    const targetBearing = toDegrees(flight.heading);

    // Offset the map center so the aircraft appears slightly forward on screen; rotates with heading.
    const offsetMagnitude = 80 + altFactor * 140 + camera.globeBlend * 120;
    const offsetHeading = flight.heading;
    const targetOffset: [number, number] = [
      Math.sin(offsetHeading) * offsetMagnitude,
      -Math.cos(offsetHeading) * offsetMagnitude
    ];

    camera.pitch = smoothScalar(camera.pitch, targetPitch, delta);
    camera.zoom = smoothScalar(camera.zoom, targetZoom, delta);
    camera.bearing = smoothAngle(camera.bearing, targetBearing, delta);
    camera.offset = smoothVec2(camera.offset, targetOffset, delta);
    camera.center = [flight.lng, flight.lat];

    updateProjection(flight.globe, now);

    map.jumpTo({
      center: camera.center,
      pitch: camera.pitch,
      bearing: camera.bearing,
      zoom: camera.zoom,
      offset: camera.offset
    } as any);
  }

  return { update };
}

function toDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
