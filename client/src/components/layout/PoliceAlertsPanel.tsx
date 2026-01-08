// PoliceAlertsPanel - Police alerts controls for sidebar
// Extracted from PoliceLayer for use in unified sidebar

import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
        return {
            type: 'FeatureCollection',
            features: reports.map((r: any) => ({
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
                    timestamp: r.publishDatetimeUtc
                }
            }))
        };
    }, [reports]);

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
                layout: { visibility: enabled ? 'visible' : 'none' }
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
                    'visibility': enabled ? 'visible' : 'none'
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
                layout: { visibility: enabled ? 'visible' : 'none' }
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
                layout: { visibility: enabled ? 'visible' : 'none' }
            });
        }

        // Toggle Visibility
        const layers = [layerClusters, layerClusterCount, layerUnclustered, layerUnclusteredHalo];
        layers.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
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

    }, [map, isLoaded, geoJsonData, enabled]);

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
