// RSS/GeoRSS Alert Normalizer
import { XMLParser } from 'fast-xml-parser';
import type { CanonicalAlert } from '../types.js';

export async function normalizeRSS(
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
        console.error(`RSS parsing failed for ${sourceId}:`, e);
        return [];
    }

    if (!jsonObj) return [];

    const channel = jsonObj.rss?.channel || jsonObj.feed;
    const items = channel?.item || channel?.entry || [];
    const normalizedItems = Array.isArray(items) ? items : [items];

    return normalizedItems.map((item: any) => {
        // Extract basic fields
        const title = item.title || 'Unknown Alert';
        const description = item.description || item.summary || item.content || '';
        const url = item.link?.['@_href'] || item.link || '';
        const issuedAt = item.pubDate || item.published || item.updated || new Date().toISOString();

        // Extract geometry (GeoRSS)
        let geometry: any = undefined;
        let point = item['georss:point'] || item.point;

        // Handle cases where point might be an object (from parser) or missing
        if (point && typeof point !== 'string') {
            point = point['#text'] || point.toString();
        }

        if (typeof point === 'string') {
            const [lat, lon] = point.trim().split(/\s+/).map(Number);
            if (!isNaN(lat) && !isNaN(lon)) {
                geometry = {
                    type: 'Point',
                    coordinates: [lon, lat],
                };
            }
        }

        // Determine severity rank (fallback logic)
        let severityRank = 4; // Info
        let severityLabel = 'Information';

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('emergency') || lowerTitle.includes('severe')) {
            severityRank = 1;
            severityLabel = 'Emergency';
        } else if (lowerTitle.includes('watch') || lowerTitle.includes('act')) {
            severityRank = 2;
            severityLabel = 'Watch & Act';
        } else if (lowerTitle.includes('advice') || lowerTitle.includes('warning')) {
            severityRank = 3;
            severityLabel = 'Advice';
        }

        const timestamp = new Date(issuedAt).getTime();
        const ageS = Math.floor((Date.now() - timestamp) / 1000);

        return {
            id: `${sourceId}:${item.guid?.['#text'] || item.guid || item.id || title}`,
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
            issued_at: issuedAt,
            updated_at: issuedAt,
            url: typeof url === 'string' ? url : undefined,
            confidence: 'medium',
            age_s: ageS,
            geometry: geometry || undefined,
        };
    });
}
