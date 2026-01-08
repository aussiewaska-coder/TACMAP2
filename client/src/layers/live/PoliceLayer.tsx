
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
import { Card } from '@/components/ui/card';
import maplibregl from 'maplibre-gl';

export function PoliceLayer() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // State
    const [enabled, setEnabled] = useState(true);
    const [hoursAgo, setHoursAgo] = useState(336); // Default 14 days
    const [currentZoom, setCurrentZoom] = useState(12); // Assume decent zoom initially
    const MIN_ZOOM = 11;

    // Track Zoom
    useEffect(() => {
        if (!map) return;

        const updateZoom = () => setCurrentZoom(map.getZoom());
        map.on('moveend', updateZoom);
        // Initial check
        updateZoom();

        return () => {
            map.off('moveend', updateZoom);
        };
    }, [map]);

    // specific toggle for "is zoom level ok?"
    const zoomOk = currentZoom >= MIN_ZOOM;

    // Data Fetching
    const { data: reports, isLoading } = trpc.police.list.useQuery(
        { hoursAgo },
        {
            enabled: enabled && isLoaded && zoomOk, // Only fetch if zoomed in close enough (saves DB)
            refetchInterval: 60000
        }
    );

    // Filtered / Processed Data
    const geoJsonData = useMemo(() => {
        if (!reports || !zoomOk) return { type: 'FeatureCollection', features: [] }; // Clear features if zoomed out
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
    }, [reports, zoomOk]);

    // Map Layer Management
    useEffect(() => {
        if (!map || !isLoaded) return;

        const sourceId = 'police-reports-source';
        const layerId = 'police-reports-layer';
        const haloId = 'police-reports-halo';

        // Add Source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geoJsonData as any
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
        }

        // Add Layers
        // Halo Layer (pulsing effect or just background)
        if (!map.getLayer(haloId)) {
            map.addLayer({
                id: haloId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#EF4444', // Red-500
                    'circle-opacity': 0.4,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#FFFFFF'
                },
                layout: {
                    visibility: enabled ? 'visible' : 'none'
                }
            });
        }

        // Icon/Dot Layer
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#B91C1C', // Red-700
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#FFFFFF'
                },
                layout: {
                    visibility: enabled ? 'visible' : 'none'
                }
            });
        }

        // Update Visibility
        if (map.getLayer(layerId)) {
            // Also hide if not zoomOk logic? 
            // geoJsonData is already cleared if not zoomOk (features: []), so source is empty.
            // But good to be consistent
            const visible = enabled && zoomOk ? 'visible' : 'none';
            map.setLayoutProperty(layerId, 'visibility', visible);
            map.setLayoutProperty(haloId, 'visibility', visible);
        }

        // Click Handler (Popup) needs to be managed? 
        // For now, let's stick to markers.

    }, [map, isLoaded, geoJsonData, enabled, zoomOk]);


    if (!isLoaded) return null;

    return (
        <Card className="absolute top-24 right-4 w-72 p-4 bg-background/90 backdrop-blur-sm z-10 shadow-lg border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-red-600 ${zoomOk && enabled ? 'animate-pulse' : ''}`} />
                    Police Alerts
                </Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
                <div className="space-y-4">
                    {!zoomOk ? (
                        <div className="text-sm text-yellow-600 font-medium p-2 bg-yellow-50 rounded border border-yellow-200">
                            Zoom in closer to view police data
                        </div>
                    ) : (
                        <>
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
                            </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
