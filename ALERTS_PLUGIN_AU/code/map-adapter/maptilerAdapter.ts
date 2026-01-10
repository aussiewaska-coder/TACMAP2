// MapTiler adapter (MapTiler SDK is MapLibre-compatible)

import type maplibregl from 'maplibre-gl';
import { MapLibreAdapter } from './maplibreAdapter.js';

export class MapTilerAdapter extends MapLibreAdapter {
    constructor(map: maplibregl.Map) {
        super(map);
    }
}
