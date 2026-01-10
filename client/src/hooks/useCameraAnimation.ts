import { useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { easeInOut } from '@/flightSim/easing';
import type { Map as MapLibreGLMap } from 'maplibre-gl';

interface AnimationState {
  startTime: number;
  duration: number;
  startCenter: [number, number];
  endCenter: [number, number];
  startZoom: number;
  endZoom: number;
  startPitch: number;
  endPitch: number;
  startBearing: number;
  endBearing: number;
}

interface CameraTarget {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
}

/**
 * Custom hook for smooth camera animations with easing
 * Uses requestAnimationFrame for 60fps animations
 * All camera movements use ease-in-out curves
 */
export function useCameraAnimation() {
  const map = useMapStore((state) => state.map);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const animationStateRef = useRef<AnimationState | null>(null);

  // Interpolate between two angles, handling wraparound
  const interpolateAngle = (start: number, end: number, t: number): number => {
    let delta = end - start;
    // Normalize to [-180, 180]
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return start + delta * t;
  };

  // Stop any ongoing animation
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = undefined;
    animationStateRef.current = null;
  }, []);

  // Animate camera to target with smooth easing
  const animateTo = useCallback((target: CameraTarget) => {
    if (!map) return;

    // Stop any ongoing animation
    stopAnimation();

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentPitch = map.getPitch();
    const currentBearing = map.getBearing();

    const state: AnimationState = {
      startTime: performance.now(),
      duration: target.duration ?? 1500,
      startCenter: [currentCenter.lng, currentCenter.lat],
      endCenter: target.center ?? [currentCenter.lng, currentCenter.lat],
      startZoom: currentZoom,
      endZoom: target.zoom ?? currentZoom,
      startPitch: currentPitch,
      endPitch: target.pitch ?? currentPitch,
      startBearing: currentBearing,
      endBearing: target.bearing ?? currentBearing,
    };

    animationStateRef.current = state;

    const animate = (currentTime: number) => {
      if (!animationStateRef.current || !map) return;

      const elapsed = currentTime - state.startTime;
      const progress = Math.min(elapsed / state.duration, 1);
      const easedProgress = easeInOut(progress);

      // Interpolate all camera properties
      const newCenter: [number, number] = [
        state.startCenter[0] + (state.endCenter[0] - state.startCenter[0]) * easedProgress,
        state.startCenter[1] + (state.endCenter[1] - state.startCenter[1]) * easedProgress,
      ];

      const newZoom = state.startZoom + (state.endZoom - state.startZoom) * easedProgress;
      const newPitch = state.startPitch + (state.endPitch - state.startPitch) * easedProgress;
      const newBearing = interpolateAngle(state.startBearing, state.endBearing, easedProgress);

      // Update camera position
      map.jumpTo({
        center: newCenter,
        zoom: newZoom,
        pitch: newPitch,
        bearing: newBearing,
      });

      // Continue animation if not complete
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationStateRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [map, stopAnimation]);

  // Pan in a direction (N, S, E, W)
  const panDirection = useCallback((direction: 'N' | 'S' | 'E' | 'W', distance = 0.5) => {
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom();

    // Adjust distance based on zoom level (more pan at lower zoom)
    const scaledDistance = distance / Math.pow(2, zoom - 10);

    const newCenter: [number, number] = [...(center.toArray() as [number, number])];

    switch (direction) {
      case 'N':
        newCenter[1] += scaledDistance;
        break;
      case 'S':
        newCenter[1] -= scaledDistance;
        break;
      case 'E':
        newCenter[0] += scaledDistance;
        break;
      case 'W':
        newCenter[0] -= scaledDistance;
        break;
    }

    animateTo({ center: newCenter, duration: 800 });
  }, [map, animateTo]);

  // Zoom in/out
  const adjustZoom = useCallback((delta: number) => {
    if (!map) return;
    const currentZoom = map.getZoom();
    animateTo({ zoom: currentZoom + delta, duration: 600 });
  }, [map, animateTo]);

  // Set pitch to specific angle
  const setPitch = useCallback((pitch: number) => {
    animateTo({ pitch, duration: 1000 });
  }, [animateTo]);

  // Rotate by delta degrees
  const rotate = useCallback((delta: number) => {
    if (!map) return;
    const currentBearing = map.getBearing();
    animateTo({ bearing: currentBearing + delta, duration: 800 });
  }, [map, animateTo]);

  return {
    animateTo,
    panDirection,
    adjustZoom,
    setPitch,
    rotate,
    stopAnimation,
  };
}
