// AnimatedClusterMarkers - Custom animated cluster implementation
// Provides smooth marker animations when expanding/collapsing clusters

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

interface AnimatedClusterMarkersProps {
    map: maplibregl.Map | null;
    data: MarkerData[];
    enabled: boolean;
    clusterRadius?: number;
    maxZoom?: number;
}

/**
 * Custom cluster implementation with animated marker expansion
 * When clicking a cluster at max zoom, markers animate out to their positions
 */
export function useAnimatedClusterMarkers({
    map,
    data,
    enabled,
    clusterRadius = 60,
    maxZoom = 14
}: AnimatedClusterMarkersProps) {
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const clustersRef = useRef<Map<string, ClusterMarker>>(new Map());
    const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

    // Create marker element
    const createMarkerElement = (isCluster: boolean, count?: number) => {
        const el = document.createElement('div');

        if (isCluster) {
            el.className = 'police-cluster-marker';
            el.innerHTML = `
                <div class="cluster-circle" style="
                    width: ${Math.min(60, 30 + (count || 0) * 2)}px;
                    height: ${Math.min(60, 30 + (count || 0) * 2)}px;
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
                    width: 12px;
                    height: 12px;
                    background: #B91C1C;
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
            return;
        }

        const zoom = map.getZoom();
        const mapMaxZoom = map.getMaxZoom();
        const { clusters, points } = clusterPoints(data, zoom);

        // Clear existing
        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();
        clustersRef.current.forEach(c => c.marker.remove());
        clustersRef.current.clear();

        // Add clusters
        clusters.forEach((cluster, index) => {
            const clusterId = `cluster-${index}`;
            cluster.marker.addTo(map);
            clustersRef.current.set(clusterId, cluster);

            // Click handler
            cluster.element.addEventListener('click', () => {
                const currentZoom = map.getZoom();

                // If at absolute max zoom, expand with animation
                if (currentZoom >= mapMaxZoom - 0.1) {
                    if (expandedCluster === clusterId) {
                        collapseCluster(cluster, clusterId);
                    } else {
                        expandCluster(cluster, clusterId);
                    }
                } else {
                    // Otherwise, always zoom in one step
                    map.easeTo({
                        center: cluster.coords,
                        zoom: currentZoom + 1,
                        duration: 500
                    });
                }
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

    }, [map, data, enabled, expandedCluster]);

    // Cleanup
    useEffect(() => {
        return () => {
            markersRef.current.forEach(m => m.remove());
            clustersRef.current.forEach(c => c.marker.remove());
        };
    }, []);
}

export default useAnimatedClusterMarkers;
