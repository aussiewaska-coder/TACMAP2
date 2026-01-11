import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import type { FlightMode } from '@/stores/flightControlStore';

const SAMPLE_INTERVAL = 2000; // Sample position every 2 seconds

export function usePathTracker(activeMode: FlightMode) {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { addPathPoint, clearPath } = useFlightControlStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Only track in flight modes (not standard navigation)
    const shouldTrack = ['auto-rotate', 'auto-orbit', 'flight', 'random-path'].includes(activeMode);

    if (shouldTrack) {
      // Sample position periodically
      intervalRef.current = setInterval(() => {
        const center = map.getCenter();
        addPathPoint({
          coords: [center.lng, center.lat],
          timestamp: Date.now(),
          altitude: map.getZoom(),
          heading: map.getBearing(),
        });
      }, SAMPLE_INTERVAL);
    } else {
      // Clear path when switching to standard mode
      clearPath();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [map, isLoaded, activeMode, addPathPoint, clearPath]);
}
