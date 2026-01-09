// Main alert normalization orchestrator
// Dispatches to format-specific normalizers

import type { CanonicalAlert } from '../types.js';
import { normalizeGeoJSON } from './geojson.js';
import { normalizeRSS } from './rss.js';
import { normalizeCAP } from './cap.js';
import { normalizeArcGIS } from './arcgis.js';

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
                return normalizeRSS(data as string, sourceId, registryEntry);

            case 'cap':
                return normalizeCAP(data as string, sourceId, registryEntry);

            case 'arcgis':
                return normalizeArcGIS(data, sourceId, registryEntry);

            default:
                console.warn(`Unknown stream type: ${streamType} for ${sourceId}`);
                return [];
        }
    } catch (error) {
        console.error(`Alert normalization error for ${sourceId}:`, error);
        return [];
    }
}
