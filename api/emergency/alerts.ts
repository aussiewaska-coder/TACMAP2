// Emergency Services Alerts API
// Aggregates alerts from all registry sources

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadRegistry } from '../../server/lib/registry/loadRegistry.js';
import { normalizeAlerts } from '../../server/lib/ingest/normalize/alerts.js';
import { fetchWithCache } from '../../server/lib/ingest/fetchWithCache.js';
import type { CanonicalAlert } from '../../server/lib/ingest/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Load registry and filter for alert sources
        const registry = await loadRegistry();
        const alertSources = registry.filter(e =>
            e.machine_readable &&
            e.endpoint_url &&
            (e.category === 'Alerts' ||
                e.category === 'Hazards' ||
                e.category === 'Hazards & Warnings' ||
                e.category === 'Weather')
        );

        console.log(`Found ${alertSources.length} alert sources`);

        if (alertSources.length === 0) {
            res.status(200).json({
                type: 'FeatureCollection',
                features: [],
                metadata: {
                    total_alerts: 0,
                    sources_count: 0,
                    stale: false,
                    message: 'No alert sources in registry',
                },
            });
            return;
        }

        // Fetch and normalize alerts from all sources
        const allAlerts: CanonicalAlert[] = [];
        let stale = false;

        // Process in batches or limit to avoid timeout
        const MAX_SOURCES = 50;
        const processingSources = alertSources.slice(0, MAX_SOURCES);

        console.log(`Processing ${processingSources.length} alert sources...`);

        const results = await Promise.all(
            processingSources.map(async (source) => {
                try {
                    const result = await fetchWithCache(
                        `emergency:alerts:${source.source_id}`,
                        async () => {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per source

                            try {
                                const response = await fetch(source.endpoint_url, {
                                    signal: controller.signal,
                                    headers: {
                                        'User-Agent': 'TAC-MAP Emergency Services Dashboard (AU); contact@tacmap.com.au',
                                        'Accept': 'application/json, application/xml, text/xml, */*'
                                    }
                                });
                                clearTimeout(timeoutId);

                                if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}`);
                                }

                                const text = await response.text();
                                if (!text || text.trim().length === 0) {
                                    return null;
                                }

                                const contentType = response.headers.get('content-type');
                                if (contentType?.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
                                    try {
                                        return JSON.parse(text);
                                    } catch (e) {
                                        return text; // Fallback to text if JSON parse fails
                                    }
                                } else {
                                    return text;
                                }
                            } catch (e) {
                                clearTimeout(timeoutId);
                                throw e;
                            }
                        },
                        {
                            ttlSeconds: 60, // 1 minute cache for alerts
                            staleWhileRevalidateSeconds: 300,
                        }
                    );

                    if (result.stale) stale = true;

                    if (result.data) {
                        const normalized = await normalizeAlerts(result.data, source.source_id, source);
                        console.log(`Source ${source.source_id}: Found ${normalized.length} alerts (${source.stream_type})`);
                        return normalized;
                    }
                } catch (error) {
                    console.error(`Failed to fetch alerts from ${source.source_id}:`, error);
                }
                return [];
            })
        );

        for (const alerts of results) {
            if (alerts) allAlerts.push(...alerts);
        }
        console.log(`Final aggregation: ${allAlerts.length} total alerts from ${processingSources.length} sources`);

        // Sort by severity and recency
        allAlerts.sort((a, b) => {
            if (a.severity_rank !== b.severity_rank) {
                return a.severity_rank - b.severity_rank; // Lower rank = higher severity
            }
            return b.age_s - a.age_s; // Newer first
        });

        // Convert to GeoJSON
        const features = allAlerts.map(alert => ({
            type: 'Feature' as const,
            geometry: alert.geometry || {
                type: 'Point' as const,
                coordinates: [0, 0], // Fallback if no geometry
            },
            properties: {
                ...alert,
                geometry: undefined, // Remove from properties
            },
        }));

        res.status(200).json({
            type: 'FeatureCollection',
            features,
            metadata: {
                total_alerts: allAlerts.length,
                sources_count: alertSources.length,
                stale,
            },
        });

    } catch (error) {
        console.error('Alerts API error:', error);
        res.status(500).json({
            error: 'Failed to fetch alerts',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
