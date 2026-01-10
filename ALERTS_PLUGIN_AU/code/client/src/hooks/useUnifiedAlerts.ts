// useUnifiedAlerts - SIMPLIFIED - JUST SHOW THE FUCKING DOTS
import { useEffect, useMemo } from 'react';
import { useMapStore, useMapProviderStore } from '@/stores';
import mapboxgl from 'mapbox-gl';
import maplibregl from 'maplibre-gl';
import DOMPurify from 'isomorphic-dompurify';
import { isMapValid } from '@/utils/mapUtils';

export type AlertSource = 'emergency' | 'police';

export interface UseUnifiedAlertsOptions {
    enabled: boolean;
    alertSource: AlertSource;
    data: any | null;
    showMarkers?: boolean;
    layerPrefix: string;
    clusterRadius?: number;
    clusterMaxZoom?: number;
}

export function useUnifiedAlerts(options: UseUnifiedAlertsOptions) {
    const { enabled, alertSource, data, showMarkers = true, layerPrefix, clusterRadius = 60, clusterMaxZoom = 14 } = options;
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);
    const provider = useMapProviderStore((state) => state.provider);

    // Convert to simple GeoJSON
    const geoJsonData = useMemo(() => {
        if (!data) {
            console.warn('⚠️ No data provided to useUnifiedAlerts');
            return { type: 'FeatureCollection', features: [] };
        }

        // Emergency: data is already a FeatureCollection
        if (alertSource === 'emergency' && data.features) {
            const pointCount = data.features.filter((f: any) => f.geometry.type === 'Point').length;
            const polygonCount = data.features.length - pointCount;
            console.log(`✅ EMERGENCY: ${data.features.length} features (${pointCount} points, ${polygonCount} polygons)`);
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
        const clusterLayerId = `${layerPrefix}-clusters`;
        const clusterCountLayerId = `${layerPrefix}-cluster-count`;
        const layerId = `${layerPrefix}-dots`;
        const polygonLayerId = `${layerPrefix}-polygons`;
        const polygonOutlineLayerId = `${layerPrefix}-outline`;
        const clusterEnabled = alertSource === 'police';

        console.log(`🎯 RENDERING ${layerPrefix}: ${geoJsonData.features.length} features`);

        const ensureSource = () => {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: geoJsonData as any,
                    cluster: clusterEnabled,
                    clusterMaxZoom: clusterMaxZoom,
                    clusterRadius: clusterRadius
                });
                console.log(`✅ Source added: ${sourceId} (clustering enabled: ${clusterEnabled})`);
            } else {
                (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
                console.log(`✅ Source updated: ${sourceId}`);
            }
        };

        const ensureLayers = () => {
            if (clusterEnabled) {
                if (!map.getLayer(clusterLayerId)) {
                    map.addLayer({
                        id: clusterLayerId,
                        type: 'circle',
                        source: sourceId,
                        filter: ['has', 'point_count'],
                        paint: {
                            'circle-color': alertSource === 'emergency' ? '#ef4444' : '#dc2626',
                            'circle-radius': 12,
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#FFFFFF',
                            'circle-opacity': 0.9
                        },
                        layout: { visibility: showMarkers ? 'visible' : 'none' }
                    });
                    console.log(`✅ Cluster layer added: ${clusterLayerId}`);
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
                            'text-size': 10,
                            visibility: showMarkers ? 'visible' : 'none'
                        },
                        paint: {
                            'text-color': '#FFFFFF'
                        }
                    });
                    console.log(`✅ Cluster count layer added: ${clusterCountLayerId}`);
                }
            }

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
                        'circle-radius': 12,
                        'circle-color': alertSource === 'emergency' ? '#ef4444' : '#dc2626',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#FFFFFF',
                        'circle-opacity': 0.9
                    },
                    layout: { visibility: showMarkers ? 'visible' : 'none' }
                });
                console.log(`✅ Unclustered points layer added: ${layerId}`);
            }

            if (clusterEnabled && map.getLayer(clusterLayerId)) {
                map.setLayoutProperty(clusterLayerId, 'visibility', showMarkers ? 'visible' : 'none');
            }
            if (clusterEnabled && map.getLayer(clusterCountLayerId)) {
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
        };

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

            const PopupClass = provider === 'mapbox' ? mapboxgl.Popup : maplibregl.Popup;
            new PopupClass({ maxWidth: '350px' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        };

        const handleClusterEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const handleClusterLeave = () => {
            map.getCanvas().style.cursor = '';
        };
        const handlePointEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const handlePointLeave = () => {
            map.getCanvas().style.cursor = '';
        };
        const handlePolygonEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const handlePolygonLeave = () => {
            map.getCanvas().style.cursor = '';
        };

        const attachHandlers = () => {
            if (clusterEnabled && map.getLayer(clusterLayerId)) {
                map.off('click', clusterLayerId, handleClusterClick);
                map.off('mouseenter', clusterLayerId, handleClusterEnter);
                map.off('mouseleave', clusterLayerId, handleClusterLeave);
                map.on('click', clusterLayerId, handleClusterClick);
                map.on('mouseenter', clusterLayerId, handleClusterEnter);
                map.on('mouseleave', clusterLayerId, handleClusterLeave);
            }

            if (map.getLayer(layerId)) {
                map.off('click', layerId, handleClick);
                map.off('mouseenter', layerId, handlePointEnter);
                map.off('mouseleave', layerId, handlePointLeave);
                map.on('click', layerId, handleClick);
                map.on('mouseenter', layerId, handlePointEnter);
                map.on('mouseleave', layerId, handlePointLeave);
            }

            if (alertSource === 'emergency' && map.getLayer(polygonLayerId)) {
                map.off('click', polygonLayerId, handleClick);
                map.off('mouseenter', polygonLayerId, handlePolygonEnter);
                map.off('mouseleave', polygonLayerId, handlePolygonLeave);
                map.on('click', polygonLayerId, handleClick);
                map.on('mouseenter', polygonLayerId, handlePolygonEnter);
                map.on('mouseleave', polygonLayerId, handlePolygonLeave);
            }
        };

        const detachHandlers = () => {
            if (clusterEnabled) {
                map.off('click', clusterLayerId, handleClusterClick);
                map.off('mouseenter', clusterLayerId, handleClusterEnter);
                map.off('mouseleave', clusterLayerId, handleClusterLeave);
            }
            map.off('click', layerId, handleClick);
            map.off('mouseenter', layerId, handlePointEnter);
            map.off('mouseleave', layerId, handlePointLeave);
            if (alertSource === 'emergency') {
                map.off('click', polygonLayerId, handleClick);
                map.off('mouseenter', polygonLayerId, handlePolygonEnter);
                map.off('mouseleave', polygonLayerId, handlePolygonLeave);
            }
        };

        const renderLayers = () => {
            if (!isMapValid(map)) return;
            ensureSource();
            ensureLayers();
            attachHandlers();
        };

        renderLayers();

        const handleStyleData = () => {
            if (!enabled || !isMapValid(map)) return;
            renderLayers();
        };

        map.on('styledata', handleStyleData);

        // Cleanup
        return () => {
            // Check if map is still valid before cleanup
            if (!isMapValid(map)) return;
            try {
                map.off('styledata', handleStyleData);
                detachHandlers();
                if (map.getLayer(clusterCountLayerId)) {
                    map.removeLayer(clusterCountLayerId);
                }
                if (map.getLayer(clusterLayerId)) {
                    map.removeLayer(clusterLayerId);
                }
                if (map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                }
                if (map.getLayer(polygonLayerId)) {
                    map.removeLayer(polygonLayerId);
                }
                if (map.getLayer(polygonOutlineLayerId)) {
                    map.removeLayer(polygonOutlineLayerId);
                }
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
            } catch {
                // Map may be destroyed
            }
        };
    }, [map, isLoaded, enabled, geoJsonData, showMarkers, layerPrefix, alertSource, clusterRadius, clusterMaxZoom, provider]);

    return {
        alertCount: geoJsonData.features.length
    };
}
