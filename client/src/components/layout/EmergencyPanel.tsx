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
    { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', activeBg: 'bg-red-500', activeText: 'text-white' },
    { id: 'flood', label: 'Flood/Storm', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-500/10', activeBg: 'bg-blue-500', activeText: 'text-white' },
    { id: 'road', label: 'Roads', icon: Construction, color: 'text-orange-500', bg: 'bg-orange-500/10', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { id: 'aviation', label: 'Aviation', icon: Plane, color: 'text-green-500', bg: 'bg-green-500/10', activeBg: 'bg-green-500', activeText: 'text-white' },
    { id: 'space', label: 'Space', icon: Satellite, color: 'text-purple-500', bg: 'bg-purple-500/10', activeBg: 'bg-purple-500', activeText: 'text-white' },
    { id: 'general', label: 'Alerts', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', activeBg: 'bg-yellow-600', activeText: 'text-white' },
];

/**
 * Emergency Services panel for sidebar
 */
export function EmergencyPanel() {
    const [aircraftEnabled, setAircraftEnabled] = useState(true);
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [activeFilters, setActiveFilters] = useState<string[]>(HAZARD_TYPES.map(h => h.id));
    const [opsMode, setOpsMode] = useState<'all' | 'warning' | 'ground_truth'>('all');

    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const { data: aircraftData, isLoading: aircraftLoading, error: aircraftError } = useAircraftTracks(aircraftEnabled);
    // --- EFFECT: Icon Registration ---
    useEffect(() => {
        if (!map || !isLoaded) return;

        const icons = {
            'icon-fire': {
                path: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
                color: '#ef4444'
            },
            'icon-flood': {
                path: 'M2 6c.6.5 1.2 1 2.5 1C5.8 7 6.5 6 8 6c1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 1.3 0 2-1 3.5-1 1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 1.3 0 2-1 3.5-1 1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1',
                color: '#3b82f6'
            },
            'icon-road': {
                path: 'M3 21h18M3 7l9-4 9 4M5 21V7m14 14V7m-7 14V11',
                color: '#f97316'
            },
            'icon-aviation': {
                path: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
                color: '#10b981'
            },
            'icon-space': {
                path: 'M13 7l2 2M9 11l2 2M8 4l8 8M3 4l4 4M2 11l9 9M7 11l2 2M11 7l2-2M18 5L5 18M10 10l4 4M21 21l-3-3',
                color: '#a855f7'
            },
            'icon-warning': {
                path: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
                color: '#eab308'
            }
        };

        const registerIcons = () => {
            Object.entries(icons).forEach(([name, config]) => {
                if (map.hasImage(name)) return;

                const size = 64;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Background circle for better visibility
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, (size / 2) - 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Main SVG path
                const p = new Path2D(config.path);
                ctx.save();
                ctx.translate(size / 4, size / 4);
                ctx.scale(size / 48, size / 48);
                ctx.strokeStyle = config.color;
                ctx.lineWidth = 3;
                ctx.stroke(p);
                ctx.restore();

                const imageData = ctx.getImageData(0, 0, size, size);
                map.addImage(name, imageData);
            });
        };

        if (map.isStyleLoaded()) {
            registerIcons();
        }
        map.on('styledata', registerIcons);

        return () => {
            if (map) map.off('styledata', registerIcons);
        };
    }, [map, isLoaded]);

    const { data: rawAlertsData, isLoading: alertsLoading, error: alertsError } = useEmergencyAlerts(alertsEnabled);

    // Filter alerts data and assign icons
    const alertsData = useMemo(() => {
        if (!rawAlertsData) return null;

        const filteredFeatures = rawAlertsData.features.map(f => {
            const props = f.properties;
            const sub = (props.hazard_type || '').toLowerCase();
            const sub2 = (props.subcategory || '').toLowerCase();
            const cat = (props.category || '').toLowerCase();
            const tags = (props.tags || []).map((t: string) => t.toLowerCase());

            const isFire = sub.includes('fire') || cat.includes('fire') || sub2.includes('fire') || tags.includes('fire') || sub.includes('bushfire') || sub.includes('burn');
            const isFlood = sub.includes('flood') || sub.includes('storm') || sub.includes('rain') || sub.includes('tsunami') || cat.includes('weather') || sub2.includes('storm') || sub.includes('tide') || sub.includes('meteorological');
            const isRoad = sub.includes('road') || sub.includes('traffic') || sub.includes('closure') || cat.includes('transport') || sub2.includes('road') || sub.includes('crash') || sub.includes('incident');
            const isSpace = sub.includes('space') || sub.includes('sws') || cat.includes('space') || sub.includes('solar') || sub.includes('geomagnetic');
            const isAviation = cat.includes('aviation') || sub.includes('aircraft') || sub2.includes('aircraft') || tags.includes('aviation');

            // Assign icon based on hazard detection
            let markerIcon = 'icon-warning';
            if (isFire) markerIcon = 'icon-fire';
            else if (isFlood) markerIcon = 'icon-flood';
            else if (isRoad) markerIcon = 'icon-road';
            else if (isAviation) markerIcon = 'icon-aviation';
            else if (isSpace) markerIcon = 'icon-space';

            const isGroundTruth = tags.includes('fire_ground_truth') || tags.includes('operational') || tags.includes('ground_truth');
            const isWarning = tags.includes('public_warning') || (!isGroundTruth);

            const matchesOps = opsMode === 'all' ||
                (opsMode === 'ground_truth' && isGroundTruth) ||
                (opsMode === 'warning' && isWarning);

            const matchesFilter = matchesOps && (
                (activeFilters.includes('fire') && isFire) ||
                (activeFilters.includes('flood') && isFlood) ||
                (activeFilters.includes('road') && isRoad) ||
                (activeFilters.includes('space') && isSpace) ||
                (activeFilters.includes('aviation') && isAviation) ||
                (activeFilters.includes('general') && !isFire && !isFlood && !isRoad && !isSpace && !isAviation)
            );

            if (!matchesFilter) return null;

            return {
                ...f,
                properties: {
                    ...f.properties,
                    markerIcon
                }
            };
        }).filter(Boolean);

        return {
            ...rawAlertsData,
            features: filteredFeatures,
            metadata: {
                ...rawAlertsData.metadata,
                total_alerts: filteredFeatures.length
            }
        };
    }, [rawAlertsData, activeFilters, opsMode]);

    const toggleFilter = (id: string) => {
        setActiveFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // --- EFFECT: Aircraft Layer Management ---
    useEffect(() => {
        if (!map || !isLoaded || !aircraftEnabled) return;

        const sourceId = 'emergency-aircraft-source';
        const pointsLayerId = 'emergency-aircraft-points';
        const labelsLayerId = 'emergency-aircraft-labels';

        const addAircraftLayers = () => {
            if (!map) return;
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
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
                        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'], 'text-size': 11, 'text-offset': [0, 1.5], 'text-anchor': 'top',
                    },
                    paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1, 'text-opacity': ['case', ['get', 'stale'], 0.5, 1], },
                });
            }
        };

        const handleClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const html = `<div style="padding: 8px;"><h3 style="margin: 0 0 8px 0; font-weight: bold;">${props?.registration || props?.callsign || props?.icao24}</h3><div style="font-size: 12px;"><div><strong>ICAO24:</strong> ${props?.icao24}</div>${props?.operator ? `<div><strong>Operator:</strong> ${props.operator}</div>` : ''}<div><strong>Altitude:</strong> ${Math.round(props?.altitude_m || 0)}m</div><div><strong>Speed:</strong> ${Math.round((props?.ground_speed_mps || 0) * 3.6)} km/h</div><div><strong>Source:</strong> ${props?.source}</div><div><strong>Age:</strong> ${props?.age_s}s</div></div></div>`;
            new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
        };

        addAircraftLayers();
        map.on('click', pointsLayerId, handleClick);

        const handleStyle = () => addAircraftLayers();
        map.on('styledata', handleStyle);

        return () => {
            map.off('click', pointsLayerId, handleClick);
            map.off('styledata', handleStyle);
            if (map.getLayer(labelsLayerId)) map.removeLayer(labelsLayerId);
            if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        };
    }, [map, isLoaded, aircraftEnabled]);

    // Update aircraft data
    useEffect(() => {
        if (!map || !aircraftData) return;
        const source = map.getSource('emergency-aircraft-source') as maplibregl.GeoJSONSource;
        if (source) source.setData(aircraftData as any);
    }, [map, aircraftData]);

    // --- EFFECT: Alerts Source & Layer Management ---
    useEffect(() => {
        if (!map || !isLoaded || !alertsEnabled) return;

        const sourceId = 'emergency-alerts-source';
        const iconLayerId = 'emergency-alerts-icons';
        const glowLayerId = 'emergency-alerts-glow';
        const clusterLayerId = 'emergency-clusters';
        const clusterCountLayerId = 'emergency-cluster-count';
        const polygonLayerId = 'emergency-alerts-polygons';
        const polygonOutlineLayerId = 'emergency-alerts-polygons-outline';

        const setPointer = () => { if (map) map.getCanvas().style.cursor = 'pointer'; };
        const setGrab = () => { if (map) map.getCanvas().style.cursor = ''; };
        const interactiveLayers = [iconLayerId, glowLayerId, clusterLayerId, polygonLayerId];

        const addLayers = () => {
            if (!map) return;

            // 1. Source
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: alertsData?.features || [] } as any,
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50,
                });
            }

            // 2. Polygonal Fills (Lowest)
            if (!map.getLayer(polygonLayerId)) {
                map.addLayer({
                    id: polygonLayerId,
                    type: 'fill',
                    source: sourceId,
                    filter: ['all', ['!', ['has', 'point_count']], ['any', ['==', ['$type'], 'Polygon'], ['==', ['$type'], 'MultiPolygon']]],
                    paint: {
                        'fill-color': [
                            'match',
                            ['coalesce', ['get', 'severity_rank'], 4],
                            1, '#ef4444',
                            2, '#f97316',
                            3, '#eab308',
                            '#3b82f6'
                        ],
                        'fill-opacity': 0.15
                    }
                } as any, map.getLayer('emergency-aircraft-points') ? 'emergency-aircraft-points' : undefined);
            }

            // 3. Polygonal Outlines
            if (!map.getLayer(polygonOutlineLayerId)) {
                map.addLayer({
                    id: polygonOutlineLayerId,
                    type: 'line',
                    source: sourceId,
                    filter: ['all', ['!', ['has', 'point_count']], ['any', ['==', ['$type'], 'Polygon'], ['==', ['$type'], 'MultiPolygon']]],
                    paint: {
                        'line-color': [
                            'match',
                            ['coalesce', ['get', 'severity_rank'], 4],
                            1, '#ef4444', 2, '#f97316', 3, '#eab308', '#3b82f6'
                        ],
                        'line-width': 2,
                        'line-opacity': 0.6
                    }
                } as any);
            }

            // 4. Clusters
            if (!map.getLayer(clusterLayerId)) {
                map.addLayer({
                    id: clusterLayerId,
                    type: 'circle',
                    source: sourceId,
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': ['step', ['get', 'point_count'], '#fbbf24', 10, '#f59e0b', 50, '#ef4444'],
                        'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                    }
                });
            }

            if (!map.getLayer(clusterCountLayerId)) {
                map.addLayer({
                    id: clusterCountLayerId,
                    type: 'symbol',
                    source: sourceId,
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': '{point_count_abbreviated}',
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 12,
                    },
                    paint: { 'text-color': '#ffffff' }
                });
            }

            // 5. Unclustered Glow
            if (!map.getLayer(glowLayerId)) {
                map.addLayer({
                    id: glowLayerId,
                    type: 'circle',
                    source: sourceId,
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 10, 9, 15, 13],
                        'circle-color': [
                            'match',
                            ['coalesce', ['get', 'severity_rank'], 4],
                            1, '#ef4444', 2, '#f97316', 3, '#eab308', '#3b82f6'
                        ],
                        'circle-opacity': 0.4,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': 'rgba(15, 23, 42, 0.5)',
                    },
                });
            }

            // 6. Alert Icons
            if (!map.getLayer(iconLayerId)) {
                map.addLayer({
                    id: iconLayerId,
                    type: 'symbol',
                    source: sourceId,
                    filter: ['!', ['has', 'point_count']],
                    layout: {
                        'icon-image': ['get', 'markerIcon'],
                        'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 10, 0.75, 15, 1.0],
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                    }
                });
            }
        };

        const handleAlertClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const html = `
                <div style="padding: 12px; max-width: 320px; background: #0f172a; color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">${props?.hazard_type?.toLowerCase()?.includes('fire') ? '🔥' : (props?.hazard_type?.toLowerCase()?.includes('flood') ? '🌊' : '⚠️')}</span>
                        <div>
                            <h3 style="margin: 0; font-weight: bold; font-size: 14px; color: ${getSeverityColor(props?.severity_rank)}; line-height: 1.2;">
                                ${props?.title}
                            </h3>
                            <div style="font-size: 10px; opacity: 0.6; margin-top: 2px;">${props?.source_id}</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; line-height: 1.5;">
                        <div style="opacity: 0.9; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; max-height: 200px; overflow-y: auto;">
                            ${props?.description || 'No detailed description available.'}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(0,0,0,0.2); padding: 8px; rounded: 8px;">
                            <div><span style="opacity: 0.5; font-size: 10px; display: block;">Severity</span> <span style="font-weight: bold; color: ${getSeverityColor(props?.severity_rank)};">${props?.severity}</span></div>
                            <div><span style="opacity: 0.5; font-size: 10px; display: block;">Region</span> <span style="font-weight: bold;">${props?.state}</span></div>
                        </div>
                        ${props?.url ? `<div style="margin-top: 15px;"><a href="${props.url}" target="_blank" style="display: block; background: #3b82f6; color: white; text-align: center; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px; transition: transform 0.2s; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);">VIEW OFFICIAL NOTICE</a></div>` : ''}
                        <div style="margin-top: 12px; font-size: 10px; opacity: 0.4; text-align: left; font-style: italic;">
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

        const handleClusterClick = (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            if (source && (source as any).getClusterExpansionZoom) {
                (source as any).getClusterExpansionZoom(clusterId, (err: any, zoom?: number) => {
                    if (err) return;
                    map.easeTo({
                        center: (features[0].geometry as any).coordinates,
                        zoom: (zoom || 0) + 1
                    });
                });
            }
        };

        addLayers();

        // Register handlers once
        map.on('click', iconLayerId, handleAlertClick);
        map.on('click', glowLayerId, handleAlertClick);
        map.on('click', clusterLayerId, handleClusterClick);
        interactiveLayers.forEach(lyr => {
            map.on('mouseenter', lyr, setPointer);
            map.on('mouseleave', lyr, setGrab);
        });

        const handleStyleData = () => addLayers();
        map.on('styledata', handleStyleData);

        return () => {
            if (map) {
                map.off('styledata', handleStyleData);
                map.off('click', iconLayerId, handleAlertClick);
                map.off('click', glowLayerId, handleAlertClick);
                map.off('click', clusterLayerId, handleClusterClick);
                interactiveLayers.forEach(lyr => {
                    map.off('mouseenter', lyr, setPointer);
                    map.off('mouseleave', lyr, setGrab);
                });
                if (map.getLayer(iconLayerId)) map.removeLayer(iconLayerId);
                if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
                if (map.getLayer(polygonOutlineLayerId)) map.removeLayer(polygonOutlineLayerId);
                if (map.getLayer(polygonLayerId)) map.removeLayer(polygonLayerId);
                if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
                if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            }
        };
    }, [map, isLoaded, alertsEnabled]);

    // Update data separately
    useEffect(() => {
        if (!map || !alertsData) return;
        const source = map.getSource('emergency-alerts-source') as maplibregl.GeoJSONSource;
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: alertsData.features
            } as any);
        }
    }, [map, alertsData]);



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
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1 mb-2 block">Operational Mode</label>
                                <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setOpsMode('all')}
                                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'all' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        ALL
                                    </button>
                                    <button
                                        onClick={() => setOpsMode('warning')}
                                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'warning' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        WARNINGS
                                    </button>
                                    <button
                                        onClick={() => setOpsMode('ground_truth')}
                                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'ground_truth' ? 'bg-red-500/20 text-red-400 shadow-inner' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        GROUND
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1 mb-2 block">Hazard Filters</label>
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
                                                        ? `${type.activeBg} ${type.activeText} shadow-lg scale-105 ring-1 ring-white/20`
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
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Live Situation Feed</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {alertsLoading ? (
                                    <div className="text-[10px] text-white/30 animate-pulse text-center py-4 italic">Synchronizing feeds...</div>
                                ) : alertsData?.features.length === 0 ? (
                                    <div className="text-[10px] text-white/30 text-center py-4 italic">No active reports for current filters.</div>
                                ) : (
                                    alertsData?.features.slice(0, 15).map((feature: any) => {
                                        const desc = String(feature.properties.description || '');
                                        const cleanDesc = desc.replace(/<[^>]*>?/gm, '').substring(0, 100);
                                        const coords = feature.geometry?.coordinates;

                                        return (
                                            <div
                                                key={feature.properties.id || Math.random()}
                                                onClick={() => {
                                                    if (map && coords) {
                                                        const target = Array.isArray(coords[0]) ? coords[0][0] : coords;
                                                        map.flyTo({
                                                            center: target as any,
                                                            zoom: 12,
                                                            duration: 1500
                                                        });
                                                    }
                                                }}
                                                className="bg-black/40 p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge className={`text-[8px] h-4 ${getSeverityBadgeColor(feature.properties.severity_rank)}`}>
                                                        {feature.properties.severity}
                                                    </Badge>
                                                    <span className="text-[8px] text-white/30">{feature.properties.state} • {Math.floor(feature.properties.age_s / 60)}m ago</span>
                                                </div>
                                                <h5 className="text-[11px] font-bold text-white/90 line-clamp-1 group-hover:text-white transition-colors">
                                                    {feature.properties.title}
                                                </h5>
                                                <p className="text-[9px] text-white/50 line-clamp-2 mt-1 leading-relaxed">
                                                    {cleanDesc}{cleanDesc.length >= 100 ? '...' : ''}
                                                </p>
                                            </div>
                                        );
                                    })
                                )}
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

function getSeverityBadgeColor(rank?: number): string {
    switch (rank) {
        case 1: return 'bg-red-500/20 text-red-500 border-red-500/30';
        case 2: return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
        case 3: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        default: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    }
}

export default EmergencyPanel;
