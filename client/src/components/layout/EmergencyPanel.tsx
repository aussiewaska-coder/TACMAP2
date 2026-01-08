// EmergencyPanel - Emergency Services controls for sidebar
// Displays aircraft tracking and emergency feeds with map integration

import { useState, useEffect } from 'react';
import { Plane, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAircraftTracks } from '@/hooks/useAircraftTracks';
import { Badge } from '@/components/ui/badge';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';

/**
 * Emergency Services panel for sidebar
 * Controls aircraft tracking and emergency feeds
 */
export function EmergencyPanel() {
    const [aircraftEnabled, setAircraftEnabled] = useState(true);
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const { data: aircraftData, isLoading, error } = useAircraftTracks(aircraftEnabled);

    // Add aircraft layer to map
    useEffect(() => {
        if (!map || !isLoaded || !aircraftEnabled || !aircraftData) return;

        const sourceId = 'emergency-aircraft-source';
        const pointsLayerId = 'emergency-aircraft-points';
        const labelsLayerId = 'emergency-aircraft-labels';

        // Add or update source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: aircraftData as any,
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(aircraftData as any);
        }

        // Add aircraft points layer
        if (!map.getLayer(pointsLayerId)) {
            map.addLayer({
                id: pointsLayerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'case',
                        ['get', 'stale'], 6,
                        8
                    ],
                    'circle-color': [
                        'case',
                        ['get', 'stale'], '#666666',
                        ['==', ['get', 'source'], 'adsb_lol'], '#00ff00',
                        '#ffaa00'
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': [
                        'case',
                        ['get', 'stale'], 0.4,
                        0.9
                    ],
                },
            });
        }

        // Add aircraft labels
        if (!map.getLayer(labelsLayerId)) {
            map.addLayer({
                id: labelsLayerId,
                type: 'symbol',
                source: sourceId,
                layout: {
                    'text-field': [
                        'coalesce',
                        ['get', 'registration'],
                        ['get', 'callsign'],
                        ['get', 'icao24']
                    ],
                    'text-font': ['Open Sans Regular'],
                    'text-size': 11,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1,
                    'text-opacity': [
                        'case',
                        ['get', 'stale'], 0.5,
                        1
                    ],
                },
            });
        }

        // Add click handler for popups
        const handleClick = (e: any) => {
            if (!e.features || e.features.length === 0) return;

            const feature = e.features[0];
            const props = feature.properties;

            const html = `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">
            ${props?.registration || props?.callsign || props?.icao24}
          </h3>
          <div style="font-size: 12px;">
            <div><strong>ICAO24:</strong> ${props?.icao24}</div>
            ${props?.operator ? `<div><strong>Operator:</strong> ${props.operator}</div>` : ''}
            ${props?.role ? `<div><strong>Role:</strong> ${props.role}</div>` : ''}
            <div><strong>Altitude:</strong> ${Math.round(props?.altitude_m || 0)}m</div>
            <div><strong>Speed:</strong> ${Math.round((props?.ground_speed_mps || 0) * 3.6)} km/h</div>
            <div><strong>Source:</strong> ${props?.source}</div>
            <div><strong>Age:</strong> ${props?.age_s}s ${props?.stale ? '(stale)' : ''}</div>
          </div>
        </div>
      `;

            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        };

        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };

        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = '';
        };

        map.on('click', pointsLayerId, handleClick);
        map.on('mouseenter', pointsLayerId, handleMouseEnter);
        map.on('mouseleave', pointsLayerId, handleMouseLeave);

        // Cleanup
        return () => {
            map.off('click', pointsLayerId, handleClick);
            map.off('mouseenter', pointsLayerId, handleMouseEnter);
            map.off('mouseleave', pointsLayerId, handleMouseLeave);

            if (map.getLayer(labelsLayerId)) {
                map.removeLayer(labelsLayerId);
            }
            if (map.getLayer(pointsLayerId)) {
                map.removeLayer(pointsLayerId);
            }
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        };
    }, [map, isLoaded, aircraftData, aircraftEnabled]);

    return (
        <div className="space-y-6">
            {/* Aircraft Tracking Section */}
            <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${aircraftEnabled ? 'bg-green-500/30' : 'bg-gray-500/20'}`}>
                            <Plane className={`w-5 h-5 ${aircraftEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-medium">Aircraft Tracking</h4>
                            <p className="text-sm text-white/60">Live emergency aircraft</p>
                        </div>
                    </div>
                    <Switch checked={aircraftEnabled} onCheckedChange={setAircraftEnabled} />
                </div>

                {aircraftEnabled && (
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Active Aircraft</span>
                                <span className="font-semibold text-lg">
                                    {isLoading ? '...' : aircraftData?.metadata.active_tracks || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Total Tracked</span>
                                <span className="font-semibold">
                                    {aircraftData?.metadata.total_tracked || 0}
                                </span>
                            </div>

                            {aircraftData?.metadata.stale && (
                                <Badge variant="outline" className="bg-yellow-900 text-yellow-100 text-xs w-full justify-center">
                                    Stale Data
                                </Badge>
                            )}

                            {error && (
                                <Badge variant="destructive" className="text-xs w-full justify-center">
                                    Error loading data
                                </Badge>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="pt-3 border-t border-white/10">
                            <h4 className="text-sm font-medium mb-3">Aircraft Legend</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                                    <span className="text-white/70">adsb.lol (Primary)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
                                    <span className="text-white/70">OpenSky (Fallback)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-white opacity-50" />
                                    <span className="text-white/60">Stale (\u003e15s)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Coming Soon Sections */}
            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <h4 className="font-medium">Emergency Alerts</h4>
                </div>
                <p className="text-sm text-white/50 italic">Coming in Phase 2</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h4 className="font-medium">Radio Streams</h4>
                </div>
                <p className="text-sm text-white/50 italic">Coming in Phase 3</p>
            </div>
        </div>
    );
}

export default EmergencyPanel;
