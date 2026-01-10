import { useState, useEffect, useRef } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import type { MapMouseEvent } from '@maptiler/sdk';
import { useMapStore } from '@/stores/mapStore';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import {
  Plane,
  RotateCw,
  Orbit,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact Compass Component
function MiniCompass({ bearing, onReset }: { bearing: number; onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="relative w-10 h-10 rounded-full bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-400/60 transition-all group"
      title="Reset bearing (click)"
    >
      <div
        className="absolute inset-1 flex items-center justify-center"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <Navigation className="w-5 h-5 text-cyan-400 fill-cyan-400/30 group-hover:text-cyan-300" />
      </div>
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-cyan-400">N</div>
    </button>
  );
}

// Direction pad for panning
function DirectionPad({ onPan }: { onPan: (dir: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 w-16">
      <div />
      <button onClick={() => onPan('N')} className="h-5 bg-slate-800/60 hover:bg-cyan-600/40 rounded text-[9px] text-cyan-400 font-bold">N</button>
      <div />
      <button onClick={() => onPan('W')} className="h-5 bg-slate-800/60 hover:bg-cyan-600/40 rounded text-[9px] text-cyan-400 font-bold">W</button>
      <div className="h-5 bg-slate-900/40 rounded flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
      </div>
      <button onClick={() => onPan('E')} className="h-5 bg-slate-800/60 hover:bg-cyan-600/40 rounded text-[9px] text-cyan-400 font-bold">E</button>
      <div />
      <button onClick={() => onPan('S')} className="h-5 bg-slate-800/60 hover:bg-cyan-600/40 rounded text-[9px] text-cyan-400 font-bold">S</button>
      <div />
    </div>
  );
}

export function FlightControlCenter() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { animateTo, panDirection, adjustZoom, setPitch } = useCameraAnimation();

  const [collapsed, setCollapsed] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(false);
  const [isFlightMode, setIsFlightMode] = useState(false);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);

  // Map label visibility
  const [labels, setLabels] = useState({
    cities: true,
    suburbs: true,
    towns: true,
    roads: true,
  });

  const rotationFrameRef = useRef<number | undefined>(undefined);
  const orbitFrameRef = useRef<number | undefined>(undefined);
  const flightFrameRef = useRef<number | undefined>(undefined);
  const orbitStartAngleRef = useRef<number | null>(null);
  const orbitRadiusRef = useRef(0.05);
  const orbitSpeedRef = useRef((2 * Math.PI) / 60);
  const orbitDirectionRef = useRef(1);
  const orbitMarkerRef = useRef<maptilersdk.Marker | null>(null);

  // Track map state
  useEffect(() => {
    if (!map || !isLoaded) return;
    const update = () => {
      setCurrentZoom(map.getZoom());
      setCurrentBearing(map.getBearing());
      setCurrentPitch(map.getPitch());
    };
    update();
    map.on('move', update);
    return () => { map.off('move', update); };
  }, [map, isLoaded]);

  // Orbit target marker - shows what we're orbiting around
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (orbitCenter && isAutoOrbiting) {
      // Create target marker if not exists
      if (!orbitMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'orbit-target-marker';
        el.innerHTML = `
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4 2" fill="none" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="20" cy="20" r="10" stroke="#06b6d4" stroke-width="2" fill="none" opacity="0.8"/>
            <circle cx="20" cy="20" r="3" fill="#06b6d4"/>
            <line x1="20" y1="2" x2="20" y2="8" stroke="#06b6d4" stroke-width="2"/>
            <line x1="20" y1="32" x2="20" y2="38" stroke="#06b6d4" stroke-width="2"/>
            <line x1="2" y1="20" x2="8" y2="20" stroke="#06b6d4" stroke-width="2"/>
            <line x1="32" y1="20" x2="38" y2="20" stroke="#06b6d4" stroke-width="2"/>
          </svg>
        `;
        el.style.cssText = 'filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.5));';

        orbitMarkerRef.current = new maptilersdk.Marker({ element: el, anchor: 'center' })
          .setLngLat(orbitCenter)
          .addTo(map);
      } else {
        orbitMarkerRef.current.setLngLat(orbitCenter);
      }
    } else {
      // Remove marker when not orbiting
      if (orbitMarkerRef.current) {
        orbitMarkerRef.current.remove();
        orbitMarkerRef.current = null;
      }
    }

    return () => {
      if (orbitMarkerRef.current) {
        orbitMarkerRef.current.remove();
        orbitMarkerRef.current = null;
      }
    };
  }, [map, isLoaded, orbitCenter, isAutoOrbiting]);

  // Double-tap in orbit mode: fly to location, keep orbiting
  useEffect(() => {
    if (!map || !isLoaded || !isAutoOrbiting) return;

    const handleDoubleClick = (e: MapMouseEvent) => {
      const targetLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const targetZoom = 12.5;

      setIsAutoOrbiting(false);

      // Smooth custom animation with proper easing
      const startCenter = map.getCenter();
      const startZoom = map.getZoom();
      const startPitch = map.getPitch();
      const startBearing = map.getBearing();
      const startTime = performance.now();
      const duration = 3500; // Longer for smoother feel

      // Cubic ease-in-out for buttery smooth movement
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const animateFly = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        // Interpolate all values
        const lng = startCenter.lng + (targetLngLat[0] - startCenter.lng) * eased;
        const lat = startCenter.lat + (targetLngLat[1] - startCenter.lat) * eased;
        const zoom = startZoom + (targetZoom - startZoom) * eased;
        const pitch = startPitch + (60 - startPitch) * eased;

        map.jumpTo({
          center: [lng, lat],
          zoom,
          pitch,
          bearing: startBearing,
        });

        if (progress < 1) {
          requestAnimationFrame(animateFly);
        } else {
          // Animation complete - resume orbit
          orbitStartAngleRef.current = -(startBearing + 90) * Math.PI / 180;
          setOrbitCenter(targetLngLat);
          setIsAutoOrbiting(true);
        }
      };

      requestAnimationFrame(animateFly);
    };

    map.on('dblclick', handleDoubleClick);
    return () => { map.off('dblclick', handleDoubleClick); };
  }, [map, isLoaded, isAutoOrbiting]);

  // Auto-rotate
  useEffect(() => {
    if (!map || !isLoaded || !isAutoRotating) return;
    const rotationSpeed = 0.02;
    let lastTime = performance.now();

    const rotate = (currentTime: number) => {
      if (!map || !isAutoRotating) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = rotationSpeed * (deltaTime / 16.67);
      map.setBearing(map.getBearing() + frameAdjustedSpeed);
      lastTime = currentTime;
      rotationFrameRef.current = requestAnimationFrame(rotate);
    };

    rotationFrameRef.current = requestAnimationFrame(rotate);
    return () => {
      if (rotationFrameRef.current !== undefined) cancelAnimationFrame(rotationFrameRef.current);
    };
  }, [map, isLoaded, isAutoRotating]);

  // Auto-orbit
  useEffect(() => {
    if (!map || !isLoaded || !isAutoOrbiting || !orbitCenter) return;

    const centerLng = orbitCenter[0];
    const centerLat = orbitCenter[1];
    let angle = orbitStartAngleRef.current ?? 0;
    let lastTime = performance.now();
    let currentRadius = 0.001;
    let currentSpeed = orbitSpeedRef.current * 0.1;
    let currentDirection = orbitDirectionRef.current;
    const easeInDuration = 1500;
    const startTime = performance.now();

    const orbit = (currentTime: number) => {
      if (!map || !isAutoOrbiting) return;
      const deltaTime = currentTime - lastTime;
      const elapsed = currentTime - startTime;
      const easeInProgress = Math.min(elapsed / easeInDuration, 1);
      const easeFactor = 1 - Math.pow(1 - easeInProgress, 3);

      currentRadius += (orbitRadiusRef.current - currentRadius) * Math.min(easeFactor * 0.1, 0.05);
      currentSpeed += (orbitSpeedRef.current - currentSpeed) * Math.min(easeFactor * 0.1, 0.05);
      currentDirection += (orbitDirectionRef.current - currentDirection) * 0.1;

      const frameAdjustedSpeed = -currentSpeed * currentDirection * (deltaTime / 1000);
      angle += frameAdjustedSpeed;

      const newCenter: [number, number] = [
        centerLng + Math.cos(angle) * currentRadius,
        centerLat + Math.sin(angle) * currentRadius,
      ];
      map.setCenter(newCenter);

      const dx = centerLng - newCenter[0];
      const dy = centerLat - newCenter[1];
      map.setBearing((Math.atan2(dx, dy) * 180) / Math.PI);

      lastTime = currentTime;
      orbitFrameRef.current = requestAnimationFrame(orbit);
    };

    orbitFrameRef.current = requestAnimationFrame(orbit);
    return () => {
      if (orbitFrameRef.current !== undefined) cancelAnimationFrame(orbitFrameRef.current);
    };
  }, [map, isLoaded, isAutoOrbiting, orbitCenter]);

  // Flight mode
  useEffect(() => {
    if (!map || !isLoaded || !isFlightMode) return;
    const flightSpeed = 0.002;
    let lastTime = performance.now();

    const fly = (currentTime: number) => {
      if (!map || !isFlightMode) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeed * (deltaTime / 16.67);
      const bearing = map.getBearing();
      const center = map.getCenter();
      const bearingRad = (bearing * Math.PI) / 180;
      map.setCenter([
        center.lng + Math.sin(bearingRad) * frameAdjustedSpeed,
        center.lat + Math.cos(bearingRad) * frameAdjustedSpeed,
      ]);
      lastTime = currentTime;
      flightFrameRef.current = requestAnimationFrame(fly);
    };

    flightFrameRef.current = requestAnimationFrame(fly);
    return () => {
      if (flightFrameRef.current !== undefined) cancelAnimationFrame(flightFrameRef.current);
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
      setOrbitCenter(null);
      orbitStartAngleRef.current = null;
      orbitRadiusRef.current = 0.05;
      orbitSpeedRef.current = (2 * Math.PI) / 60;
      orbitDirectionRef.current = 1;
    } else if (map) {
      const bearing = map.getBearing();
      orbitStartAngleRef.current = -(bearing + 90) * Math.PI / 180;
      setOrbitCenter([map.getCenter().lng, map.getCenter().lat]);
    }
    setIsAutoOrbiting(!isAutoOrbiting);
  };

  const toggleFlightMode = () => {
    if (!map) return;
    if (!isFlightMode) {
      if (isAutoRotating) setIsAutoRotating(false);
      if (isAutoOrbiting) setIsAutoOrbiting(false);
      animateTo({ pitch: 75, zoom: 11, duration: 3000 });
      setIsFlightMode(true);
    } else {
      animateTo({ pitch: 60, zoom: map.getZoom(), duration: 3000 });
      setIsFlightMode(false);
    }
  };

  const resetBearing = () => {
    if (map) map.easeTo({ bearing: 0, duration: 1500, easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
  };

  // Toggle map label visibility
  const toggleLabel = (labelId: keyof typeof labels) => {
    if (!map) return;

    const newState = !labels[labelId];

    // Get all layers and filter by label type patterns
    const style = map.getStyle();
    if (!style?.layers) return;

    const patterns: Record<string, RegExp[]> = {
      cities: [/place.*city/i, /place-city/i, /settlement.*city/i],
      suburbs: [/place.*suburb/i, /place.*neighbourhood/i, /place.*neighborhood/i, /settlement.*suburb/i],
      towns: [/place.*town/i, /place.*village/i, /settlement.*town/i, /settlement.*village/i],
      roads: [/road.*label/i, /highway.*label/i, /street.*label/i, /path.*label/i],
    };

    const labelPatterns = patterns[labelId] || [];

    style.layers.forEach((layer: any) => {
      if (layer.type === 'symbol' && layer.id) {
        const matches = labelPatterns.some(pattern => pattern.test(layer.id));
        if (matches) {
          try {
            map.setLayoutProperty(layer.id, 'visibility', newState ? 'visible' : 'none');
          } catch {
            // Layer may not exist
          }
        }
      }
    });

    setLabels(prev => ({ ...prev, [labelId]: newState }));
  };

  if (!isLoaded) return null;

  return (
    <>
      {/* Collapse/Expand Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute top-4 z-20 bg-slate-950/90 border border-cyan-500/40 rounded-l-lg p-2 transition-all hover:bg-slate-900/90",
          collapsed ? "right-0" : "right-[200px]"
        )}
      >
        {collapsed ? <ChevronLeft className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
      </button>

      {/* Main Sidebar */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-[200px] bg-slate-950/95 backdrop-blur-md border-l border-cyan-500/30 z-10 transition-transform duration-300 flex flex-col",
          collapsed && "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-cyan-500/20">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Plane className="w-4 h-4" />
            Flight Control
          </div>
        </div>

        {/* Status Display */}
        <div className="px-3 py-2 border-b border-slate-800/50 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Zoom</div>
            <div className="text-sm font-mono text-cyan-400">{currentZoom.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Pitch</div>
            <div className="text-sm font-mono text-cyan-400">{currentPitch.toFixed(0)}°</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Hdg</div>
            <div className="text-sm font-mono text-cyan-400">{((currentBearing % 360) + 360).toFixed(0).padStart(3, '0')}°</div>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Mode</div>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleAutoRotate}
              title="Auto-rotate"
              className={cn(
                'flex-1 h-8 transition-all border',
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
                'flex-1 h-8 transition-all border',
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
                'flex-1 h-8 transition-all border',
                isFlightMode
                  ? 'bg-cyan-600/60 border-cyan-400/60 text-white'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
              )}
            >
              <Plane className="size-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Navigation</div>
          <div className="flex items-center justify-between">
            <DirectionPad onPan={panDirection} />
            <MiniCompass bearing={currentBearing} onReset={resetBearing} />
          </div>
        </div>

        {/* Zoom */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Altitude</div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => adjustZoom(1)}
              className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">
              <Plus className="size-3 mr-1" /> Up
            </Button>
            <Button size="sm" variant="ghost" onClick={() => adjustZoom(-1)}
              className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">
              <Minus className="size-3 mr-1" /> Down
            </Button>
          </div>
        </div>

        {/* Pitch */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Pitch</div>
          <div className="flex gap-1 flex-wrap">
            {[0, 30, 45, 60, 80].map((p) => (
              <Button
                key={p}
                size="sm"
                variant="ghost"
                onClick={() => setPitch(p)}
                className={cn(
                  "text-xs px-2 h-6 border",
                  Math.abs(currentPitch - p) < 5
                    ? "bg-cyan-600/40 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border-slate-700/50"
                )}
              >
                {p}°
              </Button>
            ))}
          </div>
        </div>

        {/* Map Labels */}
        <div className="p-3 border-b border-slate-800/50">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Labels</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { id: 'cities' as const, label: 'Cities' },
              { id: 'suburbs' as const, label: 'Suburbs' },
              { id: 'towns' as const, label: 'Towns' },
              { id: 'roads' as const, label: 'Roads' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => toggleLabel(id)}
                className={cn(
                  "text-[10px] px-2 py-1.5 rounded border transition-all font-medium",
                  labels[id]
                    ? "bg-cyan-600/40 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-700/60"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Orbit Controls */}
        {isAutoOrbiting && (
          <div className="p-3 border-b border-cyan-500/30 bg-cyan-950/20">
            <div className="text-[9px] text-cyan-400 uppercase mb-2">Orbit Control</div>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant="ghost" onClick={() => { orbitRadiusRef.current = Math.max(orbitRadiusRef.current * 0.8, 0.001); }}
                className="text-xs h-6 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">R-</Button>
              <Button size="sm" variant="ghost" onClick={() => { orbitRadiusRef.current = Math.min(orbitRadiusRef.current * 1.2, 1.0); }}
                className="text-xs h-6 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">R+</Button>
              <Button size="sm" variant="ghost" onClick={() => { orbitSpeedRef.current = Math.max(orbitSpeedRef.current * 0.7, 0.02); }}
                className="text-xs h-6 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">S-</Button>
              <Button size="sm" variant="ghost" onClick={() => { orbitSpeedRef.current = Math.min(orbitSpeedRef.current * 1.4, Math.PI * 2); }}
                className="text-xs h-6 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">S+</Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { orbitDirectionRef.current *= -1; }}
              className="w-full mt-1 text-xs h-6 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">
              Reverse Direction
            </Button>
          </div>
        )}

        {/* Notifications Area */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className="text-[9px] text-slate-500 uppercase mb-2">Notifications</div>
          <div className="relative h-full">
            <Toaster
              position="top-right"
              expand={false}
              richColors={false}
              closeButton={true}
              gap={4}
              containerAriaLabel="Notifications"
              toastOptions={{
                classNames: {
                  toast: "!relative !top-0 !right-0 !transform-none !w-full group toast group-[.toaster]:bg-slate-900/90 group-[.toaster]:text-cyan-400 group-[.toaster]:border-cyan-500/30 group-[.toaster]:shadow-lg group-[.toaster]:font-mono group-[.toaster]:text-xs",
                  description: "group-[.toast]:text-cyan-300/70 group-[.toast]:font-mono group-[.toast]:text-[10px]",
                  closeButton: "group-[.toast]:bg-slate-800/50 group-[.toast]:border-cyan-500/20 group-[.toast]:text-cyan-400",
                  error: "group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/30",
                  success: "group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/30",
                  warning: "group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-500/30",
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default FlightControlCenter;
