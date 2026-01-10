import { useState, useEffect, useRef } from 'react';
import type { MapMouseEvent } from '@maptiler/sdk';
import { useMapStore } from '@/stores/mapStore';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { Button } from '@/components/ui/button';
import {
  Plane,
  RotateCw,
  Orbit,
  Plus,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Military Compass Component
function MilitaryCompass({ onPan }: { onPan: (direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW') => void }) {
  const directions = [
    { dir: 'N' as const, angle: 0, label: 'N', isCardinal: true },
    { dir: 'NE' as const, angle: 45, label: 'NE', isCardinal: false },
    { dir: 'E' as const, angle: 90, label: 'E', isCardinal: true },
    { dir: 'SE' as const, angle: 135, label: 'SE', isCardinal: false },
    { dir: 'S' as const, angle: 180, label: 'S', isCardinal: true },
    { dir: 'SW' as const, angle: 225, label: 'SW', isCardinal: false },
    { dir: 'W' as const, angle: 270, label: 'W', isCardinal: true },
    { dir: 'NW' as const, angle: 315, label: 'NW', isCardinal: false },
  ];

  return (
    <div className="relative w-24 h-24">
      {/* Compass base circle */}
      <div className="absolute inset-0 rounded-full bg-slate-900/60 backdrop-blur-sm border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/20">
        {/* Tick marks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {directions.map(({ angle, isCardinal }) => {
            const rad = (angle - 90) * Math.PI / 180;
            const startRadius = isCardinal ? 38 : 40;
            const endRadius = isCardinal ? 46 : 44;
            const x1 = 50 + Math.cos(rad) * startRadius;
            const y1 = 50 + Math.sin(rad) * startRadius;
            const x2 = 50 + Math.cos(rad) * endRadius;
            const y2 = 50 + Math.sin(rad) * endRadius;
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCardinal ? '#06b6d4' : '#334155'}
                strokeWidth={isCardinal ? '2' : '1'}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30" />
        </div>

        {/* Direction buttons */}
        {directions.map(({ dir, angle, label, isCardinal }) => {
          const rad = (angle - 90) * Math.PI / 180;
          const radius = 36;
          const x = 50 + Math.cos(rad) * radius;
          const y = 50 + Math.sin(rad) * radius;

          return (
            <button
              key={dir}
              onClick={() => onPan(dir)}
              className={cn(
                "absolute text-[9px] font-bold transition-all hover:scale-110",
                isCardinal ? "text-cyan-300 w-5 h-5" : "text-slate-400 w-4 h-4",
                "flex items-center justify-center rounded-full",
                "hover:bg-cyan-500/20 hover:text-cyan-200",
                "active:bg-cyan-500/40"
              )}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              title={`Pan ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CameraControls() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  const { animateTo, panDirection, adjustZoom, setPitch } = useCameraAnimation();

  // Track zoom changes
  useEffect(() => {
    if (!map || !isLoaded) return;
    const updateZoom = () => setCurrentZoom(map.getZoom());
    updateZoom();
    map.on('zoom', updateZoom);
    return () => { map.off('zoom', updateZoom); };
  }, [map, isLoaded]);

  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(false);
  const [isFlightMode, setIsFlightMode] = useState(false);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | null>(null);
  const rotationFrameRef = useRef<number | undefined>(undefined);
  const orbitFrameRef = useRef<number | undefined>(undefined);
  const flightFrameRef = useRef<number | undefined>(undefined);
  const orbitStartAngleRef = useRef<number | null>(null);

  // Use refs for orbit params so animation doesn't restart on changes
  const orbitRadiusRef = useRef(0.05);
  const orbitSpeedRef = useRef((2 * Math.PI) / 60);
  const orbitDirectionRef = useRef(1);

  // Track current zoom for display
  const [currentZoom, setCurrentZoom] = useState(0);

  // Double-tap in orbit mode: fly to location at 10,000 feet
  useEffect(() => {
    if (!map || !isLoaded || !isAutoOrbiting) return;

    const handleDoubleClick = (e: MapMouseEvent) => {
      const targetLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // 10,000 feet ≈ zoom 12.5 (from altitudeFeetToZoom calculation)
      const targetZoom = 12.5;

      // Stop orbiting
      setIsAutoOrbiting(false);
      setOrbitCenter(null);
      orbitStartAngleRef.current = null;

      // Fly to location - go to 10,000 feet regardless of current altitude
      map.flyTo({
        center: targetLngLat,
        zoom: targetZoom,
        pitch: 60,
        duration: 2000,
        essential: true,
      });
    };

    map.on('dblclick', handleDoubleClick);
    return () => { map.off('dblclick', handleDoubleClick); };
  }, [map, isLoaded, isAutoOrbiting]);

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
    if (!map || !isLoaded || !isAutoOrbiting || !orbitCenter) return;

    const centerLng = orbitCenter[0];
    const centerLat = orbitCenter[1];

    // Start from captured angle, or calculate from current bearing
    let angle = orbitStartAngleRef.current ?? 0;
    let lastTime = performance.now();

    // Smooth interpolation state - reads from refs for live updates
    let currentRadius = 0.001;
    let currentSpeed = orbitSpeedRef.current * 0.1;
    let currentDirection = orbitDirectionRef.current;

    // Ease-in duration (ms)
    const easeInDuration = 1500;
    const startTime = performance.now();

    const orbit = (currentTime: number) => {
      if (!map || !isAutoOrbiting) return;

      const deltaTime = currentTime - lastTime;
      const elapsed = currentTime - startTime;

      // Smooth ease-in factor (0 to 1 over easeInDuration)
      const easeInProgress = Math.min(elapsed / easeInDuration, 1);
      // Use cubic ease-out for smooth acceleration
      const easeFactor = 1 - Math.pow(1 - easeInProgress, 3);

      // Read targets from refs (allows live adjustment via buttons)
      const targetRadius = orbitRadiusRef.current;
      const targetSpeed = orbitSpeedRef.current;
      const targetDirection = orbitDirectionRef.current;

      // Smoothly interpolate to target values
      currentRadius += (targetRadius - currentRadius) * Math.min(easeFactor * 0.1, 0.05);
      currentSpeed += (targetSpeed - currentSpeed) * Math.min(easeFactor * 0.1, 0.05);
      currentDirection += (targetDirection - currentDirection) * 0.1;

      // Frame-adjusted speed (radians per frame)
      // Flip sign so positive direction = clockwise (more intuitive for map)
      const frameAdjustedSpeed = -currentSpeed * currentDirection * (deltaTime / 1000);

      angle += frameAdjustedSpeed;

      // Camera position on the orbit circle
      const newCenter: [number, number] = [
        centerLng + Math.cos(angle) * currentRadius,
        centerLat + Math.sin(angle) * currentRadius,
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
  }, [map, isLoaded, isAutoOrbiting, orbitCenter]);

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
      // Turning off - reset refs to defaults
      setOrbitCenter(null);
      orbitStartAngleRef.current = null;
      orbitRadiusRef.current = 0.05;
      orbitSpeedRef.current = (2 * Math.PI) / 60;
      orbitDirectionRef.current = 1;
    } else {
      // Turning on - capture current state for smooth transition
      if (map) {
        const currentBearing = map.getBearing();
        // Convert bearing to orbit angle:
        // Bearing 0 (North) = camera is South = orbit angle -π/2
        // Bearing 90 (East) = camera is West = orbit angle π
        // Formula: angle = -(bearing + 90) * π/180
        const startAngle = -(currentBearing + 90) * Math.PI / 180;
        orbitStartAngleRef.current = startAngle;
        setOrbitCenter([map.getCenter().lng, map.getCenter().lat]);
      }
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
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-none">
      {/* TACTICAL COMMAND CONSOLE */}
      <div className="bg-slate-950/80 backdrop-blur-md rounded-lg p-3 shadow-2xl border border-cyan-500/30 pointer-events-auto">

        {/* Mode & Navigation Row */}
        <div className="flex gap-3 mb-2 items-center">
          {/* Mode Buttons */}
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleAutoRotate}
              title="Auto-rotate"
              className={cn(
                'transition-all border',
                isAutoRotating
                  ? 'bg-cyan-600/60 border-cyan-400/60 text-white'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
              )}
            >
              <RotateCw className={cn('size-4', isAutoRotating && 'animate-spin')} />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleAutoOrbit}
              title="Auto-orbit"
              className={cn(
                'transition-all border',
                isAutoOrbiting
                  ? 'bg-cyan-600/60 border-cyan-400/60 text-white'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
              )}
            >
              <Orbit className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleFlightMode}
              title="Flight mode"
              className={cn(
                'transition-all border',
                isFlightMode
                  ? 'bg-cyan-600/60 border-cyan-400/60 text-white ring-2 ring-cyan-400/30'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
              )}
            >
              <Plane className="size-4" />
            </Button>
          </div>

          {/* Military Compass */}
          <MilitaryCompass onPan={panDirection} />

          {/* Zoom Controls with Level Display */}
          <div className="flex flex-col gap-0.5 items-center">
            <Button size="icon-sm" variant="ghost" onClick={() => adjustZoom(1)} title="Zoom In"
              className="bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 h-7 w-7">
              <Plus className="size-3" />
            </Button>
            <div className="text-[10px] font-mono text-cyan-400 font-bold">
              Z{currentZoom.toFixed(1)}
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => adjustZoom(-1)} title="Zoom Out"
              className="bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 h-7 w-7">
              <Minus className="size-3" />
            </Button>
          </div>
        </div>

        {/* Pitch Presets - Horizontal */}
        <div className="flex gap-1 mb-2">
          <div className="text-[10px] text-slate-400 flex items-center pr-1 uppercase tracking-wider">Pitch:</div>
          <Button size="sm" variant="ghost" onClick={() => setPitch(0)} title="Top-down"
            className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
            0°
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPitch(30)} title="Slight"
            className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
            30°
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPitch(45)} title="Medium"
            className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
            45°
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPitch(60)} title="Steep"
            className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
            60°
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPitch(80)} title="Very Steep"
            className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
            80°
          </Button>
        </div>

        {/* Orbit Controls - Compact Horizontal */}
        {isAutoOrbiting && (
          <div className="flex gap-1 pt-2 border-t border-cyan-500/20">
            <div className="text-[10px] text-cyan-400 flex items-center pr-1 uppercase tracking-wider">Orbit:</div>
            <Button size="sm" variant="ghost" onClick={() => { orbitRadiusRef.current = Math.max(orbitRadiusRef.current * 0.8, 0.001); }} title="Radius -"
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
              R-
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { orbitRadiusRef.current = Math.min(orbitRadiusRef.current * 1.2, 1.0); }} title="Radius +"
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
              R+
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { orbitSpeedRef.current = Math.max(orbitSpeedRef.current * 0.7, 0.02); }} title="Speed -"
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
              S-
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { orbitSpeedRef.current = Math.min(orbitSpeedRef.current * 1.4, Math.PI * 2); }} title="Speed +"
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
              S+
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { orbitDirectionRef.current *= -1; }} title="Reverse Direction"
              className="text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-2 h-6">
              ⟲
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
