// ArcGIS REST API Normalizer
import type { CanonicalAlert } from '../types.js';

export async function normalizeArcGIS(
    data: any,
    sourceId: string,
    registryEntry: any
): Promise<CanonicalAlert[]> {
    if (!data || !data.features || !Array.isArray(data.features)) return [];

    return data.features.map((f: any) => {
        const attr = f.attributes || {};
        const geom = f.geometry || {};

        // ArcGIS attributes vary widely, try common names
        const title = attr.title || attr.TITLE || attr.Name || attr.NAME || attr.Label || 'Hazards Update';
        const description = attr.description || attr.DESCRIPT || attr.SUMMARY || attr.REMARKS || '';
        const severityStr = (attr.severity || attr.SEVERITY || attr.Level || '').toLowerCase();

        let severityRank = 4;
        let severityLabel = 'Information';

        if (severityStr.includes('emerg') || severityStr.includes('extreme') || severityStr.includes('catastrophic')) {
            severityRank = 1;
            severityLabel = 'Emergency';
        } else if (severityStr.includes('watch') || severityStr.includes('act')) {
            severityRank = 2;
            severityLabel = 'Watch & Act';
        } else if (severityStr.includes('advice') || severityStr.includes('warn')) {
            severityRank = 3;
            severityLabel = 'Advice';
        }

        // Geometry (ArcGIS JSON to GeoJSON)
        let geometry: any = undefined;
        if (geom.x !== undefined && geom.y !== undefined) {
            geometry = {
                type: 'Point',
                coordinates: [geom.x, geom.y],
            };
        } else if (geom.rings) {
            geometry = {
                type: 'Polygon',
                coordinates: geom.rings,
            };
        } else if (geom.paths) {
            geometry = {
                type: 'LineString',
                coordinates: geom.paths[0],
            };
        }

        const pubDate = attr.pubDate || attr.CREATED_DATE || attr.UPDATED_DATE || new Date().toISOString();
        const timestamp = typeof pubDate === 'number' ? pubDate : new Date(pubDate).getTime();

        return {
            id: `${sourceId}:${attr.OBJECTID || attr.id || attr.GlobalID || Math.random()}`,
            source_id: sourceId,
            category: registryEntry.category || 'Alerts',
            subcategory: registryEntry.subcategory || '',
            tags: registryEntry.tags || [],
            state: registryEntry.jurisdiction_state || 'AUS',
            hazard_type: registryEntry.subcategory || 'Hazard',
            severity: severityLabel,
            severity_rank: severityRank,
            title,
            description: typeof description === 'string' ? description : JSON.stringify(description),
            issued_at: new Date(timestamp).toISOString(),
            updated_at: new Date(timestamp).toISOString(),
            url: attr.URL || attr.Link || undefined,
            confidence: 'medium',
            age_s: Math.floor((Date.now() - timestamp) / 1000),
            geometry: geometry || undefined,
        };
    });
}
