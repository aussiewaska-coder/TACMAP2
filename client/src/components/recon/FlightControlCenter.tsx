import { useState, useEffect, useRef } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import type { MapMouseEvent } from '@maptiler/sdk';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// New components
import { FlightModeSelector } from './FlightControlCenter/FlightModeSelector';
import { FlightStatusDisplay } from './FlightControlCenter/FlightStatusDisplay';
import { FlightWarnings } from './FlightControlCenter/FlightWarnings';
import { BookmarkManager } from './FlightControlCenter/bookmarks/BookmarkManager';
import { FlightPathLayer } from './FlightControlCenter/pathTrail/FlightPathLayer';
import { usePathTracker } from './FlightControlCenter/pathTrail/usePathTracker';
import { useFlightKeyboard } from './FlightControlCenter/keyboard/useFlightKeyboard';

// Mode-specific controls
import { FlightModeControls } from './FlightControlCenter/modes/FlightModeControls';
import { StandardNavControls } from './FlightControlCenter/modes/StandardNavControls';
import { AutoOrbitControls } from './FlightControlCenter/modes/AutoOrbitControls';
import { AutoRotateControls } from './FlightControlCenter/modes/AutoRotateControls';
import { RandomPathControls } from './FlightControlCenter/modes/RandomPathControls';

type FlightMode = 'auto-rotate' | 'auto-orbit' | 'flight' | 'random-path' | 'standard';

export function FlightControlCenter() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { animateTo, panDirection, adjustZoom, setPitch } = useCameraAnimation();

  // Flight control store state
  const { activeMode, setActiveMode, sidebarCollapsed, setSidebarCollapsed } = useFlightControlStore();

  // Local flight state
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isAutoOrbiting, setIsAutoOrbiting] = useState(false);
  const [isFlightMode, setIsFlightMode] = useState(false);
  const [isRandomPathFlight, setIsRandomPathFlight] = useState(false);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | null>(null);
  const [targetLocation, setTargetLocation] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);

  // Store magnification in local state (synced with Zustand for persistence)
  const { activeMagnification, setMagnification, baseZoom, setBaseZoom } = useFlightControlStore();

  // Animation refs
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
  const targetArrivalDistanceRef = useRef(0.005);

  // Flight mode controls
  const flightSpeedRef = useRef(0.0005);
  const flightHeadingDeltaRef = useRef(0);
  const flightAltitudeDeltaRef = useRef(0);
  const flightPitchTargetRef = useRef(75);

  // Random path flight
  const randomHeadingTargetRef = useRef(Math.random() * 360);
  const randomHeadingChangeTimeRef = useRef(0);
  const randomPathStartTimeRef = useRef(0);
  const flightArrivalTriggeredRef = useRef(false);

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
    return () => {
      map.off('move', update);
    };
  }, [map, isLoaded]);

  // Reset flight arrival trigger when target location changes
  useEffect(() => {
    flightArrivalTriggeredRef.current = false;
  }, [targetLocation]);

  // Orbit target marker
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (orbitCenter && isAutoOrbiting) {
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

  // Target marker
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (targetLocation) {
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

  // Double-tap in orbit mode
  useEffect(() => {
    if (!map || !isLoaded || !isAutoOrbiting) return;

    const handleDoubleClick = (e: MapMouseEvent) => {
      const targetLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const targetZoom = 12.5;

      setIsAutoOrbiting(false);

      const startCenter = map.getCenter();
      const startZoom = map.getZoom();
      const startPitch = map.getPitch();
      const startBearing = map.getBearing();
      const startTime = performance.now();
      const duration = 3500;

      const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const animateFly = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

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
          orbitStartAngleRef.current = -(startBearing + 90) * (Math.PI / 180);
          setOrbitCenter(targetLngLat);
          setIsAutoOrbiting(true);
        }
      };

      requestAnimationFrame(animateFly);
    };

    map.on('dblclick', handleDoubleClick);
    return () => {
      map.off('dblclick', handleDoubleClick);
    };
  }, [map, isLoaded, isAutoOrbiting]);

  // Command-click targeting
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleCommandClick = (e: MapMouseEvent) => {
      if (!(e.originalEvent as any).metaKey && !(e.originalEvent as any).ctrlKey) return;

      const clickedLocation: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setTargetLocation(clickedLocation);

      const currentCenter = map.getCenter();
      const currentPos: [number, number] = [currentCenter.lng, currentCenter.lat];
      const currentBearing = map.getBearing();

      const dx = clickedLocation[0] - currentPos[0];
      const dy = clickedLocation[1] - currentPos[1];
      const bearingToTarget = (Math.atan2(dx, dy) * 180) / Math.PI;

      if (isFlightMode) {
        flightHeadingDeltaRef.current = 0;
        const bearingDelta = bearingToTarget - currentBearing;
        const normalizedDelta =
          bearingDelta > 180 ? bearingDelta - 360 : bearingDelta < -180 ? bearingDelta + 360 : bearingDelta;

        const startBearing = currentBearing;
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
        const startCenter = map.getCenter();
        const startZoom = map.getZoom();
        const startPitch = map.getPitch();
        const orbitBearing = map.getBearing();
        const startTime = performance.now();
        const duration = 3500;

        const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
            orbitStartAngleRef.current = -(orbitBearing + 90) * (Math.PI / 180);
            setOrbitCenter(clickedLocation);
          }
        };

        requestAnimationFrame(animateFly);
      }
    };

    map.on('click', handleCommandClick);
    return () => {
      map.off('click', handleCommandClick);
    };
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

  // Flight mode
  useEffect(() => {
    if (!map || !isLoaded || !isFlightMode) return;
    let lastTime = performance.now();

    const fly = (currentTime: number) => {
      if (!map || !isFlightMode) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeedRef.current * (deltaTime / 16.67);

      const bearing = map.getBearing();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();

      if (Math.abs(flightHeadingDeltaRef.current) > 0.01) {
        const newBearing = bearing + flightHeadingDeltaRef.current;
        map.setBearing(newBearing);
      }

      if (Math.abs(flightAltitudeDeltaRef.current) > 0.01) {
        const newZoom = Math.max(5, Math.min(24, zoom + flightAltitudeDeltaRef.current));
        map.setZoom(newZoom);
      }

      if (Math.abs(flightPitchTargetRef.current - pitch) > 0.5) {
        const newPitch = pitch + (flightPitchTargetRef.current - pitch) * 0.05;
        map.setPitch(newPitch);
      }

      const bearingRad = (bearing * Math.PI) / 180;
      const newCenter: [number, number] = [
        center.lng + Math.sin(bearingRad) * frameAdjustedSpeed,
        center.lat + Math.cos(bearingRad) * frameAdjustedSpeed,
      ];
      map.setCenter(newCenter);

      if (targetLocation && !flightArrivalTriggeredRef.current) {
        const dx = targetLocation[0] - newCenter[0];
        const dy = targetLocation[1] - newCenter[1];
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        const arrivalThreshold = 0.01;

        if (distanceToTarget < arrivalThreshold) {
          flightArrivalTriggeredRef.current = true;

          const orbitPitch = 60;
          const orbitZoom = zoom - 1;

          animateTo({
            center: targetLocation,
            zoom: orbitZoom,
            pitch: orbitPitch,
            duration: 3000,
          });

          setTimeout(() => {
            if (isFlightMode) {
              setIsFlightMode(false);
              orbitStartAngleRef.current = -(bearing + 90) * (Math.PI / 180);
              setOrbitCenter(targetLocation);
              setIsAutoOrbiting(true);
              setActiveMode('auto-orbit');
            }
            flightArrivalTriggeredRef.current = false;
          }, 3000);

          return;
        }
      }

      lastTime = currentTime;
      flightFrameRef.current = requestAnimationFrame(fly);
    };

    flightFrameRef.current = requestAnimationFrame(fly);
    return () => {
      if (flightFrameRef.current !== undefined) cancelAnimationFrame(flightFrameRef.current);
    };
  }, [map, isLoaded, isFlightMode, targetLocation, animateTo, isAutoOrbiting]);

  // Random path flight
  useEffect(() => {
    if (!map || !isLoaded || !isRandomPathFlight) return;
    let lastTime = performance.now();

    const randomPathFly = (currentTime: number) => {
      if (!map || !isRandomPathFlight) return;
      const deltaTime = currentTime - lastTime;
      const frameAdjustedSpeed = flightSpeedRef.current * (deltaTime / 16.67);

      const bearing = map.getBearing();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();

      if (randomHeadingChangeTimeRef.current === 0) {
        randomHeadingChangeTimeRef.current = currentTime + (3000 + Math.random() * 4000);
        randomHeadingTargetRef.current = Math.random() * 360;
      }

      if (currentTime >= randomHeadingChangeTimeRef.current) {
        randomHeadingChangeTimeRef.current = 0;
      }

      let headingDelta = randomHeadingTargetRef.current - bearing;
      while (headingDelta > 180) headingDelta -= 360;
      while (headingDelta < -180) headingDelta += 360;
      const headingStep = headingDelta * 0.02;
      map.setBearing(bearing + headingStep);

      if (Math.random() < 0.01 && zoom > 5 && zoom < 18) {
        const altitudeDelta = (Math.random() - 0.5) * 0.02;
        map.setZoom(Math.max(5, Math.min(18, zoom + altitudeDelta)));
      }

      const targetPitch = 65 + Math.sin(currentTime / 2000) * 10;
      const pitchStep = (targetPitch - pitch) * 0.05;
      map.setPitch(pitch + pitchStep);

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

  // Mode switching functions
  const handleModeChange = (mode: FlightMode) => {
    setActiveMode(mode);

    // Stop all current modes
    if (isAutoRotating) setIsAutoRotating(false);
    if (isAutoOrbiting) setIsAutoOrbiting(false);
    if (isFlightMode) setIsFlightMode(false);
    if (isRandomPathFlight) setIsRandomPathFlight(false);

    // Start new mode
    switch (mode) {
      case 'auto-rotate':
        // Animate to top-down bird's eye view
        if (map) {
          const center = targetLocation || [map.getCenter().lng, map.getCenter().lat];
          animateTo({
            center: center as [number, number],
            pitch: 0,  // Look straight down
            bearing: 0,
            zoom: 13,
            duration: 2000,
          });
        }
        setIsAutoRotating(false);  // Don't rotate, just show top-down
        break;
      case 'auto-orbit':
        if (map) {
          const bearing = map.getBearing();
          orbitStartAngleRef.current = -(bearing + 90) * (Math.PI / 180);
          const orbitTarget = targetLocation || ([map.getCenter().lng, map.getCenter().lat] as [number, number]);
          setOrbitCenter(orbitTarget);
        }
        setIsAutoOrbiting(true);
        break;
      case 'flight':
        if (map) {
          flightArrivalTriggeredRef.current = false;
          animateTo({ pitch: 75, zoom: 11, duration: 3000 });
        }
        setIsFlightMode(true);
        break;
      case 'random-path':
        if (map) {
          animateTo({ pitch: 70, zoom: 11, duration: 3000 });
          randomHeadingTargetRef.current = map.getBearing();
          randomHeadingChangeTimeRef.current = 0;
        }
        setIsRandomPathFlight(true);
        break;
      case 'standard':
        if (map && isFlightMode) {
          animateTo({ pitch: 60, zoom: map.getZoom(), duration: 3000 });
          flightArrivalTriggeredRef.current = false;
        }
        break;
    }
  };

  // Flight controls handlers
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

  const resetBearing = () => {
    if (map) {
      map.easeTo({
        bearing: 0,
        duration: 1500,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      });
    }
  };

  const toggleMagnification = (level: '5x' | '10x') => {
    if (!map) return;

    if (activeMagnification === level) {
      animateTo({ zoom: baseZoom, duration: 1500 });
      setMagnification(null);
    } else {
      if (activeMagnification === null) {
        setBaseZoom(currentZoom);
      }
      const zoomMultiplier = level === '5x' ? 5 : 10;
      const targetZoom = (activeMagnification === null ? currentZoom : baseZoom) + Math.log2(zoomMultiplier);
      animateTo({ zoom: targetZoom, duration: 1500 });
      setMagnification(level);
    }
  };

  // Setup keyboard shortcuts
  useFlightKeyboard({
    activeMode,
    onModeChange: handleModeChange,
    flightControls: {
      adjustHeading: adjustFlightHeading,
      adjustAltitude: adjustFlightAltitude,
      stopInput: stopFlightInput,
    },
    navControls: {
      panDirection,
      adjustZoom,
      setPitch,
    },
    onHelp: () => {
      // Could expand to show help panel
    },
    onResetBearing: resetBearing,
  });

  // Setup flight path tracking
  usePathTracker(activeMode);

  if (!isLoaded) return null;

  return (
    <>
      {/* Flight path visualization layer */}
      <FlightPathLayer />

      {/* Collapse/Expand Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={cn(
          'absolute top-4 z-20 bg-slate-950/90 border border-cyan-500/40 rounded-l-lg p-3 transition-all hover:bg-slate-900/90',
          sidebarCollapsed ? 'right-0' : 'right-[320px]'
        )}
      >
        {sidebarCollapsed ? (
          <ChevronLeft className="w-4 h-4 text-cyan-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        )}
      </button>

      {/* Main Sidebar */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-[320px] bg-slate-950/95 backdrop-blur-md border-l border-cyan-500/30 z-10 transition-transform duration-300 flex flex-col',
          sidebarCollapsed && 'translate-x-full',
          'overflow-y-auto'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex-shrink-0">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Flight Control</div>
        </div>

        {/* Telemetry Display */}
        <FlightStatusDisplay />

        {/* Warnings (if any) */}
        <FlightWarnings />

        {/* Mode Selector */}
        <FlightModeSelector
          activeMode={activeMode}
          onModeChange={handleModeChange}
          isAutoRotating={isAutoRotating}
        />

        {/* Mode-specific Controls */}
        {activeMode === 'flight' && (
          <FlightModeControls
            currentPitch={currentPitch}
            flightPitchTarget={flightPitchTargetRef.current}
            activeMagnification={activeMagnification}
            onHeadingLeft={() => adjustFlightHeading(-0.5)}
            onHeadingRight={() => adjustFlightHeading(0.5)}
            onAltitudeUp={() => adjustFlightAltitude(0.05)}
            onAltitudeDown={() => adjustFlightAltitude(-0.05)}
            onPitchSet={adjustFlightPitch}
            onMagnificationChange={(mag) => {
              if (mag) toggleMagnification(mag);
              else setMagnification(null);
            }}
            onInputStop={stopFlightInput}
          />
        )}

        {activeMode === 'standard' && (
          <StandardNavControls
            currentBearing={currentBearing}
            currentPitch={currentPitch}
            activeMagnification={activeMagnification}
            onPan={(dir) => panDirection(dir as 'N' | 'S' | 'E' | 'W')}
            onResetBearing={resetBearing}
            onZoomIn={() => adjustZoom(1)}
            onZoomOut={() => adjustZoom(-1)}
            onPitchSet={setPitch}
            onMagnificationChange={(mag) => {
              if (mag) toggleMagnification(mag);
              else setMagnification(null);
            }}
          />
        )}

        {activeMode === 'auto-orbit' && (
          <AutoOrbitControls
            orbitCenter={orbitCenter}
            orbitRadius={orbitRadiusRef.current}
            orbitSpeed={orbitSpeedRef.current}
          />
        )}

        {activeMode === 'auto-rotate' && <AutoRotateControls />}

        {activeMode === 'random-path' && <RandomPathControls />}

        {/* Bookmarks */}
        <BookmarkManager />

        {/* Notifications Area */}
        <div className="flex-1 p-4 overflow-hidden">
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
                  toast: '!relative !top-0 !right-0 !transform-none !w-full group toast group-[.toaster]:bg-slate-900/90 group-[.toaster]:text-cyan-400 group-[.toaster]:border-cyan-500/30 group-[.toaster]:shadow-lg group-[.toaster]:font-mono group-[.toaster]:text-xs',
                  description:
                    'group-[.toast]:text-cyan-300/70 group-[.toast]:font-mono group-[.toast]:text-[10px]',
                  closeButton:
                    'group-[.toast]:bg-slate-800/50 group-[.toast]:border-cyan-500/20 group-[.toast]:text-cyan-400',
                  error: 'group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/30',
                  success: 'group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/30',
                  warning: 'group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-500/30',
                },
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default FlightControlCenter;
