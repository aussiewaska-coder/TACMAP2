// useUnifiedAlerts - Unified hook for both Emergency and Police alerts
// Handles MapLibre layers, clustering, popups, and heatmaps

import { useEffect, useMemo, useState } from 'react';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';
import DOMPurify from 'isomorphic-dompurify';

export type AlertSource = 'emergency' | 'police';

export interface UnifiedAlert {
    id: string;
    source: AlertSource;
    type: string;
    subtype?: string;
    latitude: number;
    longitude: number;
    title: string;
    description?: string;
    severity?: string;
    severity_rank?: number;
    state?: string;
    timestamp: string;
    age_s?: number;
    icon?: string;
    url?: string;
    weight?: number;
    // Emergency-specific
    hazard_type?: string;
    category?: string;
    tags?: string[];
    // Police-specific
    alertReliability?: number;
    street?: string;
    city?: string;
}

export interface UseUnifiedAlertsOptions {
    enabled: boolean;
    alertSource: AlertSource;
    data: any[] | null; // Raw data from API/tRPC
    showHeatmap?: boolean;
    showMarkers?: boolean;
    layerPrefix: string; // e.g., 'emergency' or 'police'
    clusterRadius?: number;
    clusterMaxZoom?: number;
    onAlertClick?: (alert: UnifiedAlert) => void;
}

/**
 * Unified alerts hook that handles MapLibre layer rendering for both
 * Emergency and Police alert systems
 */
export function useUnifiedAlerts(options: UseUnifiedAlertsOptions) {
    const {
        enabled,
        alertSource,
        data,
        showHeatmap = false,
        showMarkers = true,
        layerPrefix,
        clusterRadius = 50,
        clusterMaxZoom = 14,
        onAlertClick
    } = options;

    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // Transform raw data to GeoJSON
    const geoJsonData = useMemo(() => {
        if (!data) return { type: 'FeatureCollection', features: [] };

        const now = Date.now();
        const features = data.map((item: any) => {
            // Emergency alerts
            if (alertSource === 'emergency') {
                return item; // Already in GeoJSON format
            }

            // Police alerts
            const reportTime = new Date(item.publishDatetimeUtc).getTime();
            const hoursOld = (now - reportTime) / (1000 * 60 * 60);
            const weight = Math.max(0.2, Math.exp(-0.05 * hoursOld));

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [Number(item.longitude), Number(item.latitude)]
                },
                properties: {
                    id: item.alertId,
                    source: 'police',
                    type: item.type,
                    subtype: item.subtype,
                    street: item.street,
                    city: item.city,
                    title: `${item.type} Alert`,
                    description: item.subtype ? item.subtype.replace(/_/g, ' ') : item.type,
                    timestamp: item.publishDatetimeUtc,
                    alertReliability: item.alertReliability,
                    weight: weight,
                    markerIcon: 'icon-police'
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features
        };
    }, [data, alertSource]);

    // --- EFFECT: Main Clustering Layers ---
    useEffect(() => {
        if (!map || !isLoaded || !enabled) return;

        const sourceId = `${layerPrefix}-source`;
        const clusterLayerId = `${layerPrefix}-clusters`;
        const clusterCountLayerId = `${layerPrefix}-cluster-count`;
        const unclusteredGlowLayerId = `${layerPrefix}-unclustered-glow`;
        const unclusteredLayerId = `${layerPrefix}-unclustered`;

        const addLayers = () => {
            if (!map) return;

            // 1. Add source
            let source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            if (!source) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: geoJsonData as any,
                    cluster: true,
                    clusterMaxZoom,
                    clusterRadius
                });
                source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            } else if (geoJsonData) {
                source.setData(geoJsonData as any);
            }

            const markerVisibility = (enabled && showMarkers) ? 'visible' : 'none';

            // 2. Clusters
            if (!map.getLayer(clusterLayerId)) {
                map.addLayer({
                    id: clusterLayerId,
                    type: 'circle',
                    source: sourceId,
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step',
                            ['get', 'point_count'],
                            '#51bbd6', // < 10
                            10, '#f1f075', // 10-50
                            50, '#f28cb1' // > 50
                        ],
                        'circle-radius': [
                            'step',
                            ['get', 'point_count'],
                            15, // < 10
                            10, 20, // 10-100
                            50, 25 // > 50
                        ],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    },
                    layout: { visibility: markerVisibility }
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
                        visibility: markerVisibility
                    },
                    paint: { 'text-color': '#ffffff' }
                });
            }

            // 3. Unclustered glow
            if (!map.getLayer(unclusteredGlowLayerId)) {
                map.addLayer({
                    id: unclusteredGlowLayerId,
                    type: 'circle',
                    source: sourceId,
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 10, 10, 15, 14],
                        'circle-color': alertSource === 'emergency'
                            ? [
                                'match',
                                ['coalesce', ['get', 'severity_rank'], 4],
                                1, '#ef4444',
                                2, '#f97316',
                                3, '#eab308',
                                '#3b82f6'
                            ]
                            : '#EF4444',
                        'circle-opacity': 0.4,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': 'rgba(255, 255, 255, 0.5)'
                    },
                    layout: { visibility: markerVisibility }
                });
            }

            // 4. Unclustered points (icons or circles)
            if (alertSource === 'emergency') {
                // Use icon layer for emergency
                if (!map.getLayer(unclusteredLayerId)) {
                    map.addLayer({
                        id: unclusteredLayerId,
                        type: 'symbol',
                        source: sourceId,
                        filter: ['!', ['has', 'point_count']],
                        layout: {
                            'icon-image': ['get', 'markerIcon'],
                            'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 10, 0.75, 15, 1.0],
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true,
                            visibility: markerVisibility
                        }
                    });
                }
            } else {
                // Use circle layer for police
                if (!map.getLayer(unclusteredLayerId)) {
                    map.addLayer({
                        id: unclusteredLayerId,
                        type: 'circle',
                        source: sourceId,
                        filter: ['!', ['has', 'point_count']],
                        paint: {
                            'circle-radius': 6,
                            'circle-color': '#B91C1C',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#FFFFFF'
                        },
                        layout: { visibility: markerVisibility }
                    });
                }
            }

            // Sync visibility
            [clusterLayerId, clusterCountLayerId, unclusteredGlowLayerId, unclusteredLayerId].forEach(id => {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, 'visibility', markerVisibility);
                }
            });
        };

        const handleClusterClick = async (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
            if (!features.length) return;
            const clusterId = features[0].properties.cluster_id;
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
            try {
                const zoom = await source.getClusterExpansionZoom(clusterId);
                map.easeTo({ center: (features[0].geometry as any).coordinates, zoom: zoom + 1 });
            } catch (err) {
                console.warn('Failed to get cluster expansion zoom', err);
            }
        };

        const handleAlertClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;

            // Sanitize all data
            const safeTitle = DOMPurify.sanitize(props?.title || 'Alert', { ALLOWED_TAGS: [] });
            const safeDescription = DOMPurify.sanitize(props?.description || 'No details available.', { ALLOWED_TAGS: [] });
            const safeSeverity = DOMPurify.sanitize(props?.severity || 'Unknown', { ALLOWED_TAGS: [] });
            const safeState = DOMPurify.sanitize(props?.state || props?.city || '', { ALLOWED_TAGS: [] });
            const safeUrl = props?.url ? DOMPurify.sanitize(props.url, { ALLOWED_TAGS: [] }) : null;
            const safeTimestamp = props?.timestamp ? new Date(props.timestamp).toLocaleString() : '';

            const getSeverityColor = (rank?: number) => {
                switch (rank) {
                    case 1: return '#dc2626';
                    case 2: return '#f59e0b';
                    case 3: return '#eab308';
                    default: return '#3b82f6';
                }
            };

            const html = `
                <div style="padding: 12px; max-width: 320px; background: #0f172a; color: white; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 24px;">${alertSource === 'emergency' ? (props?.hazard_type?.toLowerCase()?.includes('fire') ? '🔥' : '⚠️') : '🚨'}</span>
                        <div>
                            <h3 style="margin: 0; font-weight: bold; font-size: 14px; color: ${getSeverityColor(props?.severity_rank)}; line-height: 1.2;">
                                ${safeTitle}
                            </h3>
                            <div style="font-size: 10px; opacity: 0.6; margin-top: 2px;">${alertSource.toUpperCase()}</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; line-height: 1.5;">
                        <div style="opacity: 0.9; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; max-height: 150px; overflow-y: auto;">
                            ${safeDescription}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                            ${alertSource === 'emergency' ? `
                                <div><span style="opacity: 0.5; font-size: 10px; display: block;">Severity</span> <span style="font-weight: bold; color: ${getSeverityColor(props?.severity_rank)};">${safeSeverity}</span></div>
                                <div><span style="opacity: 0.5; font-size: 10px; display: block;">Region</span> <span style="font-weight: bold;">${safeState}</span></div>
                            ` : `
                                <div><span style="opacity: 0.5; font-size: 10px; display: block;">Type</span> <span style="font-weight: bold;">${DOMPurify.sanitize(props?.type || '', { ALLOWED_TAGS: [] })}</span></div>
                                <div><span style="opacity: 0.5; font-size: 10px; display: block;">Location</span> <span style="font-weight: bold;">${safeState}</span></div>
                            `}
                        </div>
                        ${safeUrl ? `<div style="margin-top: 15px;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: block; background: #3b82f6; color: white; text-align: center; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px;">VIEW DETAILS</a></div>` : ''}
                        <div style="margin-top: 12px; font-size: 10px; opacity: 0.4; text-align: left; font-style: italic;">
                            ${safeTimestamp}
                        </div>
                    </div>
                </div>
            `;

            new maplibregl.Popup({ className: 'custom-alert-popup', maxWidth: '350px' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);

            // Call custom handler if provided
            if (onAlertClick) {
                onAlertClick(props as UnifiedAlert);
            }
        };

        const setPointer = () => { if (map) map.getCanvas().style.cursor = 'pointer'; };
        const setGrab = () => { if (map) map.getCanvas().style.cursor = ''; };

        addLayers();

        // Register handlers
        map.on('click', clusterLayerId, handleClusterClick);
        map.on('click', unclusteredLayerId, handleAlertClick);
        map.on('click', unclusteredGlowLayerId, handleAlertClick);
        map.on('mouseenter', clusterLayerId, setPointer);
        map.on('mouseleave', clusterLayerId, setGrab);
        map.on('mouseenter', unclusteredLayerId, setPointer);
        map.on('mouseleave', unclusteredLayerId, setGrab);

        const handleStyle = () => addLayers();
        map.on('styledata', handleStyle);

        return () => {
            map.off('click', clusterLayerId, handleClusterClick);
            map.off('click', unclusteredLayerId, handleAlertClick);
            map.off('click', unclusteredGlowLayerId, handleAlertClick);
            map.off('mouseenter', clusterLayerId, setPointer);
            map.off('mouseleave', clusterLayerId, setGrab);
            map.off('mouseenter', unclusteredLayerId, setPointer);
            map.off('mouseleave', unclusteredLayerId, setGrab);
            map.off('styledata', handleStyle);

            if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
            if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
            if (map.getLayer(unclusteredLayerId)) map.removeLayer(unclusteredLayerId);
            if (map.getLayer(unclusteredGlowLayerId)) map.removeLayer(unclusteredGlowLayerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        };
    }, [map, isLoaded, enabled, geoJsonData, showMarkers, alertSource, layerPrefix, clusterRadius, clusterMaxZoom, onAlertClick]);

    // --- EFFECT: Heatmap Layer ---
    useEffect(() => {
        if (!map || !isLoaded || !enabled || !showHeatmap) return;

        const heatmapSourceId = `${layerPrefix}-heatmap-source`;
        const heatmapLayerId = `${layerPrefix}-heatmap`;

        const addHeatmapLayer = () => {
            if (!map) return;

            let source = map.getSource(heatmapSourceId) as maplibregl.GeoJSONSource;
            if (!source) {
                map.addSource(heatmapSourceId, {
                    type: 'geojson',
                    data: geoJsonData as any
                });
            } else if (geoJsonData) {
                source.setData(geoJsonData as any);
            }

            if (!map.getLayer(heatmapLayerId)) {
                map.addLayer({
                    id: heatmapLayerId,
                    type: 'heatmap',
                    source: heatmapSourceId,
                    maxzoom: 18,
                    paint: {
                        'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'weight'], 1], 0, 0, 0.5, 1, 1, 2],
                        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 9, 1, 15, 1.5, 18, 2],
                        'heatmap-color': [
                            'interpolate', ['linear'], ['heatmap-density'],
                            0, 'rgba(0, 0, 0, 0)',
                            0.1, 'rgba(0, 191, 255, 0.3)',
                            0.3, 'rgba(0, 0, 255, 0.4)',
                            0.5, 'rgba(0, 0, 200, 0.5)',
                            0.7, 'rgba(75, 0, 130, 0.6)',
                            0.85, 'rgba(139, 0, 139, 0.7)',
                            0.92, 'rgba(255, 0, 0, 0.8)',
                            1, 'rgba(255, 50, 50, 0.95)'
                        ],
                        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 5, 15, 10, 30, 15, 45, 18, 60],
                        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 18, 0.6]
                    }
                });
            }
        };

        addHeatmapLayer();
        const handleStyle = () => addHeatmapLayer();
        map.on('styledata', handleStyle);

        return () => {
            map.off('styledata', handleStyle);
            if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
            if (map.getSource(heatmapSourceId)) map.removeSource(heatmapSourceId);
        };
    }, [map, isLoaded, enabled, showHeatmap, geoJsonData, layerPrefix]);

    // Update data when it changes
    useEffect(() => {
        if (!map || !geoJsonData) return;

        const sourceId = `${layerPrefix}-source`;
        const heatmapSourceId = `${layerPrefix}-heatmap-source`;

        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (source) source.setData(geoJsonData as any);

        const heatmapSource = map.getSource(heatmapSourceId) as maplibregl.GeoJSONSource;
        if (heatmapSource) heatmapSource.setData(geoJsonData as any);
    }, [map, geoJsonData, layerPrefix]);

    return {
        alertCount: geoJsonData.features.length
    };
}
