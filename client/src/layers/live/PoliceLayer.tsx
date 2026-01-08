
import { useEffect, useState, useMemo } from 'react';
import { useMapStore } from '@/stores';
import { trpc } from '@/lib/trpc';
// Just define local type or use any
interface PoliceReport {
    alertId: string;
    type: string;
    subtype: string;
    latitude: number;
    longitude: number;
    street: string;
    city: string;
    publishDatetimeUtc: string;
}

import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import maplibregl from 'maplibre-gl';
import { Flame } from 'lucide-react';

export function PoliceLayer() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // State
    const [enabled, setEnabled] = useState(true);
    const [heatmapMode, setHeatmapMode] = useState(false);
    const [hoursAgo, setHoursAgo] = useState(336); // Default 14 days
    const [currentZoom, setCurrentZoom] = useState(12); // Assume decent zoom initially
    // Data Fetching - Clustering handles visual load, so we can fetch all (within reason)
    const { data: reports, isLoading } = trpc.police.list.useQuery(
        { hoursAgo },
        {
            enabled: enabled && isLoaded,
            refetchInterval: 60000
        }
    );

    // Filtered / Processed Data
    const geoJsonData = useMemo(() => {
        if (!reports) return { type: 'FeatureCollection', features: [] };
        const now = Date.now();
        return {
            type: 'FeatureCollection',
            features: reports.map((r: any) => {
                // Weight calculation: recent reports are "heavier"
                const reportTime = new Date(r.publishDatetimeUtc).getTime();
                const hoursOld = (now - reportTime) / (1000 * 60 * 60);
                const weight = Math.max(0.2, Math.exp(-0.05 * hoursOld));

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [Number(r.longitude), Number(r.latitude)]
                    },
                    properties: {
                        id: r.alertId,
                        type: r.type,
                        subtype: r.subtype,
                        street: r.street,
                        city: r.city,
                        description: r.subtype ? r.subtype.replace(/_/g, ' ') : r.type,
                        timestamp: r.publishDatetimeUtc,
                        weight: weight
                    }
                };
            })
        };
    }, [reports]);

    // Heatmap Layer Management
    useEffect(() => {
        if (!map || !isLoaded || !enabled) return;

        const heatmapSourceId = 'police-heatmap-source';
        const heatmapLayerId = 'police-heatmap-layer';

        if (heatmapMode) {
            // Add heatmap source if it doesn't exist
            if (!map.getSource(heatmapSourceId)) {
                map.addSource(heatmapSourceId, {
                    type: 'geojson',
                    data: geoJsonData as any
                });
            } else {
                (map.getSource(heatmapSourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
            }

            // Add heatmap layer if it doesn't exist
            if (!map.getLayer(heatmapLayerId)) {
                map.addLayer({
                    id: heatmapLayerId,
                    type: 'heatmap',
                    source: heatmapSourceId,
                    maxzoom: 18,
                    paint: {
                        // Weight by recency
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ['get', 'weight'],
                            0, 0,
                            0.5, 1,
                            1, 2
                        ],
                        // Reduced intensity to prevent washout
                        'heatmap-intensity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 0.5,
                            9, 1,
                            15, 1.5,
                            18, 2
                        ],
                        // Strict Police Logic: Blue (Base) -> Purple -> Red (Peak)
                        'heatmap-color': [
                            'interpolate',
                            ['linear'],
                            ['heatmap-density'],
                            0, 'rgba(0, 0, 0, 0)',           // Transparent
                            0.1, 'rgba(0, 191, 255, 0.3)',   // Deep Sky Blue (Low activity)
                            0.3, 'rgba(0, 0, 255, 0.4)',     // Pure Blue (Standard presence)
                            0.5, 'rgba(0, 0, 200, 0.5)',     // Deep Blue (Moderate)
                            0.7, 'rgba(75, 0, 130, 0.6)',    // Indigo (High)
                            0.85, 'rgba(139, 0, 139, 0.7)',  // Dark Magenta (Heavy)
                            0.92, 'rgba(255, 0, 0, 0.8)',    // Red begins (Very Heavy)
                            1, 'rgba(255, 50, 50, 0.95)'     // Bright Red (Peak only)
                        ],
                        // Enhanced radius for smooth, diffuse blur effect
                        'heatmap-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 5,
                            5, 15,
                            10, 30,
                            15, 45,
                            18, 60
                        ],
                        'heatmap-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 0.7,
                            18, 0.6
                        ]
                    }
                });
            }

            // Show heatmap layer
            map.setLayoutProperty(heatmapLayerId, 'visibility', 'visible');
        } else {
            // Hide heatmap layer
            if (map.getLayer(heatmapLayerId)) {
                map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
            }
        }

        return () => {
            // Cleanup on unmount
            if (map.getLayer(heatmapLayerId)) {
                map.removeLayer(heatmapLayerId);
            }
            if (map.getSource(heatmapSourceId)) {
                map.removeSource(heatmapSourceId);
            }
        };

    }, [map, isLoaded, geoJsonData, enabled, heatmapMode]);

    // Map Layer Management (Markers/Clusters)
    useEffect(() => {
        if (!map || !isLoaded) return;

        const sourceId = 'police-reports-source';
        const layerClusters = 'police-clusters';
        const layerClusterCount = 'police-cluster-count';
        const layerUnclustered = 'police-unclustered-point';
        const layerUnclusteredHalo = 'police-unclustered-halo';

        // Add Source with Clustering
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geoJsonData as any,
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 80   // Radius of each cluster when clustering points (defaults to 50)
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
        }

        // 1. Clusters Layer (Circles)
        if (!map.getLayer(layerClusters)) {
            map.addLayer({
                id: layerClusters,
                type: 'circle',
                source: sourceId,
                filter: ['has', 'point_count'],
                paint: {
                    // Use step expressions (https://maplibre.org/maplibre-style-spec/#expressions-step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6', // < 10
                        10,
                        '#f1f075', // 10-50
                        50,
                        '#f28cb1'  // > 50
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        100,
                        30,
                        750,
                        40
                    ]
                },
                layout: { visibility: (enabled && !heatmapMode) ? 'visible' : 'none' }
            });
        }

        // 2. Cluster Count (Text)
        if (!map.getLayer(layerClusterCount)) {
            map.addLayer({
                id: layerClusterCount,
                type: 'symbol',
                source: sourceId,
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'visibility': (enabled && !heatmapMode) ? 'visible' : 'none'
                }
            });
        }

        // 3. Unclustered Point Halo
        if (!map.getLayer(layerUnclusteredHalo)) {
            map.addLayer({
                id: layerUnclusteredHalo,
                type: 'circle',
                source: sourceId,
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#EF4444',
                    'circle-opacity': 0.4,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#FFFFFF'
                },
                layout: { visibility: (enabled && !heatmapMode) ? 'visible' : 'none' }
            });
        }

        // 4. Unclustered Point Icon
        if (!map.getLayer(layerUnclustered)) {
            map.addLayer({
                id: layerUnclustered,
                type: 'circle',
                source: sourceId,
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#B91C1C',
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#FFFFFF'
                },
                layout: { visibility: (enabled && !heatmapMode) ? 'visible' : 'none' }
            });
        }

        // Toggle Visibility based on mode
        const layers = [layerClusters, layerClusterCount, layerUnclustered, layerUnclusteredHalo];
        layers.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', (enabled && !heatmapMode) ? 'visible' : 'none');
            }
        });

        // Click on cluster -> Zoom
        const handleClusterClick = async (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layerClusters] });
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;

            try {
                // MapLibre v4+ returns a promise for getClusterExpansionZoom? 
                // Or maybe the TS definition expects 1 arg. Let's try Promise style.
                const zoom = await source.getClusterExpansionZoom(clusterId);
                map.easeTo({
                    center: (features[0].geometry as any).coordinates,
                    zoom: zoom
                });
            } catch (err) {
                console.warn('Failed to get cluster expansion zoom', err);
            }
        };

        const handleMouseEnter = () => map.getCanvas().style.cursor = 'pointer';
        const handleMouseLeave = () => map.getCanvas().style.cursor = '';

        map.on('click', layerClusters, handleClusterClick);
        map.on('mouseenter', layerClusters, handleMouseEnter);
        map.on('mouseleave', layerClusters, handleMouseLeave);

        // Cleanup
        return () => {
            map.off('click', layerClusters, handleClusterClick);
            map.off('mouseenter', layerClusters, handleMouseEnter);
            map.off('mouseleave', layerClusters, handleMouseLeave);

            layers.forEach(id => {
                if (map.getLayer(id)) map.removeLayer(id);
            });
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }

    }, [map, isLoaded, geoJsonData, enabled, heatmapMode]);


    if (!isLoaded) return null;

    return (
        <Card className="absolute top-24 right-4 w-72 p-4 bg-background/90 backdrop-blur-sm z-10 shadow-lg border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-red-600 ${enabled ? 'animate-pulse' : ''}`} />
                    Police Alerts
                </Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
                <div className="space-y-4">
                    {/* Heatmap Toggle Button */}
                    <Button
                        variant={heatmapMode ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setHeatmapMode(!heatmapMode)}
                    >
                        <Flame className={`w-4 h-4 mr-2 ${heatmapMode ? 'animate-pulse' : ''}`} />
                        {heatmapMode ? 'Heatmap Active' : 'Show Heatmap'}
                    </Button>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Time Filter</span>
                            <span>{hoursAgo > 48 ? `${Math.round(hoursAgo / 24)} days` : `${hoursAgo}h`}</span>
                        </div>
                        <Slider
                            value={[hoursAgo]}
                            onValueChange={(v) => setHoursAgo(v[0])}
                            min={1}
                            max={336}
                            step={1}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                        {reports ? `${reports.length} active reports` : 'Loading...'}
                        {heatmapMode && (
                            <div className="mt-2 text-xs italic text-amber-600">
                                🔥 Heatmap shows density of police sightings
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}
