// UserLocationLayer - Shows user's current location with pulsing green marker and heading direction
// Uses browser Geolocation API and DeviceOrientation for heading

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';
import { Navigation, NavigationOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';

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
 * - Location button to center map on user
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
    const [tracking, setTracking] = useState(false); // Auto-center on location updates
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

    // Center map on user location
    const centerOnLocation = useCallback(() => {
        if (!map || !location.coords) return;

        map.easeTo({
            center: location.coords,
            zoom: Math.max(map.getZoom(), 15), // Zoom in if too far out
            duration: 1000,
            pitch: 60
        });
    }, [map, location.coords]);

    // Toggle tracking mode
    const toggleTracking = useCallback(() => {
        if (!tracking && location.coords) {
            // Enabling tracking - center on location
            centerOnLocation();
        }
        setTracking(!tracking);
    }, [tracking, location.coords, centerOnLocation]);

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

    // Auto-center when tracking is enabled and location updates
    useEffect(() => {
        if (tracking && location.coords && map) {
            map.easeTo({
                center: location.coords,
                duration: 500
            });
        }
    }, [tracking, location.coords, map]);

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

        // Update accuracy circle size
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

    // Render location button
    return (
        <Button
            variant={tracking ? "default" : "outline"}
            size="icon"
            onClick={toggleTracking}
            disabled={!location.coords}
            className={`
                fixed bottom-24 right-4
                w-12 h-12 rounded-2xl
                shadow-xl
                transition-all duration-300
                ${tracking
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white/90 hover:bg-white text-gray-800'
                }
                ${!location.coords ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
            title={tracking ? "Stop following location" : "Center on my location"}
        >
            {tracking ? (
                <Navigation className="w-5 h-5" />
            ) : (
                <NavigationOff className="w-5 h-5" />
            )}
        </Button>
    );
}

export default UserLocationLayer;
