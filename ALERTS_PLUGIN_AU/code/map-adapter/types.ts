// Map adapter contract for the alerts plugin
// Implement this interface for any map SDK (MapLibre, MapTiler, ArcGIS JS, etc.)

export type LngLat = [number, number];

export interface MapAdapter {
    addGeoJsonSource(id: string, data: GeoJSON.FeatureCollection, options?: {
        cluster?: boolean;
        clusterRadius?: number;
        clusterMaxZoom?: number;
    }): void;
    updateGeoJsonSource(id: string, data: GeoJSON.FeatureCollection): void;
    addLayer(layerSpec: unknown): void;
    setLayerVisibility(id: string, visible: boolean): void;
    removeLayer(id: string): void;
    removeSource(id: string): void;
    on(event: string, layerId: string, handler: (e: unknown) => void): void;
    off(event: string, layerId: string, handler: (e: unknown) => void): void;
    queryRenderedFeatures(point: { x: number; y: number }, options: { layers: string[] }): unknown[];
    easeTo(options: { center: LngLat; zoom?: number }): void;
    getClusterExpansionZoom(sourceId: string, clusterId: number): Promise<number>;
    addPopup(options: { lngLat: LngLat; html: string; maxWidth?: string }): void;
}
