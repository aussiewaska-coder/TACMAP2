// PoliceAlertsPanel - Police alerts controls for sidebar
// Extracted from PoliceLayer for use in unified sidebar

import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Radio, Flame } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/stores';
import { trpc } from '@/lib/trpc';
import maplibregl from 'maplibre-gl';

/**
 * Police Alerts panel for sidebar
 * Controls visibility, time filter, and displays stats
 */
export function PoliceAlertsPanel() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // State
    const [enabled, setEnabled] = useState(true);
    const [heatmapMode, setHeatmapMode] = useState(false);
    const [showMarkersOverlay, setShowMarkersOverlay] = useState(false);
    const [hoursAgo, setHoursAgo] = useState(336); // Default 14 days

    // Data Fetching
    const { data: reports, isLoading } = trpc.police.list.useQuery(
        { hoursAgo },
        {
            enabled: enabled && isLoaded,
            refetchInterval: 60000
        }
    );

    // GeoJSON Data
    const geoJsonData = useMemo(() => {
        if (!reports) return { type: 'FeatureCollection', features: [] };
        const now = Date.now();
        return {
            type: 'FeatureCollection',
            features: reports.map((r: any) => {
                // Weight calculation: recent reports are "heavier"
                // This helps rural/low-density areas show up if they have active threats
                const reportTime = new Date(r.publishDatetimeUtc).getTime();
                const hoursOld = (now - reportTime) / (1000 * 60 * 60);
                // Decay factor:
                // 0 hours = 1.0
                // 12 hours = ~0.5
                // 24 hours = ~0.3
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
                        // Weight by recency/relevance rather than just quantity
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ['get', 'weight'],
                            0, 0,
                            0.5, 1,   // Moderate weight contribution
                            1, 2      // Heavy weight for brand new reports
                        ],
                        // Reduced intensity to prevent city washout
                        'heatmap-intensity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            0, 0.5,
                            9, 1,
                            15, 1.5,
                            18, 2
                        ],
                        // Explicit Police Theme: Blue (Base) -> Purple -> Red (Peak)
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

            map.setLayoutProperty(heatmapLayerId, 'visibility', 'visible');
        } else {
            if (map.getLayer(heatmapLayerId)) {
                map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
            }
        }

        return () => {
            if (map.getLayer(heatmapLayerId)) {
                map.removeLayer(heatmapLayerId);
            }
            if (map.getSource(heatmapSourceId)) {
                map.removeSource(heatmapSourceId);
            }
        };

    }, [map, isLoaded, geoJsonData, enabled, heatmapMode]);

    // Map Layer Management
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
                clusterMaxZoom: 14,
                clusterRadius: 50
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
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6',
                        10,
                        '#f1f075',
                        50,
                        '#f28cb1'
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

        // Toggle Visibility
        const layers = [layerClusters, layerClusterCount, layerUnclustered, layerUnclusteredHalo];
        const markersVisible = enabled && (!heatmapMode || showMarkersOverlay) ? 'visible' : 'none';

        layers.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', markersVisible);
            }
        });

        // Click on cluster -> Zoom
        const handleClusterClick = async (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layerClusters] });
            if (!features.length) return;
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;

            try {
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
        };

    }, [map, isLoaded, geoJsonData, enabled, heatmapMode, showMarkersOverlay]);

    // Get breakdown by type
    const typeBreakdown = useMemo(() => {
        if (!reports) return [];
        const counts: Record<string, number> = {};
        reports.forEach((r: any) => {
            const type = r.type || 'Unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [reports]);

    return (
        <div className="space-y-6">
            {/* Header with toggle */}
            <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-red-500/30' : 'bg-gray-500/20'}`}>
                            <Radio className={`w-5 h-5 ${enabled ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-medium">Police Alerts</h4>
                            <p className="text-sm text-white/60">Live incident data</p>
                        </div>
                    </div>
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

                        {/* Show Markers Overlay Checkbox (Only visible when Heatmap is active) */}
                        {heatmapMode && (
                            <div className="flex items-center space-x-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200 pt-2">
                                <Switch
                                    id="show-markers"
                                    checked={showMarkersOverlay}
                                    onCheckedChange={setShowMarkersOverlay}
                                    className="scale-75 data-[state=checked]:bg-cyan-600"
                                />
                                <Label htmlFor="show-markers" className="text-xs text-white/70 cursor-pointer font-medium hover:text-white transition-colors">
                                    Overlay Markers
                                </Label>
                            </div>
                        )}

                        {/* Time filter */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/60">Time Range</span>
                                <span className="font-medium">{hoursAgo > 48 ? `${Math.round(hoursAgo / 24)} days` : `${hoursAgo}h`}</span>
                            </div>
                            <Slider
                                value={[hoursAgo]}
                                onValueChange={(v) => setHoursAgo(v[0])}
                                min={1}
                                max={336}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-white/40">
                                <span>1 hour</span>
                                <span>14 days</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Active Reports</span>
                                <span className="font-semibold text-lg">
                                    {isLoading ? '...' : reports?.length || 0}
                                </span>
                            </div>
                            {heatmapMode && (
                                <div className="mt-2 text-xs italic text-amber-400 flex items-center gap-1">
                                    <Flame className="w-3 h-3" />
                                    Heatmap shows density of police sightings
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Type breakdown */}
            {enabled && typeBreakdown.length > 0 && (
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                        <AlertTriangle className="w-4 h-4" />
                        By Type
                    </h3>
                    <div className="space-y-2">
                        {typeBreakdown.map(([type, count]) => (
                            <div key={type} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                <span className="text-sm capitalize">{type.toLowerCase().replace(/_/g, ' ')}</span>
                                <span className="text-sm font-medium bg-white/10 px-2 py-0.5 rounded">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            {enabled && (
                <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-3">Cluster Legend</h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#51bbd6]" />
                            <span className="text-white/70">&lt; 10 incidents</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#f1f075]" />
                            <span className="text-white/70">10-50 incidents</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#f28cb1]" />
                            <span className="text-white/70">&gt; 50 incidents</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-2">
                            <div className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-400/40" />
                            <span className="text-white/70">Individual report</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PoliceAlertsPanel;
