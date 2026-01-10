// UserLocationLayer - Clean implementation of user location tracking
// Single source of truth for geolocation with smooth animations

import { useEffect, useState, useRef, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMapStore, useMapProviderStore } from '@/stores';
import { useFlightStore } from '@/stores/flightStore';
import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import { Navigation, NavigationOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { toast } from 'sonner';

interface LocationState {
    coords: [number, number] | null;
    accuracy: number;
    heading: number | null;
}

type TrackingState = 'off' | 'pending' | 'active';
type MarkerInstance = maplibregl.Marker | mapboxgl.Marker;

/**
 * User location layer with clean state management
 * - Green pulsing marker with heading cone
 * - Single button with 3 states: off, pending, active
 * - Smooth flyTo animations
 */
export function UserLocationLayer() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);
    const provider = useMapProviderStore((state) => state.provider);

    const [location, setLocation] = useState<LocationState>({
        coords: null,
        accuracy: 0,
        heading: null
    });
    const [trackingState, setTrackingState] = useState<TrackingState>('off');
    const [permissionDenied, setPermissionDenied] = useState(false);

    const watchIdRef = useRef<number | null>(null);
    const markerRef = useRef<MarkerInstance | null>(null);
    const isFirstLocationRef = useRef(true);

    // Create marker element
    const createMarkerElement = useCallback(() => {
        const container = document.createElement('div');
        container.className = 'user-location-marker';
        container.innerHTML = `
            <div class="location-pulse"></div>
            <div class="location-accuracy"></div>
            <div class="location-heading"></div>
            <div class="location-dot"></div>
        `;
        return container;
    }, []);

    // Update heading cone rotation
    const updateHeading = useCallback((heading: number | null) => {
        if (!markerRef.current) return;
        const el = markerRef.current.getElement();
        const headingEl = el?.querySelector('.location-heading') as HTMLElement;
        if (headingEl) {
            if (heading !== null) {
                headingEl.style.transform = `rotate(${heading}deg)`;
                headingEl.style.opacity = '1';
            } else {
                headingEl.style.opacity = '0';
            }
        }
    }, []);

    // Smooth flyTo location
    const flyToLocation = useCallback((coords: [number, number], isFirst: boolean = false) => {
        if (!map) return;

        const currentZoom = map.getZoom();
        const targetZoom = isFirst ? 16 : Math.max(currentZoom, 15);

        // Add padding if flight dashboard is open (420px wide on right)
        const dashboardOpen = useFlightStore.getState().dashboardOpen;
        const padding = dashboardOpen ? { right: 210, left: 0, top: 0, bottom: 0 } : undefined;

        map.flyTo({
            center: coords,
            zoom: targetZoom,
            pitch: 60,
            duration: isFirst ? 2000 : 1000,
            essential: true,
            padding
        });
    }, [map]);

    // Start location tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return;
        }

        setTrackingState('pending');
        setPermissionDenied(false);

        const options: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const successHandler = (position: GeolocationPosition) => {
            const { longitude, latitude, accuracy, heading } = position.coords;
            const coords: [number, number] = [longitude, latitude];

            setLocation({
                coords,
                accuracy,
                heading
            });

            setTrackingState('active');

            // Fly to location on first fix or when re-enabling
            if (isFirstLocationRef.current) {
                flyToLocation(coords, true);
                isFirstLocationRef.current = false;
                toast.success('Location found');
            }
        };

        const errorHandler = (error: GeolocationPositionError) => {
            console.error('Geolocation error:', error);
            setTrackingState('off');

            if (error.code === error.PERMISSION_DENIED) {
                setPermissionDenied(true);
                toast.error('Location permission denied');
            } else if (error.code === error.TIMEOUT) {
                toast.error('Location request timed out');
            } else {
                toast.error('Unable to get location');
            }
        };

        const id = navigator.geolocation.watchPosition(successHandler, errorHandler, options);
        watchIdRef.current = id;
    }, [flyToLocation]);

    // Stop location tracking
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setTrackingState('off');
        isFirstLocationRef.current = true;

        // Remove marker
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        toast.info('Location tracking disabled');
    }, []);

    // Handle button interactions
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const pointerDownRef = useRef(false);
    const ignoreClickRef = useRef(false);

    const triggerPrimaryAction = useCallback(() => {
        if (trackingState === 'off') {
            startTracking();
        } else if (trackingState === 'active' && location.coords) {
            flyToLocation(location.coords, false);
            toast.info('Centered on location');
        }
    }, [trackingState, location.coords, startTracking, flyToLocation]);

    const handlePointerDown = useCallback((event: ReactPointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        pointerDownRef.current = true;
        setIsLongPressing(false);
        longPressTimerRef.current = setTimeout(() => {
            setIsLongPressing(true);
            if (trackingState === 'active') {
                stopTracking();
            }
        }, 500);
    }, [trackingState, stopTracking]);

    const handlePointerUp = useCallback(() => {
        if (!pointerDownRef.current) return;
        pointerDownRef.current = false;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (!isLongPressing) {
            ignoreClickRef.current = true;
            triggerPrimaryAction();
            setTimeout(() => {
                ignoreClickRef.current = false;
            }, 0);
        }

        setIsLongPressing(false);
    }, [isLongPressing, triggerPrimaryAction]);

    const handlePointerLeave = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        pointerDownRef.current = false;
        setIsLongPressing(false);
    }, []);

    // Listen for device orientation (compass heading)
    useEffect(() => {
        if (trackingState !== 'active') return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha !== null) {
                let heading = event.alpha;

                // iOS uses webkitCompassHeading
                if ((event as any).webkitCompassHeading !== undefined) {
                    heading = (event as any).webkitCompassHeading;
                } else {
                    // Android reverses alpha
                    heading = 360 - heading;
                }

                setLocation(prev => ({ ...prev, heading }));
                updateHeading(heading);
            }
        };

        // Request permission on iOS 13+
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation, true);
        };
    }, [trackingState, updateHeading]);

    // Update marker on map
    useEffect(() => {
        if (!map || !isLoaded || !location.coords || trackingState === 'off') {
            return;
        }

        if (!markerRef.current) {
            // Create new marker
            const el = createMarkerElement();
            const MarkerClass = provider === 'mapbox' ? mapboxgl.Marker : maplibregl.Marker;
            markerRef.current = new MarkerClass({
                element: el,
                anchor: 'center'
            })
                .setLngLat(location.coords)
                .addTo(map);
        } else {
            // Update position smoothly
            markerRef.current.setLngLat(location.coords);
        }

        // Update heading
        updateHeading(location.heading);

        // Update accuracy circle
        const el = markerRef.current.getElement();
        const accuracyEl = el?.querySelector('.location-accuracy') as HTMLElement;
        if (accuracyEl) {
            const zoom = map.getZoom();
            const metersPerPixel = 40075016.686 * Math.abs(Math.cos(location.coords[1] * Math.PI / 180)) / Math.pow(2, zoom + 8);
            const radiusPixels = Math.min(200, Math.max(20, location.accuracy / metersPerPixel));
            accuracyEl.style.width = `${radiusPixels * 2}px`;
            accuracyEl.style.height = `${radiusPixels * 2}px`;
        }
    }, [map, isLoaded, location, trackingState, createMarkerElement, updateHeading, provider]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    // Render button
    const getButtonState = () => {
        if (trackingState === 'pending') {
            return {
                icon: <Loader2 className="w-5 h-5 animate-spin" />,
                className: 'bg-blue-600 hover:bg-blue-700 text-white',
                title: 'Getting location...'
            };
        }
        if (trackingState === 'active') {
            return {
                icon: <Navigation className="w-5 h-5" />,
                className: 'bg-green-600 hover:bg-green-700 text-white',
                title: 'Recenter on my location'
            };
        }
        return {
            icon: <NavigationOff className="w-5 h-5" />,
            className: 'bg-white/90 hover:bg-white text-gray-800',
            title: permissionDenied ? 'Location permission denied' : 'Show my location'
        };
    };

    const buttonState = getButtonState();

    return (
        <Button
            size="icon"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerLeave}
            onPointerLeave={handlePointerLeave}
            onClick={() => {
                if (ignoreClickRef.current) return;
                triggerPrimaryAction();
            }}
            disabled={trackingState === 'pending' || permissionDenied}
            className={`
                fixed bottom-24 right-4
                w-12 h-12 rounded-2xl
                shadow-xl border-0
                transition-all duration-300
                ${buttonState.className}
                ${(trackingState === 'pending' || permissionDenied) ? 'opacity-50 cursor-not-allowed' : ''}
                ${isLongPressing ? 'scale-95' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
            title={buttonState.title}
        >
            {buttonState.icon}
        </Button>
    );
}

export default UserLocationLayer;
