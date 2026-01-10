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
  Compass,
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
  const [isRandomPathFlight, setIsRandomPathFlight] = useState(false);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | null>(null);
  const [targetLocation, setTargetLocation] = useState<[number, number] | null>(null);
  const [isNavigatingToTarget, setIsNavigatingToTarget] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [activeMagnification, setActiveMagnification] = useState<null | '5x' | '10x'>(null);
  const [baseZoomRef, setBaseZoomRef] = useState(0);


  const rotationFrameRef = useRef<number | undefined>(undefined);
  const orbitFrameRef = useRef<number | undefined>(undefined);
  const flightFrameRef = useRef<number | undefined>(undefined);
  const randomPathFrameRef = useRef<number | undefined>(undefined);
  const orbitStartAngleRef = useRef<number | null>(null);
  const orbitRadiusRef = useRef(0.05);
  const orbitSpeedRef = useRef((2 * Math.PI) / 60);
  const orbitDirectionRef = useRef(1);
  const orbitMarkerRef = useRef<maptilersdk.Marker | null>(null);
  const targetMarkerRef = useRef<maptilersdk.Marker | null>(null);
  const targetArrivalDistanceRef = useRef(0.005); // ~500m at zoom 12

  // Flight mode controls
  const flightSpeedRef = useRef(0.0005); // 1/4 of original 0.002
  const flightHeadingDeltaRef = useRef(0);
  const flightAltitudeDeltaRef = useRef(0);
  const flightPitchTargetRef = useRef(75);

  // Random path flight
  const randomHeadingTargetRef = useRef(Math.random() * 360);
  const randomHeadingChangeTimeRef = useRef(0);
  const randomPathStartTimeRef = useRef(0);

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

  // Target marker - shows where we're navigating to
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (targetLocation) {
      // Create target marker if not exists
      if (!targetMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'target-marker';
        el.innerHTML = `
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="16" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.7"/>
            <circle cx="20" cy="20" r="10" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.5"/>
            <circle cx="20" cy="20" r="4" fill="#f59e0b"/>
            <line x1="20" y1="4" x2="20" y2="10" stroke="#f59e0b" stroke-width="2"/>
            <line x1="20" y1="30" x2="20" y2="36" stroke="#f59e0b" stroke-width="2"/>
            <line x1="4" y1="20" x2="10" y2="20" stroke="#f59e0b" stroke-width="2"/>
            <line x1="30" y1="20" x2="36" y2="20" stroke="#f59e0b" stroke-width="2"/>
          </svg>
        `;
        el.style.cssText = 'filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));';

        targetMarkerRef.current = new maptilersdk.Marker({ element: el, anchor: 'center' })
          .setLngLat(targetLocation)
          .addTo(map);
      } else {
        targetMarkerRef.current.setLngLat(targetLocation);
      }
    } else {
      // Remove marker when no target
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
    }

    return () => {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
    };
  }, [map, isLoaded, targetLocation]);

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

  // Command-click targeting
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleCommandClick = (e: MapMouseEvent) => {
      // Check for command key (Mac) or control key (Windows/Linux)
      if (!(e.originalEvent as any).metaKey && !(e.originalEvent as any).ctrlKey) return;

      const clickedLocation: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setTargetLocation(clickedLocation);
      setIsNavigatingToTarget(true);

      // Get current position
      const currentCenter = map.getCenter();
      const currentPos: [number, number] = [currentCenter.lng, currentCenter.lat];
      const currentBearing = map.getBearing();

      // Calculate bearing to target
      const dx = clickedLocation[0] - currentPos[0];
      const dy = clickedLocation[1] - currentPos[1];
      const bearingToTarget = (Math.atan2(dx, dy) * 180) / Math.PI;

      if (isFlightMode) {
        // In flight mode: update heading towards target
        flightHeadingDeltaRef.current = 0; // Stop current heading adjustment
        const currentBearingNum = map.getBearing();

        // Animate bearing to face target smoothly
        const bearingDelta = bearingToTarget - currentBearingNum;
        const normalizedDelta = bearingDelta > 180 ? bearingDelta - 360 : bearingDelta < -180 ? bearingDelta + 360 : bearingDelta;

        // Smooth bearing transition over 2 seconds
        const startBearing = currentBearingNum;
        const startTime = performance.now();
        const duration = 2000;

        const transitionBearing = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const newBearing = startBearing + normalizedDelta * progress;
          map.setBearing(newBearing);

          if (progress < 1) {
            requestAnimationFrame(transitionBearing);
          }
        };

        requestAnimationFrame(transitionBearing);
      } else if (isAutoOrbiting) {
        // In orbit mode: fly to target and start orbiting
        const startCenter = map.getCenter();
        const startZoom = map.getZoom();
        const startPitch = map.getPitch();
        const orbitBearing = map.getBearing();
        const startTime = performance.now();
        const duration = 3500;

        const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const animateFly = (currentTime: number) => {
          if (!map) return;
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeInOutCubic(progress);

          const lng = startCenter.lng + (clickedLocation[0] - startCenter.lng) * eased;
          const lat = startCenter.lat + (clickedLocation[1] - startCenter.lat) * eased;
          const zoom = startZoom + (12.5 - startZoom) * eased;
          const pitch = startPitch + (60 - startPitch) * eased;

          map.jumpTo({
            center: [lng, lat],
            zoom,
            pitch,
            bearing: orbitBearing,
          });

          if (progress < 1) {
            requestAnimationFrame(animateFly);
          } else {
            // Start orbiting at target
            orbitStartAngleRef.current = -(orbitBearing + 90) * Math.PI / 180;
            setOrbitCenter(clickedLocation);
          }
        };

        requestAnimationFrame(animateFly);
      }
    };

    map.on('click', handleCommandClick);
    return () => { map.off('click', handleCommandClick); };
  }, [map, isLoaded, isFlightMode, isAutoOrbiting]);

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

  // Flight mode - smooth continuous movement with heading/altitude/pitch control
  useEffect(() => {
    if (!map || !isLoaded || !isFlightMode) return;
    let lastTime = performance.now();

    const fly = (currentTime: number) => {
      if (!map || !isFlightMode) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeedRef.current * (deltaTime / 16.67);

      // Get current state
      const bearing = map.getBearing();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();

      // Smooth heading change
      if (Math.abs(flightHeadingDeltaRef.current) > 0.01) {
        const newBearing = bearing + flightHeadingDeltaRef.current;
        map.setBearing(newBearing);
      }

      // Smooth altitude change
      if (Math.abs(flightAltitudeDeltaRef.current) > 0.01) {
        const newZoom = Math.max(5, Math.min(24, zoom + flightAltitudeDeltaRef.current));
        map.setZoom(newZoom);
      }

      // Smooth pitch change
      if (Math.abs(flightPitchTargetRef.current - pitch) > 0.5) {
        const newPitch = pitch + (flightPitchTargetRef.current - pitch) * 0.05;
        map.setPitch(newPitch);
      }

      // Forward flight
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

  // Random path flight - autonomous navigation with smooth heading/altitude changes
  useEffect(() => {
    if (!map || !isLoaded || !isRandomPathFlight) return;
    let lastTime = performance.now();

    const randomPathFly = (currentTime: number) => {
      if (!map || !isRandomPathFlight) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeedRef.current * (deltaTime / 16.67);

      // Get current state
      const bearing = map.getBearing();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();

      // Change heading randomly every 3-7 seconds
      if (randomHeadingChangeTimeRef.current === 0) {
        randomHeadingChangeTimeRef.current = currentTime + (3000 + Math.random() * 4000);
        randomHeadingTargetRef.current = Math.random() * 360;
      }

      if (currentTime >= randomHeadingChangeTimeRef.current) {
        randomHeadingChangeTimeRef.current = 0;
      }

      // Smooth heading interpolation
      let headingDelta = randomHeadingTargetRef.current - bearing;
      while (headingDelta > 180) headingDelta -= 360;
      while (headingDelta < -180) headingDelta += 360;
      const headingStep = headingDelta * 0.02; // Smooth interpolation
      map.setBearing(bearing + headingStep);

      // Random altitude changes (gentle)
      if (Math.random() < 0.01 && zoom > 5 && zoom < 18) {
        const altitudeDelta = (Math.random() - 0.5) * 0.02;
        map.setZoom(Math.max(5, Math.min(18, zoom + altitudeDelta)));
      }

      // Maintain pitch with slight variation
      const targetPitch = 65 + Math.sin(currentTime / 2000) * 10; // Oscillates between 55-75°
      const pitchStep = (targetPitch - pitch) * 0.05;
      map.setPitch(pitch + pitchStep);

      // Forward flight
      const bearingRad = (bearing * Math.PI) / 180;
      map.setCenter([
        center.lng + Math.sin(bearingRad) * frameAdjustedSpeed,
        center.lat + Math.cos(bearingRad) * frameAdjustedSpeed,
      ]);

      lastTime = currentTime;
      randomPathFrameRef.current = requestAnimationFrame(randomPathFly);
    };

    randomPathStartTimeRef.current = performance.now();
    randomHeadingChangeTimeRef.current = 0;
    randomPathFrameRef.current = requestAnimationFrame(randomPathFly);
    return () => {
      if (randomPathFrameRef.current !== undefined) cancelAnimationFrame(randomPathFrameRef.current);
    };
  }, [map, isLoaded, isRandomPathFlight]);

  const toggleAutoRotate = () => {
    if (isAutoOrbiting) setIsAutoOrbiting(false);
    if (isFlightMode) setIsFlightMode(false);
    if (isRandomPathFlight) setIsRandomPathFlight(false);
    setIsAutoRotating(!isAutoRotating);
  };

  const toggleAutoOrbit = () => {
    if (isAutoRotating) setIsAutoRotating(false);
    if (isFlightMode) setIsFlightMode(false);
    if (isRandomPathFlight) setIsRandomPathFlight(false);

    if (isAutoOrbiting) {
      setOrbitCenter(null);
      orbitStartAngleRef.current = null;
      orbitRadiusRef.current = 0.05;
      orbitSpeedRef.current = (2 * Math.PI) / 60;
      orbitDirectionRef.current = 1;
    } else if (map) {
      const bearing = map.getBearing();
      orbitStartAngleRef.current = -(bearing + 90) * Math.PI / 180;
      // If target location is set, orbit that; otherwise orbit current view center
      const orbitTarget = targetLocation || [map.getCenter().lng, map.getCenter().lat] as [number, number];
      setOrbitCenter(orbitTarget);
    }
    setIsAutoOrbiting(!isAutoOrbiting);
  };

  const toggleFlightMode = () => {
    if (!map) return;
    if (!isFlightMode) {
      if (isAutoRotating) setIsAutoRotating(false);
      if (isAutoOrbiting) setIsAutoOrbiting(false);
      if (isRandomPathFlight) setIsRandomPathFlight(false);
      animateTo({ pitch: 75, zoom: 11, duration: 3000 });
      setIsFlightMode(true);
    } else {
      animateTo({ pitch: 60, zoom: map.getZoom(), duration: 3000 });
      setIsFlightMode(false);
    }
  };

  const toggleRandomPathFlight = () => {
    if (!map) return;
    if (!isRandomPathFlight) {
      if (isAutoRotating) setIsAutoRotating(false);
      if (isAutoOrbiting) setIsAutoOrbiting(false);
      if (isFlightMode) setIsFlightMode(false);
      animateTo({ pitch: 70, zoom: 11, duration: 3000 });
      randomHeadingTargetRef.current = map.getBearing();
      randomHeadingChangeTimeRef.current = 0;
      setIsRandomPathFlight(true);
    } else {
      animateTo({ pitch: 60, zoom: map.getZoom(), duration: 3000 });
      setIsRandomPathFlight(false);
    }
  };

  const resetBearing = () => {
    if (map) map.easeTo({ bearing: 0, duration: 1500, easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
  };

  // Flight mode control handlers
  const adjustFlightHeading = (delta: number) => {
    flightHeadingDeltaRef.current = delta;
  };

  const adjustFlightAltitude = (delta: number) => {
    flightAltitudeDeltaRef.current = delta;
  };

  const adjustFlightPitch = (target: number) => {
    flightPitchTargetRef.current = target;
  };

  const stopFlightInput = () => {
    flightHeadingDeltaRef.current = 0;
    flightAltitudeDeltaRef.current = 0;
  };

  // Quick magnification switchers
  const toggleMagnification = (level: '5x' | '10x') => {
    if (!map) return;

    if (activeMagnification === level) {
      // Toggle off - return to base zoom
      animateTo({ zoom: baseZoomRef, duration: 1500 });
      setActiveMagnification(null);
    } else {
      // Toggle on - store current zoom if not already set, then zoom in
      if (activeMagnification === null) {
        setBaseZoomRef(currentZoom);
      }
      const zoomMultiplier = level === '5x' ? 5 : 10;
      const targetZoom = (activeMagnification === null ? currentZoom : baseZoomRef) + Math.log2(zoomMultiplier);
      animateTo({ zoom: targetZoom, duration: 1500 });
      setActiveMagnification(level);
    }
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
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleRandomPathFlight}
            title="Random path autonomous flight"
            className={cn(
              'w-full h-7 mt-2 transition-all border text-xs',
              isRandomPathFlight
                ? 'bg-cyan-600/60 border-cyan-400/60 text-white'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
            )}
          >
            <Compass className="size-3 mr-1" />
            Random Path
          </Button>
        </div>

        {isRandomPathFlight ? (
          <>
            {/* Random Path Flight Status */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Autonomous Status</div>
              <div className="text-xs text-cyan-300 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Navigation Active</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  • Random heading every 3-7s
                </div>
                <div className="text-[10px] text-slate-400">
                  • Smooth altitude variation
                </div>
                <div className="text-[10px] text-slate-400">
                  • Dynamic pitch oscillation
                </div>
              </div>
            </div>

            {/* Random Path Cannot Be Manually Controlled */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Info</div>
              <p className="text-xs text-slate-400">
                Random path flight is fully autonomous. Aircraft will continue on random route. Click Random Path again to return to manual control.
              </p>
            </div>
          </>
        ) : isFlightMode ? (
          <>
            {/* Flight Heading Controls */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Heading</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={() => adjustFlightHeading(-0.5)}
                  onMouseUp={stopFlightInput}
                  onTouchStart={() => adjustFlightHeading(-0.5)}
                  onTouchEnd={stopFlightInput}
                  onMouseLeave={stopFlightInput}
                  className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
                  title="Turn left"
                >
                  <ChevronLeft className="size-3 mr-1" /> Left
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={() => adjustFlightHeading(0.5)}
                  onMouseUp={stopFlightInput}
                  onTouchStart={() => adjustFlightHeading(0.5)}
                  onTouchEnd={stopFlightInput}
                  onMouseLeave={stopFlightInput}
                  className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
                  title="Turn right"
                >
                  Right <ChevronRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Flight Altitude Controls */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Climb/Descend</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={() => adjustFlightAltitude(0.05)}
                  onMouseUp={stopFlightInput}
                  onTouchStart={() => adjustFlightAltitude(0.05)}
                  onTouchEnd={stopFlightInput}
                  onMouseLeave={stopFlightInput}
                  className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
                  title="Climb"
                >
                  <Plus className="size-3 mr-1" /> Climb
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={() => adjustFlightAltitude(-0.05)}
                  onMouseUp={stopFlightInput}
                  onTouchStart={() => adjustFlightAltitude(-0.05)}
                  onTouchEnd={stopFlightInput}
                  onMouseLeave={stopFlightInput}
                  className="flex-1 h-7 text-xs bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50"
                  title="Descend"
                >
                  <Minus className="size-3 mr-1" /> Desc
                </Button>
              </div>
            </div>

            {/* Flight Pitch Controls */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Pitch</div>
              <div className="flex gap-1 flex-wrap">
                {[0, 15, 30, 45, 60, 75].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant="ghost"
                    onClick={() => adjustFlightPitch(p)}
                    className={cn(
                      "text-xs px-2 h-6 border",
                      Math.abs(flightPitchTargetRef.current - p) < 5
                        ? "bg-cyan-600/40 border-cyan-500/50 text-cyan-300"
                        : "bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border-slate-700/50"
                    )}
                    title={`Set pitch to ${p}°`}
                  >
                    {p}°
                  </Button>
                ))}
              </div>
            </div>

            {/* Flight Quick View Magnification */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Quick Views</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMagnification('5x')}
                  className={cn(
                    'flex-1 h-7 text-xs font-bold transition-all border',
                    activeMagnification === '5x'
                      ? 'bg-amber-600/60 border-amber-400/60 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                  )}
                  title="5x magnification snap"
                >
                  5X
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMagnification('10x')}
                  className={cn(
                    'flex-1 h-7 text-xs font-bold transition-all border',
                    activeMagnification === '10x'
                      ? 'bg-red-600/60 border-red-400/60 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                  )}
                  title="10x magnification snap"
                >
                  10X
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Standard Navigation (non-flight) */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Navigation</div>
              <div className="flex items-center justify-between">
                <DirectionPad onPan={(dir) => panDirection(dir as 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW')} />
                <MiniCompass bearing={currentBearing} onReset={resetBearing} />
              </div>
            </div>

            {/* Standard Altitude Controls */}
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

            {/* Quick View Magnification */}
            <div className="p-3 border-b border-slate-800/50">
              <div className="text-[9px] text-slate-500 uppercase mb-2">Quick Views</div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMagnification('5x')}
                  className={cn(
                    'flex-1 h-7 text-xs font-bold transition-all border',
                    activeMagnification === '5x'
                      ? 'bg-amber-600/60 border-amber-400/60 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                  )}
                  title="5x magnification snap"
                >
                  5X
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMagnification('10x')}
                  className={cn(
                    'flex-1 h-7 text-xs font-bold transition-all border',
                    activeMagnification === '10x'
                      ? 'bg-red-600/60 border-red-400/60 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                  )}
                  title="10x magnification snap"
                >
                  10X
                </Button>
              </div>
            </div>

            {/* Standard Pitch Controls */}
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
          </>
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
