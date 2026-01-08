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

        for (const source of alertSources.slice(0, 5)) { // Limit to first 5 sources for now
            try {
                const result = await fetchWithCache(
                    `emergency:alerts:${source.source_id}`,
                    async () => {
                        const response = await fetch(source.endpoint_url);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        const contentType = response.headers.get('content-type');
                        if (contentType?.includes('json')) {
                            return await response.json();
                        } else {
                            return await response.text();
                        }
                    },
                    {
                        ttlSeconds: 30, // 30 second cache for alerts
                        staleWhileRevalidateSeconds: 120,
                    }
                );

                if (result.stale) stale = true;

                if (result.data) {
                    const normalized = await normalizeAlerts(result.data, source.source_id, source);
                    allAlerts.push(...normalized);
                }
            } catch (error) {
                console.error(`Failed to fetch alerts from ${source.source_id}:`, error);
            }
        }

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
