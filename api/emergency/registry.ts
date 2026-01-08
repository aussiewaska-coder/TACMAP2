// Emergency Services Registry API endpoint
// Returns filtered registry entries for frontend consumption

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadRegistry, filterRegistry } from '../../server/lib/registry/loadRegistry.js';
import type { RegistryFilters } from '../../server/lib/registry/types.js';

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
        // Load full registry
        const registry = await loadRegistry();

        // Parse query filters
        const filters: RegistryFilters = {};

        if (req.query.category) {
            filters.category = req.query.category as any;
        }

        if (req.query.state) {
            filters.state = req.query.state as any;
        }

        if (req.query.machine_readable !== undefined) {
            filters.machine_readable = req.query.machine_readable === 'true';
        }

        if (req.query.tags) {
            const tagsParam = req.query.tags as string;
            filters.tags = tagsParam.split(',').map(t => t.trim());
        }

        // Apply filters
        const filtered = filterRegistry(registry, filters);

        res.status(200).json({
            count: filtered.length,
            entries: filtered,
        });

    } catch (error) {
        console.error('Registry API error:', error);
        res.status(500).json({
            error: 'Failed to load registry',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
