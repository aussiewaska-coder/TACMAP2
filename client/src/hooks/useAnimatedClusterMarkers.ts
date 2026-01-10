// AnimatedClusterMarkers - Custom animated cluster implementation
// Provides smooth marker animations when expanding/collapsing clusters
// Detects stationary enforcement positions (RBTs, speed cameras)

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { toast } from 'sonner';

interface MarkerData {
    id: string;
    coords: [number, number];
    properties: any;
}

interface ClusterMarker {
    marker: maplibregl.Marker;
    element: HTMLElement;
    coords: [number, number];
    count: number;
    children: MarkerData[];
}

interface StationaryPosition {
    coords: [number, number];
    reports: MarkerData[];
    count: number;
}

interface AnimatedClusterMarkersProps {
    map: maplibregl.Map | null;
    data: MarkerData[];
    enabled: boolean;
    clusterRadius?: number;
    maxZoom?: number;
}

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Detect stationary enforcement positions (RBTs, speed cameras)
// Groups reports within 100m and within 1 hour of each other
function detectStationaryPositions(points: MarkerData[]): { stationary: StationaryPosition[], mobile: MarkerData[] } {
    const stationary: StationaryPosition[] = [];
    const processed = new Set<string>();
    const mobile: MarkerData[] = [];

    const DISTANCE_THRESHOLD = 100; // meters
    const TIME_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

    points.forEach((point, i) => {
        if (processed.has(point.id)) return;

        const group: MarkerData[] = [point];
        processed.add(point.id);

        const pointTime = new Date(point.properties.timestamp).getTime();

        // Find nearby reports within time window
        for (let j = i + 1; j < points.length; j++) {
            const other = points[j];
            if (processed.has(other.id)) continue;

            const distance = calculateDistance(point.coords, other.coords);
            const otherTime = new Date(other.properties.timestamp).getTime();
            const timeDiff = Math.abs(pointTime - otherTime);

            if (distance <= DISTANCE_THRESHOLD && timeDiff <= TIME_THRESHOLD) {
                group.push(other);
                processed.add(other.id);
            }
        }

        // If 2+ reports in same location within time window, it's stationary
        if (group.length >= 2) {
            const avgLng = group.reduce((sum, p) => sum + p.coords[0], 0) / group.length;
            const avgLat = group.reduce((sum, p) => sum + p.coords[1], 0) / group.length;

            stationary.push({
                coords: [avgLng, avgLat],
                reports: group,
                count: group.length
            });
        } else {
            mobile.push(point);
        }
    });

    return { stationary, mobile };
}

// Format time for display
function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Custom cluster implementation with animated marker expansion
 * When clicking a cluster at max zoom, markers animate out to their positions
 */
export function useAnimatedClusterMarkers({
    map,
    data,
    enabled,
    clusterRadius = 30,
    maxZoom = 14
}: AnimatedClusterMarkersProps) {
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const clustersRef = useRef<Map<string, ClusterMarker>>(new Map());
    const stationaryMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

    // Create pulsing stationary enforcement marker
    const createStationaryMarker = (position: StationaryPosition) => {
        const el = document.createElement('div');
        el.className = 'stationary-enforcement-marker';

        // Add pulsing animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-enforcement {
                0%, 100% {
                    box-shadow: 0 0 0 0 rgba(185, 28, 28, 0.7), 0 0 0 0 rgba(37, 99, 235, 0.7);
                }
                50% {
                    box-shadow: 0 0 0 4px rgba(185, 28, 28, 0), 0 0 0 6px rgba(37, 99, 235, 0);
                }
            }
        `;
        if (!document.head.querySelector('#enforcement-pulse-style')) {
            style.id = 'enforcement-pulse-style';
            document.head.appendChild(style);
        }

        el.innerHTML = `
            <div style="
                width: 10px;
                height: 10px;
                background: linear-gradient(135deg, #B91C1C 0%, #B91C1C 50%, #2563EB 50%, #2563EB 100%);
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                cursor: pointer;
                animation: pulse-enforcement 2s ease-in-out infinite;
            "></div>
        `;

        // Create popup content
        const times = position.reports
            .map(r => formatTime(r.properties.timestamp))
            .sort()
            .join(', ');

        const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: false,
            maxWidth: '300px'
        }).setHTML(`
            <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif;">
                <div style="font-weight: bold; color: #B91C1C; margin-bottom: 6px; font-size: 14px;">
                    ⚠️ STATIONARY ENFORCEMENT DETECTED
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                    <strong>Reports:</strong> ${position.count}
                </div>
                <div style="font-size: 11px; color: #888; margin-bottom: 6px;">
                    <strong>Times:</strong> ${times}
                </div>
                <div style="font-size: 11px; color: #B91C1C; font-weight: 500; border-top: 1px solid #eee; padding-top: 4px;">
                    Likely RBT or speed camera
                </div>
            </div>
        `);

        // Show popup on hover (desktop) or click (mobile)
        el.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                popup.addTo(map!);
            }
        });

        el.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                popup.remove();
            }
        });

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popup.isOpen()) {
                popup.remove();
            } else {
                popup.addTo(map!);
            }
        });

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(position.coords)
            .setPopup(popup);

        return marker;
    };

    // Create marker element
    const createMarkerElement = (isCluster: boolean, count?: number) => {
        const el = document.createElement('div');

        if (isCluster) {
            el.className = 'police-cluster-marker';
            el.innerHTML = `
                <div class="cluster-circle" style="
                    width: ${Math.min(30, 15 + (count || 0))}px;
                    height: ${Math.min(30, 15 + (count || 0))}px;
                    background: ${count! < 10 ? '#51bbd6' : count! < 50 ? '#f1f075' : '#f28cb1'};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #000;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    ${count}
                </div>
            `;
            el.addEventListener('mouseenter', () => {
                const circle = el.querySelector('.cluster-circle') as HTMLElement;
                if (circle) circle.style.transform = 'scale(1.1)';
            });
            el.addEventListener('mouseleave', () => {
                const circle = el.querySelector('.cluster-circle') as HTMLElement;
                if (circle) circle.style.transform = 'scale(1)';
            });
        } else {
            el.className = 'police-point-marker';
            el.innerHTML = `
                <div style="
                    width: 6px;
                    height: 6px;
                    background: #B91C1C;
                    border: 1px solid white;
                    border-radius: 50%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                "></div>
            `;
        }

        return el;
    };

    // Simple clustering algorithm
    const clusterPoints = (points: MarkerData[], zoom: number) => {
        if (zoom >= maxZoom) return { clusters: [], points };

        const clusters: ClusterMarker[] = [];
        const unclustered: MarkerData[] = [];
        const processed = new Set<string>();

        const pixelRadius = clusterRadius / Math.pow(2, zoom);

        points.forEach((point, i) => {
            if (processed.has(point.id)) return;

            const nearby: MarkerData[] = [point];
            processed.add(point.id);

            for (let j = i + 1; j < points.length; j++) {
                const other = points[j];
                if (processed.has(other.id)) continue;

                const dx = point.coords[0] - other.coords[0];
                const dy = point.coords[1] - other.coords[1];
                const distance = Math.sqrt(dx * dx + dy * dy) * 111000; // rough meters

                if (distance < pixelRadius) {
                    nearby.push(other);
                    processed.add(other.id);
                }
            }

            if (nearby.length > 1) {
                // Create cluster
                const avgLng = nearby.reduce((sum, p) => sum + p.coords[0], 0) / nearby.length;
                const avgLat = nearby.reduce((sum, p) => sum + p.coords[1], 0) / nearby.length;

                const el = createMarkerElement(true, nearby.length);
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([avgLng, avgLat]);

                clusters.push({
                    marker,
                    element: el,
                    coords: [avgLng, avgLat],
                    count: nearby.length,
                    children: nearby
                });
            } else {
                unclustered.push(point);
            }
        });

        return { clusters, points: unclustered };
    };

    // Animate markers expanding from cluster
    const expandCluster = (cluster: ClusterMarker, clusterId: string) => {
        setExpandedCluster(clusterId);

        // Hide cluster
        cluster.marker.getElement().style.opacity = '0';
        cluster.marker.getElement().style.transform = 'scale(0)';

        // Animate children out
        cluster.children.forEach((child, index) => {
            setTimeout(() => {
                const el = createMarkerElement(false);
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(cluster.coords) // Start at cluster position
                    .addTo(map!);

                markersRef.current.set(child.id, marker);

                // Animate to final position
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        marker.setLngLat(child.coords);
                        el.style.transform = 'scale(1)';
                    }, 50);
                });
            }, index * 50); // Stagger animation
        });

        toast.info(`Expanded ${cluster.count} incidents`);
    };

    // Animate markers collapsing into cluster
    const collapseCluster = (cluster: ClusterMarker, clusterId: string) => {
        cluster.children.forEach((child) => {
            const marker = markersRef.current.get(child.id);
            if (marker) {
                const el = marker.getElement();
                el.style.transform = 'scale(0)';
                el.style.opacity = '0';

                setTimeout(() => {
                    marker.remove();
                    markersRef.current.delete(child.id);
                }, 300);
            }
        });

        // Show cluster again
        setTimeout(() => {
            cluster.marker.getElement().style.opacity = '1';
            cluster.marker.getElement().style.transform = 'scale(1)';
        }, 300);

        setExpandedCluster(null);
    };

    // Update markers based on zoom and data
    useEffect(() => {
        if (!map || !enabled) {
            // Clear all markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current.clear();
            clustersRef.current.forEach(c => c.marker.remove());
            clustersRef.current.clear();
            stationaryMarkersRef.current.forEach(m => m.remove());
            stationaryMarkersRef.current.clear();
            return;
        }

        const zoom = map.getZoom();

        // First, detect stationary positions
        const { stationary, mobile } = detectStationaryPositions(data);

        // Then cluster the mobile reports
        const { clusters, points } = clusterPoints(mobile, zoom);

        // Clear existing
        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();
        clustersRef.current.forEach(c => c.marker.remove());
        clustersRef.current.clear();
        stationaryMarkersRef.current.forEach(m => m.remove());
        stationaryMarkersRef.current.clear();

        // Add stationary enforcement markers
        stationary.forEach((position, index) => {
            const marker = createStationaryMarker(position);
            marker.addTo(map);
            stationaryMarkersRef.current.set(`stationary-${index}`, marker);
        });

        // Add clusters
        clusters.forEach((cluster, index) => {
            const clusterId = `cluster-${index}`;
            cluster.marker.addTo(map);
            clustersRef.current.set(clusterId, cluster);

            // Click handler - always zoom in one level
            cluster.element.addEventListener('click', () => {
                const currentZoom = map.getZoom();

                // Always zoom in one step
                map.easeTo({
                    center: cluster.coords,
                    zoom: currentZoom + 1,
                    duration: 500
                });
            });
        });

        // Add unclustered points
        points.forEach((point) => {
            const el = createMarkerElement(false);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat(point.coords)
                .addTo(map);

            markersRef.current.set(point.id, marker);
        });

        // Show toast if stationary positions detected
        if (stationary.length > 0) {
            toast.warning(`${stationary.length} stationary enforcement position${stationary.length > 1 ? 's' : ''} detected`, {
                duration: 3000
            });
        }

    }, [map, data, enabled, expandedCluster]);

    // Cleanup
    useEffect(() => {
        return () => {
            markersRef.current.forEach(m => m.remove());
            clustersRef.current.forEach(c => c.marker.remove());
            stationaryMarkersRef.current.forEach(m => m.remove());
        };
    }, []);
}

export default useAnimatedClusterMarkers;
