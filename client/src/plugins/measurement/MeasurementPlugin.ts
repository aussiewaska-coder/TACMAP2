// Measurement Plugin - Distance and area measurement using Turf.js
// Draw on map to measure distances and areas

import type { Map as MapLibreGLMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { definePlugin, type PluginInstance, type PluginConfig } from '../registry';
import { eventBus } from '@/events/EventBus';
import { isMapValid, safeRemoveLayer, safeRemoveSource } from '@/utils/mapUtils';

export type MeasurementMode = 'none' | 'distance' | 'area';

export interface MeasurementResult {
    mode: MeasurementMode;
    value: number;
    unit: string;
    formatted: string;
    points: Array<[number, number]>;
}

export interface MeasurementPluginConfig extends PluginConfig {
    /** Measurement units: metric or imperial */
    units?: 'metric' | 'imperial';
    /** Line color */
    lineColor?: string;
    /** Fill color for area */
    fillColor?: string;
    /** Point color */
    pointColor?: string;
}

/**
 * Measurement Plugin
 * Interactive distance and area measurement on the map
 */
class MeasurementPluginInstance implements PluginInstance {
    id = 'measurement';
    private map: MapLibreGLMap;
    private config: MeasurementPluginConfig;

    private mode: MeasurementMode = 'none';
    private points: Array<[number, number]> = [];
    private sourceId = 'measurement-source';
    private lineLayerId = 'measurement-line';
    private areaLayerId = 'measurement-area';
    private pointLayerId = 'measurement-points';

    private clickHandler: ((e: MapMouseEvent) => void) | null = null;
    private moveHandler: ((e: MapMouseEvent) => void) | null = null;
    private dblClickHandler: ((e: MapMouseEvent) => void) | null = null;

    constructor(map: MapLibreGLMap, config: MeasurementPluginConfig) {
        this.map = map;
        this.config = {
            units: 'metric',
            lineColor: '#f43f5e',
            fillColor: '#f43f5e',
            pointColor: '#ffffff',
            ...config,
        };

        this.initializeLayers();
    }

    /**
     * Initialize map layers
     */
    private initializeLayers(): void {
        if (!this.map.loaded()) {
            this.map.once('load', () => this.initializeLayers());
            return;
        }

        // Add source
        if (!this.map.getSource(this.sourceId)) {
            this.map.addSource(this.sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [],
                },
            });
        }

        // Area fill layer
        if (!this.map.getLayer(this.areaLayerId)) {
            this.map.addLayer({
                id: this.areaLayerId,
                type: 'fill',
                source: this.sourceId,
                filter: ['==', '$type', 'Polygon'],
                paint: {
                    'fill-color': this.config.fillColor || '#f43f5e',
                    'fill-opacity': 0.2,
                },
            });
        }

        // Line layer
        if (!this.map.getLayer(this.lineLayerId)) {
            this.map.addLayer({
                id: this.lineLayerId,
                type: 'line',
                source: this.sourceId,
                filter: ['==', '$type', 'LineString'],
                paint: {
                    'line-color': this.config.lineColor || '#f43f5e',
                    'line-width': 3,
                    'line-dasharray': [2, 1],
                },
            });
        }

        // Points layer
        if (!this.map.getLayer(this.pointLayerId)) {
            this.map.addLayer({
                id: this.pointLayerId,
                type: 'circle',
                source: this.sourceId,
                filter: ['==', '$type', 'Point'],
                paint: {
                    'circle-radius': 6,
                    'circle-color': this.config.pointColor || '#ffffff',
                    'circle-stroke-color': this.config.lineColor || '#f43f5e',
                    'circle-stroke-width': 2,
                },
            });
        }
    }

    /**
     * Start distance measurement mode
     */
    startDistanceMeasurement(): void {
        this.stopMeasurement();
        this.mode = 'distance';
        this.points = [];
        this.map.getCanvas().style.cursor = 'crosshair';
        this.attachHandlers();
        eventBus.emit('ui:notification', { message: 'Click to add points. Double-click to finish.' });
    }

    /**
     * Start area measurement mode
     */
    startAreaMeasurement(): void {
        this.stopMeasurement();
        this.mode = 'area';
        this.points = [];
        this.map.getCanvas().style.cursor = 'crosshair';
        this.attachHandlers();
        eventBus.emit('ui:notification', { message: 'Click to add points. Double-click to close polygon.' });
    }

    /**
     * Stop measurement and clear
     */
    stopMeasurement(): void {
        this.mode = 'none';
        this.points = [];
        if (isMapValid(this.map)) {
            try {
                this.map.getCanvas().style.cursor = '';
            } catch {
                // Ignore if canvas not accessible
            }
        }
        this.detachHandlers();
        this.updateDisplay();
    }

    /**
     * Clear measurement but stay in mode
     */
    clearMeasurement(): void {
        this.points = [];
        this.updateDisplay();
    }

    /**
     * Get current measurement result
     */
    getResult(): MeasurementResult | null {
        if (this.mode === 'none' || this.points.length < 2) {
            return null;
        }

        if (this.mode === 'distance') {
            return this.calculateDistance();
        } else if (this.mode === 'area' && this.points.length >= 3) {
            return this.calculateArea();
        }

        return null;
    }

    /**
     * Calculate distance
     */
    private calculateDistance(): MeasurementResult {
        const line = turf.lineString(this.points);
        const length = turf.length(line, { units: 'kilometers' });

        let value: number;
        let unit: string;
        let formatted: string;

        if (this.config.units === 'imperial') {
            const miles = length * 0.621371;
            if (miles < 0.1) {
                value = miles * 5280;
                unit = 'feet';
                formatted = `${Math.round(value)} ft`;
            } else {
                value = miles;
                unit = 'miles';
                formatted = `${value.toFixed(2)} mi`;
            }
        } else {
            if (length < 1) {
                value = length * 1000;
                unit = 'meters';
                formatted = `${Math.round(value)} m`;
            } else {
                value = length;
                unit = 'kilometers';
                formatted = `${value.toFixed(2)} km`;
            }
        }

        return {
            mode: 'distance',
            value,
            unit,
            formatted,
            points: this.points,
        };
    }

    /**
     * Calculate area
     */
    private calculateArea(): MeasurementResult {
        // Close the polygon
        const closedPoints = [...this.points, this.points[0]];
        const polygon = turf.polygon([closedPoints]);
        const area = turf.area(polygon); // square meters

        let value: number;
        let unit: string;
        let formatted: string;

        if (this.config.units === 'imperial') {
            const sqFeet = area * 10.7639;
            const acres = sqFeet / 43560;
            if (acres < 1) {
                value = sqFeet;
                unit = 'sq ft';
                formatted = `${Math.round(value).toLocaleString()} sq ft`;
            } else {
                value = acres;
                unit = 'acres';
                formatted = `${value.toFixed(2)} acres`;
            }
        } else {
            if (area < 10000) {
                value = area;
                unit = 'sq m';
                formatted = `${Math.round(value).toLocaleString()} m²`;
            } else if (area < 1000000) {
                value = area / 10000;
                unit = 'hectares';
                formatted = `${value.toFixed(2)} ha`;
            } else {
                value = area / 1000000;
                unit = 'sq km';
                formatted = `${value.toFixed(2)} km²`;
            }
        }

        return {
            mode: 'area',
            value,
            unit,
            formatted,
            points: this.points,
        };
    }

    /**
     * Attach event handlers
     */
    private attachHandlers(): void {
        this.clickHandler = (e: MapMouseEvent) => {
            const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            this.points.push(point);
            this.updateDisplay();
        };

        this.dblClickHandler = (e: MapMouseEvent) => {
            e.preventDefault();

            const result = this.getResult();
            if (result) {
                eventBus.emit('ui:notification', { message: `Measurement: ${result.formatted}` });
            }

            // Stay in mode but with new measurement
            this.points = [];
            this.updateDisplay();
        };

        this.map.on('click', this.clickHandler);
        this.map.on('dblclick', this.dblClickHandler);
    }

    /**
     * Detach event handlers
     */
    private detachHandlers(): void {
        if (!isMapValid(this.map)) {
            // Map is gone, just clear refs
            this.clickHandler = null;
            this.dblClickHandler = null;
            this.moveHandler = null;
            return;
        }
        try {
            if (this.clickHandler) {
                this.map.off('click', this.clickHandler);
                this.clickHandler = null;
            }
            if (this.dblClickHandler) {
                this.map.off('dblclick', this.dblClickHandler);
                this.dblClickHandler = null;
            }
            if (this.moveHandler) {
                this.map.off('mousemove', this.moveHandler);
                this.moveHandler = null;
            }
        } catch {
            // Ignore errors during cleanup
        }
    }

    /**
     * Update map display
     */
    private updateDisplay(): void {
        if (!isMapValid(this.map)) return;
        let source: GeoJSONSource | undefined;
        try {
            source = this.map.getSource(this.sourceId) as GeoJSONSource;
        } catch {
            return;
        }
        if (!source) return;

        const features: GeoJSON.Feature[] = [];

        // Add points
        this.points.forEach((point) => {
            features.push({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: point,
                },
            });
        });

        // Add line or polygon
        if (this.points.length >= 2) {
            if (this.mode === 'distance') {
                features.push({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: this.points,
                    },
                });
            } else if (this.mode === 'area' && this.points.length >= 3) {
                features.push({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[...this.points, this.points[0]]],
                    },
                });
                // Also add the outline
                features.push({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [...this.points, this.points[0]],
                    },
                });
            }
        }

        source.setData({
            type: 'FeatureCollection',
            features,
        });
    }

    /**
     * Get current mode
     */
    getMode(): MeasurementMode {
        return this.mode;
    }

    updateConfig(config: PluginConfig): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): PluginConfig {
        return this.config;
    }

    async destroy(): Promise<void> {
        this.stopMeasurement();

        // Use safe utilities to avoid errors if map is already destroyed
        safeRemoveLayer(this.map, this.pointLayerId);
        safeRemoveLayer(this.map, this.lineLayerId);
        safeRemoveLayer(this.map, this.areaLayerId);
        safeRemoveSource(this.map, this.sourceId);
    }
}

// Export plugin definition
export const measurementPlugin = definePlugin({
    id: 'measurement',
    name: 'Measurement',
    description: 'Measure distances and areas on the map',
    category: 'tools',
    version: '1.0.0',
    dependencies: [],
    defaultEnabled: true,
    defaultConfig: {
        units: 'metric',
        lineColor: '#f43f5e',
        fillColor: '#f43f5e',
        pointColor: '#ffffff',
    },
    initialize: async (map, config) => {
        return new MeasurementPluginInstance(map, config as MeasurementPluginConfig);
    },
});

export { MeasurementPluginInstance };
