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
    const { enabled, alertSource, data, showMarkers = true, layerPrefix } = options;
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
            const features = data.map((item: any) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [Number(item.longitude), Number(item.latitude)]
                },
                properties: {
                    ...item,
                    title: `${item.type} Alert`
                }
            }));
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
        const layerId = `${layerPrefix}-dots`;
        const polygonLayerId = `${layerPrefix}-polygons`;
        const polygonOutlineLayerId = `${layerPrefix}-outline`;

        console.log(`🎯 RENDERING ${layerPrefix}: ${geoJsonData.features.length} features`);

        // Add source
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geoJsonData as any,
                cluster: false // NO CLUSTERING - KEEP IT SIMPLE
            });
            console.log(`✅ Source added: ${sourceId}`);
        } else {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
            console.log(`✅ Source updated: ${sourceId}`);
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

        // Add SIMPLE CIRCLE DOTS layer
        if (!map.getLayer(layerId)) {
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                    'circle-radius': 10,
                    'circle-color': alertSource === 'emergency' ? '#ef4444' : '#dc2626',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#FFFFFF',
                    'circle-opacity': 0.9
                },
                layout: { visibility: showMarkers ? 'visible' : 'none' }
            });
            console.log(`✅ Circle layer added: ${layerId}`);
        }

        // Update visibility
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(polygonLayerId)) {
            map.setLayoutProperty(polygonLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }
        if (map.getLayer(polygonOutlineLayerId)) {
            map.setLayoutProperty(polygonOutlineLayerId, 'visibility', showMarkers ? 'visible' : 'none');
        }

        // POPUP CLICK HANDLER
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

        map.on('click', layerId, handleClick);
        if (alertSource === 'emergency') {
            map.on('click', polygonLayerId, handleClick);
        }

        // Cursor
        const setCursor = (cursor: string) => () => {
            if (map) map.getCanvas().style.cursor = cursor;
        };
        map.on('mouseenter', layerId, setCursor('pointer'));
        map.on('mouseleave', layerId, setCursor(''));
        if (alertSource === 'emergency') {
            map.on('mouseenter', polygonLayerId, setCursor('pointer'));
            map.on('mouseleave', polygonLayerId, setCursor(''));
        }

        // Cleanup
        return () => {
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
    }, [map, isLoaded, enabled, geoJsonData, showMarkers, layerPrefix, alertSource]);

    return {
        alertCount: geoJsonData.features.length
    };
}
