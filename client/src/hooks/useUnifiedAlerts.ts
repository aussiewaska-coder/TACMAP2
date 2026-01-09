// useUnifiedAlerts - SIMPLIFIED - JUST SHOW THE FUCKING DOTS
import { useEffect, useMemo } from 'react';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';
import DOMPurify from 'isomorphic-dompurify';

export type AlertSource = 'emergency' | 'police';

export interface UseUnifiedAlertsOptions {
    enabled: boolean;
    alertSource: AlertSource;
    data: any | null;
    showHeatmap?: boolean;
    showMarkers?: boolean;
    layerPrefix: string;
    clusterRadius?: number;
    clusterMaxZoom?: number;
}

export function useUnifiedAlerts(options: UseUnifiedAlertsOptions) {
    const { enabled, alertSource, data, showMarkers = true, showHeatmap = false, layerPrefix, clusterRadius = 60, clusterMaxZoom = 14 } = options;
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // Convert to simple GeoJSON
    const geoJsonData = useMemo(() => {
        if (!data) {
            return { type: 'FeatureCollection', features: [] };
        }

        // Emergency: data is already a FeatureCollection
        if (alertSource === 'emergency' && data.features) {
            console.log(`✅ EMERGENCY: ${data.features.length} features`);
            return data;
        }

        // Police: data is an array
        if (alertSource === 'police' && Array.isArray(data)) {
            console.log(`✅ POLICE: ${data.length} items`);
            const features = data.map((item: any) => {
                // Calculate age in seconds for time-based weighting
                const timestamp = item.reportedAt || item.timestamp || item.createdAt;
                const ageSeconds = timestamp ? Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000) : 0;

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [Number(item.longitude), Number(item.latitude)]
                    },
                    properties: {
                        ...item,
                        title: `${item.type} Alert`,
                        age_s: ageSeconds // Add age for heatmap weighting
                    }
                };
            });
            return { type: 'FeatureCollection', features };
        }

        console.warn('⚠️ Unknown data format', { alertSource, data });
        return { type: 'FeatureCollection', features: [] };
    }, [data, alertSource]);

    // RENDER LAYERS
    useEffect(() => {
        if (!map || !isLoaded || !enabled) {
            console.log(`❌ Not rendering: map=${!!map}, loaded=${isLoaded}, enabled=${enabled}`);
            return;
        }

        const sourceId = `${layerPrefix}-source`;
        const heatmapLayerId = `${layerPrefix}-heatmap`;
        const clusterLayerId = `${layerPrefix}-clusters`;
        const clusterCountLayerId = `${layerPrefix}-cluster-count`;
        const layerId = `${layerPrefix}-dots`;
        const polygonLayerId = `${layerPrefix}-polygons`;
        const polygonOutlineLayerId = `${layerPrefix}-outline`;

        console.log(`🎯 RENDERING ${layerPrefix}: ${geoJsonData.features.length} features`);

        // Add source with clustering enabled
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geoJsonData as any,
                cluster: true,
                clusterMaxZoom: clusterMaxZoom,
                clusterRadius: clusterRadius
            });
            console.log(`✅ Source added: ${sourceId} (clustering enabled: radius=${clusterRadius}, maxZoom=${clusterMaxZoom})`);
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
            console.log(`✅ Source updated: ${sourceId}`);
        }

        // Add HEATMAP layer - Time-weighted with large radius for proper blending
        if (!map.getLayer(heatmapLayerId)) {
            map.addLayer({
                id: heatmapLayerId,
                type: 'heatmap',
                source: sourceId,
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                    // Time-based weight: newer alerts are hotter (exponential decay over 7 days)
                    // age_s = 0 (now) -> weight = 1.0
                    // age_s = 86400 (1 day) -> weight = 0.8
                    // age_s = 604800 (7 days) -> weight = 0.3
                    // age_s = 1209600+ (14 days) -> weight = 0.1
                    'heatmap-weight': [
                        'interpolate',
                        ['exponential', 0.5],
                        ['get', 'age_s'],
                        0, 1.0,        // Just now: full weight
                        86400, 0.8,    // 1 day old: 80%
                        259200, 0.6,   // 3 days old: 60%
                        604800, 0.3,   // 7 days old: 30%
                        1209600, 0.1   // 14 days old: 10%
                    ],
                    // High intensity across all zoom levels
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 2,
                        9, 3,
                        14, 5
                    ],
                    // Color ramp: transparent -> purple -> red -> orange -> yellow
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(0, 0, 0, 0)',
                        0.1, 'rgb(128, 0, 255)',
                        0.3, 'rgb(255, 0, 0)',
                        0.5, 'rgb(255, 100, 0)',
                        0.7, 'rgb(255, 200, 0)',
                        1, 'rgb(255, 255, 0)'
                    ],
                    // Much larger radius for smooth blending
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 60,
                        5, 80,
                        10, 100,
                        14, 120
                    ],
                    // Full opacity
                    'heatmap-opacity': 0.85
                },
                layout: { visibility: showHeatmap ? 'visible' : 'none' }
            });
            console.log(`✅ Heatmap layer added: ${heatmapLayerId}`);
        }

        // Add CLUSTER CIRCLE layer - consistent small size
        if (!map.getLayer(clusterLayerId)) {
            map.addLayer({
                id: clusterLayerId,
                type: 'circle',
                source: sourceId,
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': alertSource === 'emergency' ? '#ef4444' : '#dc2626',
                    'circle-radius': 12, // Fixed size for all clusters
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#FFFFFF',
                    'circle-opacity': 0.9
                },
                layout: { visibility: showMarkers ? 'visible' : 'none' }
            });
            console.log(`✅ Cluster layer added: ${clusterLayerId}`);
        }

        // Add CLUSTER COUNT TEXT layer - smaller text
        if (!map.getLayer(clusterCountLayerId)) {
            map.addLayer({
                id: clusterCountLayerId,
                type: 'symbol',
                source: sourceId,
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 10,
                    visibility: showMarkers ? 'visible' : 'none'
                },
                paint: {
                    'text-color': '#FFFFFF'
                }
            });
            console.log(`✅ Cluster count layer added: ${clusterCountLayerId}`);
        }

        // Add POLYGON layer (for fire perimeters)
        if (alertSource === 'emergency' && !map.getLayer(polygonLayerId)) {
            map.addLayer({
                id: polygonLayerId,
                type: 'fill',
                source: sourceId,
                filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                paint: {
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.2
                },
                layout: { visibility: showMarkers ? 'visible' : 'none' }
            });
            console.log(`✅ Polygon layer added`);
        }

        // Add POLYGON OUTLINE layer
        if (alertSource === 'emergency' && !map.getLayer(polygonOutlineLayerId)) {
            map.addLayer({
                id: polygonOutlineLayerId,
                type: 'line',
                source: sourceId,
                filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                paint: {
                    'line-color': '#ef4444',
                    'line-width': 2,
                    'line-opacity': 0.8
                },
                layout: { visibility: showMarkers ? 'visible' : 'none' }
            });
            console.log(`✅ Polygon outline layer added`);
        }

        // Add UNCLUSTERED POINTS layer - consistent small size matching clusters
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                filter: ['all',
                    ['==', ['geometry-type'], 'Point'],
                    ['!', ['has', 'point_count']]
                ],
                paint: {
                    'circle-radius': 12, // Same size as clusters
                    'circle-color': alertSource === 'emergency' ? '#ef4444' : '#dc2626',
                    'circle-stroke-width': 2, // Same stroke as clusters
                    'circle-stroke-color': '#FFFFFF',
                    'circle-opacity': 0.9
                },
                layout: { visibility: showMarkers ? 'visible' : 'none' }
            });
            console.log(`✅ Unclustered points layer added: ${layerId}`);
        }

        // Update visibility for all layers
        if (map.getLayer(heatmapLayerId)) {
            map.setLayoutProperty(heatmapLayerId, 'visibility', showHeatmap ? 'visible' : 'none');
        }
        if (map.getLayer(clusterLayerId)) {
            map.setLayoutProperty(clusterLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(clusterCountLayerId)) {
            map.setLayoutProperty(clusterCountLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(polygonLayerId)) {
            map.setLayoutProperty(polygonLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(polygonOutlineLayerId)) {
            map.setLayoutProperty(polygonOutlineLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }

        // CLUSTER CLICK HANDLER - Zoom into cluster
        const handleClusterClick = (e: any) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [clusterLayerId]
            });
            if (!features.length) return;

            const clusterId = features[0].properties?.cluster_id;
            const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;

            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
                map.easeTo({
                    center: (features[0].geometry as any).coordinates,
                    zoom: zoom
                });
            });
        };

        // POPUP CLICK HANDLER - Show details for individual points
        const handleClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;

            const safeTitle = DOMPurify.sanitize(props?.title || 'Alert', { ALLOWED_TAGS: [] });
            const safeDescription = DOMPurify.sanitize(props?.description || props?.subtype || 'No details', { ALLOWED_TAGS: [] });

            const html = `
                <div style="padding: 16px; background: #0f172a; color: white; border-radius: 12px; max-width: 300px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #ef4444;">
                        ${alertSource === 'emergency' ? '🔥' : '🚨'} ${safeTitle}
                    </h3>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                        ${safeDescription}
                    </p>
                </div>
            `;

            new maplibregl.Popup({ maxWidth: '350px' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        };

        // Add event listeners for clusters
        map.on('click', clusterLayerId, handleClusterClick);

        // Add event listeners for individual points
        map.on('click', layerId, handleClick);
        if (alertSource === 'emergency') {
            map.on('click', polygonLayerId, handleClick);
        }

        // Cursor handlers
        const setCursor = (cursor: string) => () => {
            if (map) map.getCanvas().style.cursor = cursor;
        };

        map.on('mouseenter', clusterLayerId, setCursor('pointer'));
        map.on('mouseleave', clusterLayerId, setCursor(''));
        map.on('mouseenter', layerId, setCursor('pointer'));
        map.on('mouseleave', layerId, setCursor(''));
        if (alertSource === 'emergency') {
            map.on('mouseenter', polygonLayerId, setCursor('pointer'));
            map.on('mouseleave', polygonLayerId, setCursor(''));
        }

        // Cleanup
        return () => {
            if (map.getLayer(clusterCountLayerId)) {
                map.removeLayer(clusterCountLayerId);
            }
            if (map.getLayer(clusterLayerId)) {
                map.off('click', clusterLayerId, handleClusterClick);
                map.off('mouseenter', clusterLayerId, setCursor('pointer'));
                map.off('mouseleave', clusterLayerId, setCursor(''));
                map.removeLayer(clusterLayerId);
            }
            if (map.getLayer(heatmapLayerId)) {
                map.removeLayer(heatmapLayerId);
            }
            if (map.getLayer(layerId)) {
                map.off('click', layerId, handleClick);
                map.off('mouseenter', layerId, setCursor('pointer'));
                map.off('mouseleave', layerId, setCursor(''));
                map.removeLayer(layerId);
            }
            if (map.getLayer(polygonLayerId)) {
                map.off('click', polygonLayerId, handleClick);
                map.off('mouseenter', polygonLayerId, setCursor('pointer'));
                map.off('mouseleave', polygonLayerId, setCursor(''));
                map.removeLayer(polygonLayerId);
            }
            if (map.getLayer(polygonOutlineLayerId)) {
                map.removeLayer(polygonOutlineLayerId);
            }
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        };
    }, [map, isLoaded, enabled, geoJsonData, showMarkers, showHeatmap, layerPrefix, alertSource, clusterRadius, clusterMaxZoom]);

    return {
        alertCount: geoJsonData.features.length
    };
}
