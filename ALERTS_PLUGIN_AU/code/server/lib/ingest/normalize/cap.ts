// CAP (Common Alerting Protocol) Normalizer - Australian standard
import { XMLParser } from 'fast-xml-parser';
import type { CanonicalAlert } from '../types.js';

export async function normalizeCAP(
    xmlData: string,
    sourceId: string,
    registryEntry: any
): Promise<CanonicalAlert[]> {
    if (!xmlData || typeof xmlData !== 'string') return [];

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });

    let jsonObj: any;
    try {
        jsonObj = parser.parse(xmlData);
    } catch (e) {
        console.error(`CAP parsing failed for ${sourceId}:`, e);
        return [];
    }

    const alert = jsonObj?.alert;
    if (!alert) return [];

    // CAP can have multiple info blocks
    const infoBlocks = Array.isArray(alert.info) ? alert.info : [alert.info];

    return infoBlocks.map((info: any, index: number) => {
        const title = info.headline || info.event || 'Emergency Alert';
        const description = info.description || info.instruction || '';
        const severity = (info.severity || 'Unknown').toLowerCase();
        const urgency = (info.urgency || 'Unknown').toLowerCase();

        let severityRank = 4;
        let severityLabel = 'Information';

        // Map CAP severity to canonical ranks
        if (severity === 'extreme' || urgency === 'immediate') {
            severityRank = 1;
            severityLabel = 'Emergency';
        } else if (severity === 'severe' || severity === 'high') {
            severityRank = 2;
            severityLabel = 'Watch & Act';
        } else if (severity === 'moderate') {
            severityRank = 3;
            severityLabel = 'Advice';
        }

        // Handle geometry (Polygons/Circles)
        let geometry: any = undefined;
        if (info.area?.polygon) {
            const coordsStr = info.area.polygon;
            const points = coordsStr.split(' ').map((p: string) => {
                const [lat, lon] = p.split(',').map(Number);
                return [lon, lat];
            });
            geometry = {
                type: 'Polygon',
                coordinates: [points],
            };
        } else if (info.area?.circle) {
            // Circle format: "lat,lon radius"
            const [point, radius] = info.area.circle.split(' ');
            const [lat, lon] = point.split(',').map(Number);
            geometry = {
                type: 'Point',
                coordinates: [lon, lat]
            };
        }

        const issuedAt = info.onset || alert.sent || new Date().toISOString();
        const timestamp = new Date(issuedAt).getTime();

        return {
            id: `${sourceId}:${alert.identifier}_${index}`,
            source_id: sourceId,
            category: registryEntry.category || 'Alerts',
            subcategory: info.event || registryEntry.subcategory || '',
            tags: registryEntry.tags || [],
            state: registryEntry.jurisdiction_state || 'AUS',
            hazard_type: info.event || 'Hazard',
            severity: severityLabel,
            severity_rank: severityRank,
            title,
            description: typeof description === 'string' ? description : JSON.stringify(description),
            issued_at: issuedAt,
            updated_at: alert.sent || issuedAt,
            url: info.web || undefined,
            confidence: 'high',
            age_s: Math.floor((Date.now() - timestamp) / 1000),
            geometry: geometry || undefined,
        };
    });
}
