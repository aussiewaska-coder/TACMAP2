import { useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';

/**
 * Hook for smoothly flying to a location and then orbiting around it
 * Pattern: Fly to target, detect arrival via moveend, then start orbital motion
 */
export function useFlyToAndOrbit() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  // Orbit animation state
  const orbitFrameRef = useRef<number | undefined>(undefined);
  const orbitCenterRef = useRef<[number, number] | null>(null);
  const isOrbitingRef = useRef(false);
  const moveendListenerRef = useRef<(() => void) | null>(null);

  /**
   * Stop active orbit animation
   */
  const stopOrbit = useCallback(() => {
    if (orbitFrameRef.current !== undefined) {
      cancelAnimationFrame(orbitFrameRef.current);
      orbitFrameRef.current = undefined;
    }
    isOrbitingRef.current = false;
    orbitCenterRef.current = null;

    // Clean up moveend listener if it exists
    if (moveendListenerRef.current && map) {
      map.off('moveend', moveendListenerRef.current);
      moveendListenerRef.current = null;
    }
  }, [map]);

  /**
   * Start orbital motion around a center point
   * Captures current bearing for smooth transition from current view
   */
  const startOrbit = useCallback(
    (center: [number, number]) => {
      if (!map || !isLoaded) return;

      stopOrbit(); // Stop any existing orbit

      orbitCenterRef.current = center;
      isOrbitingRef.current = true;

      const [centerLng, centerLat] = center;

      // Capture current bearing and convert to orbit angle
      // Formula: angle = -(bearing + 90) * π/180
      // This matches the pattern from CameraControls
      const currentBearing = map.getBearing();
      let angle = -(currentBearing + 90) * (Math.PI / 180);

      const radius = 0.02; // ~2.2km at equator (tighter than auto-orbit)
      const speed = (2 * Math.PI) / 60; // 12°/s (30 second full rotation)

      let lastTime = performance.now();
      let easeInStart = performance.now();
      const easeInDuration = 1500; // Smooth ease-in over 1.5 seconds

      const orbit = (currentTime: number) => {
        if (!map || !isOrbitingRef.current || !orbitCenterRef.current) return;

        const deltaTime = currentTime - lastTime;
        const elapsed = currentTime - easeInStart;

        // Ease-in factor: 0 to 1 using cubic ease-out
        const easeInProgress = Math.min(elapsed / easeInDuration, 1);
        const easeFactor = 1 - Math.pow(1 - easeInProgress, 3);

        // Frame-adjusted speed (radians per frame)
        // Negative sign makes positive direction = clockwise rotation (intuitive for maps)
        const frameAdjustedSpeed = -speed * easeFactor * (deltaTime / 1000);
        angle += frameAdjustedSpeed;

        // Calculate camera position on orbit circle
        const newCenter: [number, number] = [
          centerLng + Math.cos(angle) * radius * easeFactor,
          centerLat + Math.sin(angle) * radius * easeFactor,
        ];

        map.setCenter(newCenter);

        // Point camera bearing toward orbit center (always facing inward)
        const dx = centerLng - newCenter[0];
        const dy = centerLat - newCenter[1];
        const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
        map.setBearing(bearing);

        lastTime = currentTime;
        orbitFrameRef.current = requestAnimationFrame(orbit);
      };

      orbitFrameRef.current = requestAnimationFrame(orbit);
    },
    [map, isLoaded, stopOrbit]
  );

  /**
   * Fly to a location and start orbiting on arrival
   * Sequence:
   * 1. Fly to coordinates with optional zoom/pitch
   * 2. Listen for moveend event (arrival)
   * 3. Start orbit around the target
   */
  const flyToAndOrbit = useCallback(
    (
      coordinates: [number, number],
      options?: { zoom?: number; pitch?: number }
    ) => {
      if (!map || !isLoaded) return;

      stopOrbit(); // Stop any existing orbit

      const zoom = options?.zoom ?? 13; // Default zoom for alert (roughly 5,000 ft altitude)
      const pitch = options?.pitch ?? 60; // Default tactical pitch angle

      // Start smooth flight to target
      map.flyTo({
        center: coordinates,
        zoom,
        pitch,
        duration: 3500, // Smooth 3.5 second flight
        essential: true,
      });

      // Listen for arrival (moveend event)
      // Remove previous listener if any exists
      if (moveendListenerRef.current) {
        map.off('moveend', moveendListenerRef.current);
      }

      const onMoveEnd = () => {
        // Once arrived, start orbit
        if (isOrbitingRef.current === false) {
          startOrbit(coordinates);
        }
        // Listener runs once, then remove it
        if (moveendListenerRef.current) {
          map.off('moveend', moveendListenerRef.current);
          moveendListenerRef.current = null;
        }
      };

      moveendListenerRef.current = onMoveEnd;
      map.once('moveend', onMoveEnd);
    },
    [map, isLoaded, stopOrbit, startOrbit]
  );

  return {
    flyToAndOrbit,
    stopOrbit,
    isOrbiting: isOrbitingRef.current,
  };
}
