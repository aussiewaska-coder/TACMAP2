// GeoJSON feed normalizer
// Pass-through for native GeoJSON feeds

import type { CanonicalAlert } from '../types.js';

export function normalizeGeoJSON(
    data: any,
    sourceId: string,
    registryEntry: any
): CanonicalAlert[] {
    const alerts: CanonicalAlert[] = [];

    try {
        // Handle FeatureCollection
        const features = data.type === 'FeatureCollection'
            ? data.features
            : [data];

        for (const feature of features) {
            if (!feature.geometry) continue;

            const props = feature.properties || {};
            const now = Date.now();
            const issuedAt = props.issued_at || props.published || props.timestamp || new Date().toISOString();
            const updatedAt = props.updated_at || issuedAt;

            const issuedTime = new Date(issuedAt).getTime();
            const age_s = Math.floor((now - issuedTime) / 1000);

            alerts.push({
                id: props.id || feature.id || `${sourceId}-${Date.now()}-${Math.random()}`,
                source_id: sourceId,
                category: registryEntry.category || 'Alerts',
                subcategory: registryEntry.subcategory || '',
                tags: registryEntry.tags || [],
                state: registryEntry.jurisdiction_state || 'AUS',
                hazard_type: props.hazard_type || props.type || 'Unknown',
                severity: props.severity || 'Info',
                severity_rank: mapSeverityToRank(props.severity),
                title: props.title || props.name || 'Alert',
                description: props.description || props.summary || '',
                issued_at: issuedAt,
                updated_at: updatedAt,
                expires_at: props.expires_at,
                url: props.url || props.link,
                confidence: props.confidence || 'medium',
                age_s,
                geometry: feature.geometry,
            });
        }
    } catch (error) {
        console.error('GeoJSON normalization error:', error);
    }

    return alerts;
}

function mapSeverityToRank(severity?: string): number {
    if (!severity) return 4;
    const s = severity.toLowerCase();
    if (s.includes('emergency') || s.includes('evacuate')) return 1;
    if (s.includes('watch') || s.includes('act')) return 2;
    if (s.includes('advice')) return 3;
    return 4;
}
