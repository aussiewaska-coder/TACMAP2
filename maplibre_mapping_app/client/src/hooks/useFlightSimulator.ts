import { useRef, useState, useCallback, useEffect } from 'react';
import type { Map as MapLibreGLMap } from 'maplibre-gl';

export type FlightMode = 'off' | 'simple-pan' | 'random-sightseeing';

interface UseFlightSimulatorOptions {
  map: MapLibreGLMap | null;
  onModeChange?: (mode: FlightMode) => void;
}

const SIMPLE_PAN_SPEED = 0.00008; // degrees per ms
const SIGHTSEEING_MOVE_SPEED = 0.00012; // degrees per ms
const SIGHTSEEING_ROTATION_SPEED = 0.03; // degrees per ms
const WAYPOINT_THRESHOLD = 0.02; // degrees - distance to trigger new waypoint

export function useFlightSimulator({ map, onModeChange }: UseFlightSimulatorOptions) {
  const [mode, setMode] = useState<FlightMode>('off');

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const modeRef = useRef<FlightMode>('off');
  const waypointRef = useRef<{ lng: number; lat: number } | null>(null);
  const targetBearingRef = useRef<number>(0);
  const previousProjectionRef = useRef<string | null>(null);

  const updateMode = useCallback((newMode: FlightMode) => {
    modeRef.current = newMode;
    setMode(newMode);
    onModeChange?.(newMode);
  }, [onModeChange]);

  const generateRandomWaypoint = useCallback((currentLng: number, currentLat: number) => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 0.08 + Math.random() * 0.15; // 0.08-0.23 degrees

    let newLng = currentLng + Math.cos(angle) * distance;
    let newLat = currentLat + Math.sin(angle) * distance;

    // Clamp latitude to valid range
    newLat = Math.max(-85, Math.min(85, newLat));
    // Wrap longitude
    newLng = ((newLng + 180) % 360) - 180;

    return { lng: newLng, lat: newLat };
  }, []);

  const animateSimplePan = useCallback((timestamp: number) => {
    if (!map || modeRef.current !== 'simple-pan') return;

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const center = map.getCenter();
    const newLat = center.lat + (SIMPLE_PAN_SPEED * deltaTime);

    // Clamp latitude to valid range
    const clampedLat = Math.min(Math.max(newLat, -85), 85);

    map.setCenter([center.lng, clampedLat]);

    animationFrameRef.current = requestAnimationFrame(animateSimplePan);
  }, [map]);

  const animateRandomSightseeing = useCallback((timestamp: number) => {
    if (!map || modeRef.current !== 'random-sightseeing') return;

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = Math.min(timestamp - lastTimeRef.current, 50); // Cap delta to prevent jumps
    lastTimeRef.current = timestamp;

    const center = map.getCenter();

    // Initialize or update waypoint
    if (!waypointRef.current) {
      waypointRef.current = generateRandomWaypoint(center.lng, center.lat);
      targetBearingRef.current = Math.random() * 360;
    }

    const waypoint = waypointRef.current;
    const dx = waypoint.lng - center.lng;
    const dy = waypoint.lat - center.lat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've reached the waypoint
    if (distance < WAYPOINT_THRESHOLD) {
      waypointRef.current = generateRandomWaypoint(center.lng, center.lat);
      // Random bearing change (±45 degrees from current)
      targetBearingRef.current = (targetBearingRef.current + (Math.random() * 90 - 45) + 360) % 360;
    }

    // Move toward waypoint
    const moveAngle = Math.atan2(dy, dx);
    const moveAmount = SIGHTSEEING_MOVE_SPEED * deltaTime;

    let newLng = center.lng + Math.cos(moveAngle) * moveAmount;
    let newLat = center.lat + Math.sin(moveAngle) * moveAmount;

    // Clamp and wrap coordinates
    newLat = Math.max(-85, Math.min(85, newLat));
    newLng = ((newLng + 180) % 360) - 180;

    // Smooth bearing interpolation
    const currentBearing = map.getBearing();
    const bearingDiff = ((targetBearingRef.current - currentBearing + 540) % 360) - 180;
    const bearingStep = Math.sign(bearingDiff) * Math.min(
      Math.abs(bearingDiff),
      SIGHTSEEING_ROTATION_SPEED * deltaTime
    );

    map.jumpTo({
      center: [newLng, newLat],
      bearing: currentBearing + bearingStep,
    });

    animationFrameRef.current = requestAnimationFrame(animateRandomSightseeing);
  }, [map, generateRandomWaypoint]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Restore previous projection if we changed it
    if (map && previousProjectionRef.current !== null) {
      map.setProjection({ type: previousProjectionRef.current as 'mercator' | 'globe' });
      previousProjectionRef.current = null;
    }

    waypointRef.current = null;
    lastTimeRef.current = 0;
    updateMode('off');
  }, [map, updateMode]);

  const startSimplePan = useCallback(() => {
    if (!map) return;

    stop(); // Stop any existing animation
    updateMode('simple-pan');
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animateSimplePan);
  }, [map, stop, updateMode, animateSimplePan]);

  const startRandomSightseeing = useCallback(() => {
    if (!map) return;

    stop(); // Stop any existing animation

    // Save current projection and switch to globe
    const currentProjection = map.getProjection();
    previousProjectionRef.current = currentProjection?.type || 'mercator';
    map.setProjection({ type: 'globe' });

    updateMode('random-sightseeing');
    lastTimeRef.current = 0;
    waypointRef.current = null;
    targetBearingRef.current = map.getBearing();
    animationFrameRef.current = requestAnimationFrame(animateRandomSightseeing);
  }, [map, stop, updateMode, animateRandomSightseeing]);

  const toggle = useCallback(() => {
    if (modeRef.current === 'off') {
      startSimplePan();
    } else {
      stop();
    }
  }, [startSimplePan, stop]);

  // Stop flight on user interaction
  useEffect(() => {
    if (!map) return;

    const handleUserInteraction = () => {
      if (modeRef.current !== 'off') {
        stop();
      }
    };

    map.on('dragstart', handleUserInteraction);
    map.on('wheel', handleUserInteraction);

    return () => {
      map.off('dragstart', handleUserInteraction);
      map.off('wheel', handleUserInteraction);
    };
  }, [map, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    mode,
    startSimplePan,
    startRandomSightseeing,
    stop,
    toggle,
  };
}
