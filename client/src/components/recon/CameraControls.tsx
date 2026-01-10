import { useState, useEffect, useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { useSmartOrbit } from '@/hooks/useSmartOrbit';
import { Button } from '@/components/ui/button';
import {
  Plane,
  RotateCw,
  Orbit,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CameraControls() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  const { animateTo, panDirection, adjustZoom, setPitch, stopAnimation } = useCameraAnimation();

  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(false);
  const [isFlightMode, setIsFlightMode] = useState(false);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(0.05); // degrees
  const [orbitSpeed, setOrbitSpeed] = useState((2 * Math.PI) / 60); // 1 rotation per 60 seconds

  const rotationFrameRef = useRef<number | undefined>(undefined);
  const orbitFrameRef = useRef<number | undefined>(undefined);
  const flightFrameRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);

  // Smart orbit: double-click or long-press to orbit around a point
  useSmartOrbit({
    isEnabled: !isAutoRotating && !isFlightMode,
    onOrbitStart: (center) => {
      setOrbitCenter(center);
      setIsAutoOrbiting(true);
    },
    onOrbitStop: () => {
      setIsAutoOrbiting(false);
      setOrbitCenter(null);
    },
  });

  // Auto-rotate: smooth continuous rotation around current center
  useEffect(() => {
    if (!map || !isLoaded || !isAutoRotating) return;

    const rotationSpeed = 0.02; // degrees per frame at 60fps
    let lastTime = performance.now();

    const rotate = (currentTime: number) => {
      if (!map || !isAutoRotating) return;

      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = rotationSpeed * (deltaTime / 16.67); // Normalize to 60fps

      const currentBearing = map.getBearing();
      map.setBearing(currentBearing + frameAdjustedSpeed);

      lastTime = currentTime;
      rotationFrameRef.current = requestAnimationFrame(rotate);
    };

    rotationFrameRef.current = requestAnimationFrame(rotate);

    return () => {
      if (rotationFrameRef.current !== undefined) {
        cancelAnimationFrame(rotationFrameRef.current);
      }
    };
  }, [map, isLoaded, isAutoRotating]);

  // Auto-orbit: circular orbit around a fixed point
  useEffect(() => {
    if (!map || !isLoaded || !isAutoOrbiting) return;

    // Use orbit center from smart orbit, or current center if manual toggle
    const centerLng = orbitCenter ? orbitCenter[0] : map.getCenter().lng;
    const centerLat = orbitCenter ? orbitCenter[1] : map.getCenter().lat;

    let angle = 0;
    let lastTime = performance.now();

    const orbit = (currentTime: number) => {
      if (!map || !isAutoOrbiting) return;

      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = orbitSpeed * (deltaTime / 1000); // Convert to radians per second

      angle += frameAdjustedSpeed;

      const newCenter: [number, number] = [
        centerLng + Math.cos(angle) * orbitRadius,
        centerLat + Math.sin(angle) * orbitRadius,
      ];

      map.setCenter(newCenter);

      // Point camera toward orbit center
      const dx = centerLng - newCenter[0];
      const dy = centerLat - newCenter[1];
      const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      map.setBearing(bearing);

      lastTime = currentTime;
      orbitFrameRef.current = requestAnimationFrame(orbit);
    };

    orbitFrameRef.current = requestAnimationFrame(orbit);

    return () => {
      if (orbitFrameRef.current !== undefined) {
        cancelAnimationFrame(orbitFrameRef.current);
      }
    };
  }, [map, isLoaded, isAutoOrbiting, orbitCenter, orbitRadius, orbitSpeed]);

  // Flight mode: simulate forward movement at high altitude
  useEffect(() => {
    if (!map || !isLoaded || !isFlightMode) return;

    const flightSpeed = 0.002; // degrees per frame (approx 15,000 kph)
    let lastTime = performance.now();

    const fly = (currentTime: number) => {
      if (!map || !isFlightMode) return;

      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeed * (deltaTime / 16.67);

      const bearing = map.getBearing();
      const center = map.getCenter();

      // Calculate new position based on bearing
      const bearingRad = (bearing * Math.PI) / 180;
      const newCenter: [number, number] = [
        center.lng + Math.sin(bearingRad) * frameAdjustedSpeed,
        center.lat + Math.cos(bearingRad) * frameAdjustedSpeed,
      ];

      map.setCenter(newCenter);

      lastTime = currentTime;
      flightFrameRef.current = requestAnimationFrame(fly);
    };

    flightFrameRef.current = requestAnimationFrame(fly);

    return () => {
      if (flightFrameRef.current !== undefined) {
        cancelAnimationFrame(flightFrameRef.current);
      }
    };
  }, [map, isLoaded, isFlightMode]);

  const toggleAutoRotate = () => {
    if (isAutoOrbiting) setIsAutoOrbiting(false);
    if (isFlightMode) setIsFlightMode(false);
    setIsAutoRotating(!isAutoRotating);
  };

  const toggleAutoOrbit = () => {
    if (isAutoRotating) setIsAutoRotating(false);
    if (isFlightMode) setIsFlightMode(false);
    if (isAutoOrbiting) {
      setOrbitCenter(null); // Clear orbit center when manually toggling off
    }
    setIsAutoOrbiting(!isAutoOrbiting);
  };

  const toggleFlightMode = () => {
    if (!map) return;

    if (!isFlightMode) {
      // Enter flight mode
      if (isAutoRotating) setIsAutoRotating(false);
      if (isAutoOrbiting) setIsAutoOrbiting(false);

      // Animate to flight view: pitch 75°, zoom to 10,000ft altitude (approx zoom 11)
      animateTo({
        pitch: 75,
        zoom: 11,
        duration: 2000,
      });
      setIsFlightMode(true);
    } else {
      // Exit flight mode - return to normal view
      animateTo({
        pitch: 60,
        zoom: map.getZoom(),
        duration: 2000,
      });
      setIsFlightMode(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-3 z-10 pointer-events-none">
      {/* Camera Mode Controls */}
      <div className="flex flex-col gap-2 bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant={isAutoRotating ? 'default' : 'ghost'}
            onClick={toggleAutoRotate}
            title="Auto-rotate"
            className={cn(
              'transition-all border border-slate-700/50',
              isAutoRotating
                ? 'bg-blue-600/80 hover:bg-blue-500/80 text-white border-blue-400/50'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-200'
            )}
          >
            <RotateCw className={cn('size-4', isAutoRotating && 'animate-spin')} />
          </Button>
          <Button
            size="icon-sm"
            variant={isAutoOrbiting ? 'default' : 'ghost'}
            onClick={toggleAutoOrbit}
            title="Auto-orbit"
            className={cn(
              'transition-all border border-slate-700/50',
              isAutoOrbiting
                ? 'bg-blue-600/80 hover:bg-blue-500/80 text-white border-blue-400/50'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-200'
            )}
          >
            <Orbit className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant={isFlightMode ? 'default' : 'ghost'}
            onClick={toggleFlightMode}
            title="Flight mode"
            className={cn(
              'transition-all border border-slate-700/50',
              isFlightMode
                ? 'bg-blue-600/80 hover:bg-blue-500/80 text-white border-blue-400/50 ring-2 ring-blue-400/30'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-200'
            )}
          >
            <Plane className="size-4" />
          </Button>
        </div>
      </div>

      {/* Pan Controls */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
        <div className="grid grid-cols-3 gap-1 w-[120px]">
          <div />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => panDirection('N')}
            title="Pan North"
            className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
          >
            <ChevronUp className="size-4" />
          </Button>
          <div />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => panDirection('W')}
            title="Pan West"
            className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => panDirection('E')}
            title="Pan East"
            className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
          >
            <ChevronRight className="size-4" />
          </Button>
          <div />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => panDirection('S')}
            title="Pan South"
            className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
          >
            <ChevronDown className="size-4" />
          </Button>
          <div />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => adjustZoom(1)}
          title="Zoom In"
          className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => adjustZoom(-1)}
          title="Zoom Out"
          className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          <Minus className="size-4" />
        </Button>
      </div>

      {/* Pitch Presets */}
      <div className="flex flex-col gap-1 bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPitch(0)}
          title="Top-down view"
          className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          0°
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPitch(30)}
          title="Slight angle"
          className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          30°
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPitch(45)}
          title="Medium angle"
          className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          45°
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPitch(60)}
          title="Steep angle"
          className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
        >
          60°
        </Button>
      </div>

      {/* Orbit Controls */}
      {isAutoOrbiting && (
        <>
          <div className="flex flex-col gap-1 bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
            <div className="text-xs text-slate-300 mb-1 px-1">Orbit Radius</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrbitRadius(r => Math.min(r * 1.2, 1.0))}
              title="Increase orbit radius"
              className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
            >
              Radius +
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrbitRadius(r => Math.max(r * 0.8, 0.001))}
              title="Decrease orbit radius"
              className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
            >
              Radius -
            </Button>
          </div>

          <div className="flex flex-col gap-1 bg-slate-900/40 backdrop-blur-md rounded-lg p-2 shadow-xl border border-blue-500/20 pointer-events-auto">
            <div className="text-xs text-slate-300 mb-1 px-1">Orbit Speed</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrbitSpeed(s => Math.min(s * 1.2, Math.PI))}
              title="Increase orbit speed"
              className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
            >
              Speed +
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrbitSpeed(s => Math.max(s * 0.8, 0.01))}
              title="Decrease orbit speed"
              className="text-xs bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all"
            >
              Speed -
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
