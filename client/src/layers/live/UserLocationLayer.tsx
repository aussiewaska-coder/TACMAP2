// UserLocationLayer - Shows user's current location with pulsing green marker and heading direction
// Uses browser Geolocation API and DeviceOrientation for heading

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';

interface LocationState {
    coords: [number, number] | null;
    accuracy: number;
    heading: number | null;
    timestamp: number;
}

/**
 * User location layer with:
 * - Green pulsing dot for current position
 * - White border for visibility
 * - Direction cone showing heading (when available)
 * - Accuracy circle
 */
export function UserLocationLayer() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const [location, setLocation] = useState<LocationState>({
        coords: null,
        accuracy: 0,
        heading: null,
        timestamp: 0
    });
    const [enabled, setEnabled] = useState(true);
    const [watchId, setWatchId] = useState<number | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const headingRef = useRef<number | null>(null);

    // Create custom marker element
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

    // Update marker rotation for heading
    const updateHeading = useCallback((heading: number | null) => {
        if (!markerRef.current) return;
        const el = markerRef.current.getElement();
        const headingEl = el?.querySelector('.location-heading') as HTMLElement;
        if (headingEl && heading !== null) {
            headingEl.style.transform = `rotate(${heading}deg)`;
            headingEl.style.opacity = '1';
        } else if (headingEl) {
            headingEl.style.opacity = '0';
        }
    }, []);

    // Start watching position
    useEffect(() => {
        if (!enabled || !navigator.geolocation) return;

        const options: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };

        const successHandler = (position: GeolocationPosition) => {
            const { longitude, latitude, accuracy, heading } = position.coords;
            setLocation({
                coords: [longitude, latitude],
                accuracy: accuracy,
                heading: heading,
                timestamp: position.timestamp
            });
            headingRef.current = heading;
        };

        const errorHandler = (error: GeolocationPositionError) => {
            console.warn('Geolocation error:', error.message);
        };

        const id = navigator.geolocation.watchPosition(successHandler, errorHandler, options);
        setWatchId(id);

        return () => {
            if (id !== null) {
                navigator.geolocation.clearWatch(id);
            }
        };
    }, [enabled]);

    // Listen for device orientation (heading/compass)
    useEffect(() => {
        if (!enabled) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            // alpha is the compass direction the device is facing
            if (event.alpha !== null) {
                // Adjust for device orientation
                let heading = event.alpha;

                // On iOS, we need to use webkitCompassHeading if available
                if ((event as any).webkitCompassHeading !== undefined) {
                    heading = (event as any).webkitCompassHeading;
                } else {
                    // On Android, alpha is reversed from compass heading
                    heading = 360 - heading;
                }

                headingRef.current = heading;
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
    }, [enabled, updateHeading]);

    // Create/update marker on map
    useEffect(() => {
        if (!map || !isLoaded || !location.coords) return;

        if (!markerRef.current) {
            // Create new marker
            const el = createMarkerElement();
            markerRef.current = new maplibregl.Marker({
                element: el,
                anchor: 'center'
            })
                .setLngLat(location.coords)
                .addTo(map);
        } else {
            // Update existing marker position
            markerRef.current.setLngLat(location.coords);
        }

        // Update heading if available
        updateHeading(location.heading ?? headingRef.current);

        // Update accuracy circle size (optional - could add a source/layer for this)
        const el = markerRef.current.getElement();
        const accuracyEl = el?.querySelector('.location-accuracy') as HTMLElement;
        if (accuracyEl && map.getZoom()) {
            // Scale accuracy circle based on zoom level
            const metersPerPixel = 40075016.686 * Math.abs(Math.cos(location.coords[1] * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
            const radiusPixels = Math.min(200, Math.max(20, location.accuracy / metersPerPixel));
            accuracyEl.style.width = `${radiusPixels * 2}px`;
            accuracyEl.style.height = `${radiusPixels * 2}px`;
        }

        return () => {
            // Cleanup on unmount
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
        };
    }, [map, isLoaded, location, createMarkerElement, updateHeading]);

    // Component doesn't render anything visible itself
    return null;
}

export default UserLocationLayer;
