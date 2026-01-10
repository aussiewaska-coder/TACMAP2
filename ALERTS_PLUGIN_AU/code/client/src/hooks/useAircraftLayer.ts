// Map layer hook for live aircraft tracking
// Renders aircraft points and optional labels using MapLibre

import { useEffect, useMemo } from 'react';
import { useMapStore } from '@/stores';
import maplibregl from 'maplibre-gl';
import DOMPurify from 'isomorphic-dompurify';
import { isMapValid } from '@/utils/mapUtils';

export interface UseAircraftLayerOptions {
    enabled: boolean;
    data: any | null;
    showMarkers?: boolean;
    layerPrefix?: string;
}

export function useAircraftLayer(options: UseAircraftLayerOptions) {
    const { enabled, data, showMarkers = true, layerPrefix = 'aircraft' } = options;
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    const geoJsonData = useMemo(() => {
        if (!data || !data.features) {
            return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
        }

        const features = data.features.filter((f: any) => f?.geometry?.type === 'Point');
        return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    }, [data]);

    useEffect(() => {
        if (!map || !isLoaded || !enabled) return;

        const sourceId = `${layerPrefix}-source`;
        const pointLayerId = `${layerPrefix}-points`;
        const labelLayerId = `${layerPrefix}-labels`;

        const ensureSource = () => {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: geoJsonData as any
                });
            } else {
                (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geoJsonData as any);
            }
        };

        const ensureLayers = () => {
            if (!map.getLayer(pointLayerId)) {
                map.addLayer({
                    id: pointLayerId,
                    type: 'circle',
                    source: sourceId,
                    paint: {
                        'circle-radius': [
                            'case',
                            ['==', ['get', 'onGround'], true], 4,
                            6
                        ],
                        'circle-color': [
                            'match',
                            ['get', 'status'],
                            'stale', '#64748b',
                            'active', '#22c55e',
                            '#f59e0b'
                        ],
                        'circle-stroke-width': 1.5,
                        'circle-stroke-color': '#0f172a',
                        'circle-opacity': 0.9
                    },
                    layout: { visibility: showMarkers ? 'visible' : 'none' }
                });
            }

            if (!map.getLayer(labelLayerId)) {
                map.addLayer({
                    id: labelLayerId,
                    type: 'symbol',
                    source: sourceId,
                    layout: {
                        'text-field': [
                            'coalesce',
                            ['get', 'callsign'],
                            ['get', 'registration'],
                            ['get', 'icao24']
                        ],
                        'text-size': 10,
                        'text-offset': [0, 1.2],
                        'text-anchor': 'top',
                        visibility: showMarkers ? 'visible' : 'none'
                    },
                    paint: {
                        'text-color': '#e2e8f0',
                        'text-halo-color': '#0f172a',
                        'text-halo-width': 1
                    }
                } as maplibregl.LayerSpecification);
            }

            if (map.getLayer(pointLayerId)) {
                map.setLayoutProperty(pointLayerId, 'visibility', showMarkers ? 'visible' : 'none');
            }
            if (map.getLayer(labelLayerId)) {
                map.setLayoutProperty(labelLayerId, 'visibility', showMarkers ? 'visible' : 'none');
            }
        };

        const handleClick = (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties || {};

            const safeCallsign = DOMPurify.sanitize(props.callsign || props.registration || props.icao24 || 'Aircraft', { ALLOWED_TAGS: [] });
            const safeOperator = DOMPurify.sanitize(props.operator || 'Unknown', { ALLOWED_TAGS: [] });
            const safeStatus = DOMPurify.sanitize(props.status || 'unknown', { ALLOWED_TAGS: [] });

            const html = `
                <div style="padding: 14px; background: #0f172a; color: white; border-radius: 12px; max-width: 280px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #22c55e;">
                        ✈️ ${safeCallsign}
                    </h3>
                    <div style="font-size: 12px; opacity: 0.9; line-height: 1.4;">
                        <div><strong>Operator:</strong> ${safeOperator}</div>
                        <div><strong>Status:</strong> ${safeStatus}</div>
                        <div><strong>Altitude:</strong> ${props.altitude_m ?? 'n/a'} m</div>
                        <div><strong>Speed:</strong> ${props.speed ?? 'n/a'} kt</div>
                    </div>
                </div>
            `;

            new maplibregl.Popup({ maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        };

        const attachHandlers = () => {
            if (map.getLayer(pointLayerId)) {
                map.off('click', pointLayerId, handleClick);
                map.on('click', pointLayerId, handleClick);
            }
        };

        const detachHandlers = () => {
            map.off('click', pointLayerId, handleClick);
        };

        const render = () => {
            if (!isMapValid(map)) return;
            ensureSource();
            ensureLayers();
            attachHandlers();
        };

        render();

        const handleStyleData = () => {
            if (!enabled || !isMapValid(map)) return;
            render();
        };

        map.on('styledata', handleStyleData);

        return () => {
            if (!isMapValid(map)) return;
            try {
                map.off('styledata', handleStyleData);
                detachHandlers();
                if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
                if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);
            } catch {
                // Map may be destroyed
            }
        };
    }, [map, isLoaded, enabled, geoJsonData, showMarkers, layerPrefix]);

    return {
        trackCount: geoJsonData.features.length
    };
}
