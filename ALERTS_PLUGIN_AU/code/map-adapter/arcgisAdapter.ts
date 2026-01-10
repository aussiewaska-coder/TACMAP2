// ArcGIS JS adapter skeleton for the alerts plugin
// NOTE: ArcGIS JS uses layers (GeoJSONLayer, GraphicsLayer) rather than sources.
// Fill in these methods based on your ArcGIS JS map/view instances.

import type { MapAdapter } from './types.js';

export class ArcGISAdapter implements MapAdapter {
    constructor(private view: __esri.MapView) {}

    addGeoJsonSource(id: string, data: GeoJSON.FeatureCollection): void {
        // TODO: Create or update a GeoJSONLayer or GraphicsLayer.
        // Example approach: new GeoJSONLayer({ id, source: data.features })
        void id;
        void data;
        throw new Error('ArcGISAdapter.addGeoJsonSource not implemented');
    }

    updateGeoJsonSource(id: string, data: GeoJSON.FeatureCollection): void {
        // TODO: Update layer source or replace layer.
        void id;
        void data;
        throw new Error('ArcGISAdapter.updateGeoJsonSource not implemented');
    }

    addLayer(layerSpec: unknown): void {
        // TODO: Translate layerSpec to ArcGIS layer instance and add to view.map.
        void layerSpec;
        throw new Error('ArcGISAdapter.addLayer not implemented');
    }

    setLayerVisibility(id: string, visible: boolean): void {
        // TODO: Find layer by id and set visible.
        void id;
        void visible;
        throw new Error('ArcGISAdapter.setLayerVisibility not implemented');
    }

    removeLayer(id: string): void {
        // TODO: Remove layer by id from view.map.
        void id;
        throw new Error('ArcGISAdapter.removeLayer not implemented');
    }

    removeSource(id: string): void {
        // TODO: No-op or alias to removeLayer for ArcGIS.
        void id;
        throw new Error('ArcGISAdapter.removeSource not implemented');
    }

    on(event: string, layerId: string, handler: (e: unknown) => void): void {
        // TODO: Use view.on for pointer events and hitTest to filter by layerId.
        void event;
        void layerId;
        void handler;
        throw new Error('ArcGISAdapter.on not implemented');
    }

    off(event: string, layerId: string, handler: (e: unknown) => void): void {
        // TODO: Track handlers and remove with handle.remove().
        void event;
        void layerId;
        void handler;
        throw new Error('ArcGISAdapter.off not implemented');
    }

    queryRenderedFeatures(point: { x: number; y: number }, options: { layers: string[] }): unknown[] {
        // TODO: Use view.hitTest with screen point and filter by layer ids.
        void point;
        void options;
        throw new Error('ArcGISAdapter.queryRenderedFeatures not implemented');
    }

    async easeTo(options: { center: [number, number]; zoom?: number }): Promise<void> {
        await this.view.goTo({ center: options.center, zoom: options.zoom });
    }

    async getClusterExpansionZoom(_sourceId: string, _clusterId: number): Promise<number> {
        // TODO: ArcGIS has clusterExpansionZoom on FeatureLayer view.
        throw new Error('ArcGISAdapter.getClusterExpansionZoom not implemented');
    }

    addPopup(options: { lngLat: [number, number]; html: string; maxWidth?: string }): void {
        // TODO: Use view.openPopup with location + content.
        void options;
        throw new Error('ArcGISAdapter.addPopup not implemented');
    }
}
