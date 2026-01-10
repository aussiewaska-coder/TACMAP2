// Mapbox GL JS adapter (full Mapbox GL JS implementation)

import type mapboxgl from 'mapbox-gl';
import type { MapAdapter } from './types.js';

export class MapboxAdapter implements MapAdapter {
    constructor(private map: mapboxgl.Map) {}

    addGeoJsonSource(id: string, data: GeoJSON.FeatureCollection, options?: {
        cluster?: boolean;
        clusterRadius?: number;
        clusterMaxZoom?: number;
    }): void {
        if (this.map.getSource(id)) return;
        this.map.addSource(id, {
            type: 'geojson',
            data,
            cluster: options?.cluster,
            clusterRadius: options?.clusterRadius,
            clusterMaxZoom: options?.clusterMaxZoom
        });
    }

    updateGeoJsonSource(id: string, data: GeoJSON.FeatureCollection): void {
        const source = this.map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
        if (!source) return;
        source.setData(data as any);
    }

    addLayer(layerSpec: unknown): void {
        this.map.addLayer(layerSpec as mapboxgl.Layer);
    }

    setLayerVisibility(id: string, visible: boolean): void {
        if (!this.map.getLayer(id)) return;
        this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }

    removeLayer(id: string): void {
        if (this.map.getLayer(id)) this.map.removeLayer(id);
    }

    removeSource(id: string): void {
        if (this.map.getSource(id)) this.map.removeSource(id);
    }

    on(event: string, layerId: string, handler: (e: unknown) => void): void {
        this.map.on(event as keyof mapboxgl.MapLayerEventType, layerId, handler as any);
    }

    off(event: string, layerId: string, handler: (e: unknown) => void): void {
        this.map.off(event as keyof mapboxgl.MapLayerEventType, layerId, handler as any);
    }

    queryRenderedFeatures(point: { x: number; y: number }, options: { layers: string[] }): unknown[] {
        return this.map.queryRenderedFeatures(point as any, options as any);
    }

    easeTo(options: { center: [number, number]; zoom?: number }): void {
        this.map.easeTo(options as mapboxgl.EaseToOptions);
    }

    getClusterExpansionZoom(sourceId: string, clusterId: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const source = this.map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
            if (!source) return reject(new Error('Missing source'));
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return reject(err);
                resolve(zoom);
            });
        });
    }

    addPopup(options: { lngLat: [number, number]; html: string; maxWidth?: string }): void {
        new mapboxgl.Popup({ maxWidth: options.maxWidth || '350px' })
            .setLngLat(options.lngLat)
            .setHTML(options.html)
            .addTo(this.map);
    }
}
