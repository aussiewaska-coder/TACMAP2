// EmergencyPanel - Emergency Services controls for sidebar
// Displays aircraft tracking and emergency feeds with map integration

import { useState, useEffect, useMemo } from 'react';
import { Plane, AlertTriangle, Flame, Waves, Construction, Satellite, Radio } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAircraftTracks } from '@/hooks/useAircraftTracks';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';
import { Badge } from '@/components/ui/badge';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';

const HAZARD_TYPES = [
    { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'flood', label: 'Flood/Storm', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'road', label: 'Roads', icon: Construction, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'space', label: 'Space', icon: Satellite, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'general', label: 'Alerts', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
];

/**
 * Emergency Services panel for sidebar
 */
export function EmergencyPanel() {
    const [aircraftEnabled, setAircraftEnabled] = useState(true);
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [activeFilters, setActiveFilters] = useState<string[]>(HAZARD_TYPES.map(h => h.id));

    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const { data: aircraftData, isLoading: aircraftLoading, error: aircraftError } = useAircraftTracks(aircraftEnabled);
    const { data: rawAlertsData, isLoading: alertsLoading, error: alertsError } = useEmergencyAlerts(alertsEnabled);

    // Filter alerts data
    const alertsData = useMemo(() => {
        if (!rawAlertsData) return null;

        const filteredFeatures = rawAlertsData.features.filter(f => {
            const sub = (f.properties.hazard_type || '').toLowerCase();
            const cat = (f.properties.category || '').toLowerCase();

            if (activeFilters.includes('fire') && (sub.includes('fire') || cat.includes('fire'))) return true;
            if (activeFilters.includes('flood') && (sub.includes('flood') || sub.includes('storm') || sub.includes('rain') || sub.includes('tsunami'))) return true;
            if (activeFilters.includes('road') && (sub.includes('road') || sub.includes('traffic') || sub.includes('closure'))) return true;
            if (activeFilters.includes('space') && (sub.includes('space') || sub.includes('sws'))) return true;
            if (activeFilters.includes('general') && !['fire', 'flood', 'road', 'space'].some(key => {
                if (key === 'fire' && (sub.includes('fire') || cat.includes('fire'))) return true;
                if (key === 'flood' && (sub.includes('flood') || sub.includes('storm'))) return true;
                if (key === 'road' && (sub.includes('road'))) return true;
                if (key === 'space' && (sub.includes('space'))) return true;
                return false;
            })) return true;

            return false;
        });

        return {
            ...rawAlertsData,
            features: filteredFeatures,
            metadata: {
                ...rawAlertsData.metadata,
                total_alerts: filteredFeatures.length
            }
        };
    }, [rawAlertsData, activeFilters]);

    const toggleFilter = (id: string) => {
        setActiveFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // ... (Aircraft effect remains same) ...
    useEffect(() => {
        if (!map || !isLoaded || !aircraftEnabled || !aircraftData) return;
        const sourceId = 'emergency-aircraft-source';
        const pointsLayerId = 'emergency-aircraft-points';
        const labelsLayerId = 'emergency-aircraft-labels';
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: aircraftData as any });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(aircraftData as any);
        }
        if (!map.getLayer(pointsLayerId)) {
            map.addLayer({
                id: pointsLayerId, type: 'circle', source: sourceId,
                paint: {
                    'circle-radius': ['case', ['get', 'stale'], 6, 8],
                    'circle-color': ['case', ['get', 'stale'], '#666666', ['==', ['get', 'source'], 'adsb_lol'], '#00ff00', '#ffaa00'],
                    'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff',
                    'circle-opacity': ['case', ['get', 'stale'], 0.4, 0.9],
                },
            });
        }
        if (!map.getLayer(labelsLayerId)) {
            map.addLayer({
                id: labelsLayerId, type: 'symbol', source: sourceId,
                layout: {
                    'text-field': ['coalesce', ['get', 'registration'], ['get', 'callsign'], ['get', 'icao24']],
                    'text-font': ['Open Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.5], 'text-anchor': 'top',
                },
                paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1, 'text-opacity': ['case', ['get', 'stale'], 0.5, 1], },
            });
        }
        const handleClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const html = `<div style="padding: 8px;"><h3 style="margin: 0 0 8px 0; font-weight: bold;">${props?.registration || props?.callsign || props?.icao24}</h3><div style="font-size: 12px;"><div><strong>ICAO24:</strong> ${props?.icao24}</div>${props?.operator ? `<div><strong>Operator:</strong> ${props.operator}</div>` : ''}<div><strong>Altitude:</strong> ${Math.round(props?.altitude_m || 0)}m</div><div><strong>Speed:</strong> ${Math.round((props?.ground_speed_mps || 0) * 3.6)} km/h</div><div><strong>Source:</strong> ${props?.source}</div><div><strong>Age:</strong> ${props?.age_s}s</div></div></div>`;
            new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
        };
        map.on('click', pointsLayerId, handleClick);
        return () => {
            map.off('click', pointsLayerId, handleClick);
            if (map.getLayer(labelsLayerId)) map.removeLayer(labelsLayerId);
            if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        };
    }, [map, isLoaded, aircraftData, aircraftEnabled]);

    // Add alerts layer to map with icon filtering logic
    useEffect(() => {
        if (!map || !isLoaded || !alertsEnabled || !alertsData) return;

        const sourceId = 'emergency-alerts-source';
        const layerId = 'emergency-alerts-layer';
        const iconLayerId = 'emergency-alerts-icons';

        // Add or update source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: alertsData as any,
            });
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(alertsData as any);
        }

        // Add alerts base layer (colored halos)
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 6,
                        10, 14,
                        15, 20
                    ],
                    'circle-color': [
                        'match',
                        ['get', 'severity_rank'],
                        1, '#dc2626', // Emergency - Red
                        2, '#f59e0b', // Watch & Act - Orange
                        3, '#eab308', // Advice - Yellow
                        '#3b82f6' // Info - Blue
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.6,
                },
            });
        }

        // Add Alert Icons Symbol Layer
        if (!map.getLayer(iconLayerId)) {
            map.addLayer({
                id: iconLayerId,
                type: 'symbol',
                source: sourceId,
                layout: {
                    'text-field': [
                        'case',
                        ['match', ['get', 'category'], ['Aviation'], true, false], '✈️',
                        ['match', ['get', 'hazard_type'], ['Bushfire'], true, ['Fire'], true, false], '🔥',
                        ['match', ['get', 'hazard_type'], ['Flood'], true, ['Storm'], true, false], '🌊',
                        ['match', ['get', 'hazard_type'], ['Weather'], true, ['Severe Weather'], true, false], '⛈️',
                        ['match', ['get', 'hazard_type'], ['Road'], true, ['Traffic'], true, false, ['Road conditions & closures'], true], '🚧',
                        '⚠️'
                    ],
                    'text-size': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 10,
                        10, 14,
                        15, 18
                    ],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1.5,
                }
            });
        }

        const handleAlertClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const html = `
                <div style="padding: 12px; max-width: 320px; background: #0f172a; color: white; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 20px;">${props?.hazard_type?.includes('Fire') ? '🔥' : (props?.hazard_type?.includes('Flood') ? '🌊' : '⚠️')}</span>
                        <h3 style="margin: 0; font-weight: bold; font-size: 14px; color: ${getSeverityColor(props?.severity_rank)};">
                            ${props?.title}
                        </h3>
                    </div>
                    <div style="font-size: 12px; line-height: 1.4;">
                        <div style="opacity: 0.8; margin-bottom: 8px;">${props?.description?.substring(0, 300)}${props?.description?.length > 300 ? '...' : ''}</div>
                        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 4px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <div><strong>Severity:</strong> ${props?.severity}</div>
                            <div><strong>State:</strong> ${props?.state}</div>
                        </div>
                        ${props?.url ? `<div style="margin-top: 10px;"><a href="${props.url}" target="_blank" style="display: block; background: #3b82f6; color: white; text-align: center; padding: 6px; border-radius: 4px; text-decoration: none;">VIEW OFFICIAL NOTICE</a></div>` : ''}
                        <div style="margin-top: 8px; font-size: 10px; opacity: 0.5;">
                            Issued: ${new Date(props?.issued_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            `;
            new maplibregl.Popup({ className: 'custom-emergency-popup', maxWidth: '350px' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        };

        map.on('click', layerId, handleAlertClick);
        return () => {
            map.off('click', layerId, handleAlertClick);
            if (map.getLayer(iconLayerId)) map.removeLayer(iconLayerId);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        };
    }, [map, isLoaded, alertsData, alertsEnabled]);

    return (
        <div className="space-y-6">
            {/* Aircraft Tracking Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${aircraftEnabled ? 'bg-green-500/30' : 'bg-gray-500/20'}`}>
                            <Plane className={`w-6 h-6 ${aircraftEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Aircraft</h4>
                            <p className="text-xs text-white/50">Emergency flight tracking</p>
                        </div>
                    </div>
                    <Switch checked={aircraftEnabled} onCheckedChange={setAircraftEnabled} />
                </div>

                {aircraftEnabled && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm bg-black/20 p-2 rounded-lg">
                            <span className="text-white/60">Active Assets</span>
                            <span className="font-mono text-green-400 text-lg">
                                {aircraftLoading ? '...' : aircraftData?.metadata.active_tracks || 0}
                            </span>
                        </div>
                        {aircraftData?.metadata.stale && (
                            <Badge variant="outline" className="bg-yellow-900/50 text-yellow-100 border-yellow-700/50 text-[10px] w-full justify-center">
                                CALIBRATING... (STALE DATA)
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Emergency Alerts Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${alertsEnabled ? 'bg-red-500/30' : 'bg-gray-500/20'}`}>
                            <AlertTriangle className={`w-6 h-6 ${alertsEnabled ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Alerts</h4>
                            <p className="text-xs text-white/50">Live hazard monitor</p>
                        </div>
                    </div>
                    <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                </div>

                {alertsEnabled && (
                    <div className="space-y-4">
                        {/* Hazard Filter Pills */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Filters</label>
                            <div className="flex flex-wrap gap-2">
                                {HAZARD_TYPES.map((type) => {
                                    const Icon = type.icon;
                                    const isActive = activeFilters.includes(type.id);
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => toggleFilter(type.id)}
                                            className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                                ${isActive
                                                    ? `${type.bg} ${type.color} ring-1 ring-inset ring-white/20 shadow-lg`
                                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {type.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                                <p className="text-[10px] text-white/40 uppercase font-bold">Total Alerts</p>
                                <p className="text-xl font-mono text-red-400">{alertsLoading ? '...' : alertsData?.metadata.total_alerts || 0}</p>
                            </div>
                            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                                <p className="text-[10px] text-white/40 uppercase font-bold">Feeds</p>
                                <p className="text-xl font-mono text-white/80">{alertsData?.metadata.sources_count || 0}</p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10">
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Severity Key</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
                                    <span className="text-white/70">Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                                    <span className="text-white/70">Watch & Act</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                    <span className="text-white/70">Advice</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                    <span className="text-white/70">Information</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Radio Streams - Coming Soon */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 opacity-50 grayscale">
                <div className="flex items-center gap-3 mb-2">
                    <Radio className="w-5 h-5 text-red-400" />
                    <h4 className="font-bold">Radio Streams</h4>
                </div>
                <p className="text-[10px] text-white/40 italic uppercase tracking-widest pl-8">Phase 3: Tactical Monitoring</p>
            </div>
        </div>
    );
}

function getSeverityColor(rank?: number): string {
    switch (rank) {
        case 1: return '#dc2626'; // Red
        case 2: return '#f59e0b'; // Orange
        case 3: return '#eab308'; // Yellow
        default: return '#3b82f6'; // Blue
    }
}

export default EmergencyPanel;
