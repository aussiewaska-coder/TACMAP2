import type maplibregl from 'maplibre-gl';
import type mapboxgl from 'mapbox-gl';

export type MapEngine = 'maplibre' | 'mapbox';
export type MapInstance = maplibregl.Map | mapboxgl.Map;
