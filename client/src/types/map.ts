// TypeScript type definitions for the map system

import type { Map as MapLibreGLMap, LngLatLike, StyleSpecification } from 'maplibre-gl';

/**
 * Core map state
 */
export interface MapState {
    map: MapLibreGLMap | null;
    isLoaded: boolean;
    isInitializing: boolean;
    error: Error | null;
}

/**
 * Map view state (camera position)
 */
export interface ViewState {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
}

/**
 * Map initialization options
 */
export interface MapOptions {
    container: HTMLElement;
    style?: string | StyleSpecification;
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    minZoom?: number;
    maxZoom?: number;
    maxBounds?: [[number, number], [number, number]];
}

/**
 * Fly-to animation options
 */
export interface FlyToOptions {
    center: LngLatLike;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
    essential?: boolean;
    preloadTiles?: boolean;
}

/**
 * Location definition for navigation
 */
export interface Location {
    id: string;
    name: string;
    coordinates: [number, number];
    zoom: number;
    category?: 'city' | 'scenic' | 'custom';
}

/**
 * Terrain configuration
 */
export interface TerrainConfig {
    enabled: boolean;
    exaggeration: number;
    sourceUrl: string;
    encoding: 'terrarium' | 'mapbox';
}

/**
 * Map event types
 */
export type MapEventType =
    | 'load'
    | 'move'
    | 'moveend'
    | 'zoom'
    | 'zoomend'
    | 'pitch'
    | 'rotate'
    | 'click'
    | 'dblclick'
    | 'contextmenu'
    | 'error';

/**
 * Map event handler
 */
export type MapEventHandler<T = unknown> = (event: T) => void;
