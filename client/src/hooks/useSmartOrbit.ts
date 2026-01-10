import { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { easeInOut } from '@/flightSim/easing';
import type { MapMouseEvent, MapTouchEvent } from '@maptiler/sdk';

interface SmartOrbitOptions {
  isEnabled: boolean;
  onOrbitStart: (center: [number, number]) => void;
  onOrbitStop: () => void;
}

/**
 * Hook for smart orbit feature
 * - Double-click to orbit around a point
 * - Long-press (mobile) to orbit around a point
 * - Click anywhere to stop
 */
export function useSmartOrbit({ isEnabled, onOrbitStart, onOrbitStop }: SmartOrbitOptions) {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isOrbitingRef = useRef(false);
  const flyAnimationRef = useRef<number | undefined>(undefined);

  // Fly to location with smooth easing
  const flyToLocation = useCallback(
    (lngLat: [number, number]) => {
      if (!map) return;

      const startCenter = map.getCenter();
      const startZoom = map.getZoom();
      const startPitch = map.getPitch();

      const targetZoom = 14;
      const targetPitch = 45;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        if (!map) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOut(progress);

        // Interpolate position
        const newCenter: [number, number] = [
          startCenter.lng + (lngLat[0] - startCenter.lng) * easedProgress,
          startCenter.lat + (lngLat[1] - startCenter.lat) * easedProgress,
        ];

        const newZoom = startZoom + (targetZoom - startZoom) * easedProgress;
        const newPitch = startPitch + (targetPitch - startPitch) * easedProgress;

        map.jumpTo({
          center: newCenter,
          zoom: newZoom,
          pitch: newPitch,
        });

        if (progress < 1) {
          flyAnimationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete, start orbiting
          onOrbitStart(lngLat);
        }
      };

      if (flyAnimationRef.current !== undefined) {
        cancelAnimationFrame(flyAnimationRef.current);
      }

      flyAnimationRef.current = requestAnimationFrame(animate);
    },
    [map, onOrbitStart]
  );

  // Handle double-click
  const handleDoubleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!isEnabled || !map) return;

      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      flyToLocation(lngLat);
    },
    [isEnabled, map, flyToLocation]
  );

  // Handle touch start (for long-press)
  const handleTouchStart = useCallback(
    (e: MapTouchEvent) => {
      if (!isEnabled || !map) return;

      const touch = e.originalEvent.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      longPressTimerRef.current = setTimeout(() => {
        flyToLocation(lngLat);
      }, 500); // 500ms for long-press
    },
    [isEnabled, map, flyToLocation]
  );

  // Handle touch move (cancel long-press if user moves)
  const handleTouchMove = useCallback(
    (e: MapTouchEvent) => {
      if (!touchStartPosRef.current) return;

      const touch = e.originalEvent.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

      // Cancel long-press if user moved more than 10px
      if (deltaX > 10 || deltaY > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = undefined;
        }
        touchStartPosRef.current = null;
      }
    },
    []
  );

  // Handle touch end (cancel long-press timer)
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
    touchStartPosRef.current = null;
  }, []);

  // Handle single click (stop orbiting)
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!isEnabled) return;

      // Stop orbiting on any click (if currently orbiting)
      if (isOrbitingRef.current) {
        onOrbitStop();
        isOrbitingRef.current = false;
        e.preventDefault();
      }
    },
    [isEnabled, onOrbitStop]
  );

  // Update orbiting ref when orbit starts
  useEffect(() => {
    const handleOrbitChange = () => {
      isOrbitingRef.current = isEnabled;
    };

    handleOrbitChange();
  }, [isEnabled]);

  // Attach event listeners
  useEffect(() => {
    if (!map || !isLoaded || !isEnabled) return;

    map.on('dblclick', handleDoubleClick);
    map.on('click', handleClick);
    map.on('touchstart', handleTouchStart);
    map.on('touchmove', handleTouchMove);
    map.on('touchend', handleTouchEnd);

    return () => {
      map.off('dblclick', handleDoubleClick);
      map.off('click', handleClick);
      map.off('touchstart', handleTouchStart);
      map.off('touchmove', handleTouchMove);
      map.off('touchend', handleTouchEnd);

      if (longPressTimerRef.current !== undefined) {
        clearTimeout(longPressTimerRef.current);
      }
      if (flyAnimationRef.current !== undefined) {
        cancelAnimationFrame(flyAnimationRef.current);
      }
    };
  }, [
    map,
    isLoaded,
    isEnabled,
    handleDoubleClick,
    handleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return null;
}
