// Main alert normalization orchestrator
// Dispatches to format-specific normalizers

import type { CanonicalAlert } from '../types.js';
import { normalizeGeoJSON } from './geojson.js';

export async function normalizeAlerts(
    data: any,
    sourceId: string,
    registryEntry: any
): Promise<CanonicalAlert[]> {
    const streamType = registryEntry.stream_type?.toLowerCase() || 'geojson';

    try {
        switch (streamType) {
            case 'geojson':
                return normalizeGeoJSON(data, sourceId, registryEntry);

            case 'rss':
            case 'georss':
                // TODO: Implement RSS/GeoRSS normalizer
                console.warn(`RSS/GeoRSS normalizer not yet implemented for ${sourceId}`);
                return [];

            case 'cap':
                // TODO: Implement CAP-AU normalizer
                console.warn(`CAP normalizer not yet implemented for ${sourceId}`);
                return [];

            case 'arcgis':
                // TODO: Implement ArcGIS normalizer
                console.warn(`ArcGIS normalizer not yet implemented for ${sourceId}`);
                return [];

            default:
                console.warn(`Unknown stream type: ${streamType} for ${sourceId}`);
                return [];
        }
    } catch (error) {
        console.error(`Alert normalization error for ${sourceId}:`, error);
        return [];
    }
}
