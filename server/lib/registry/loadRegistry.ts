// Load and filter the emergency services registry from database

import type { RegistryEntry, RegistryFilters } from './types.js';
import { getDb } from '../../db.js';
import { emergencyRegistry } from '../../../drizzle/schema.js';
import { eq, and, sql } from 'drizzle-orm';

// In-memory cache to prevent repeated database queries
let cachedRegistry: RegistryEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load the registry from the database (with caching)
 */
export async function loadRegistry(): Promise<RegistryEntry[]> {
    // Return cached data if still valid
    const now = Date.now();
    if (cachedRegistry && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedRegistry;
    }

    try {
        const db = await getDb();
        if (!db) {
            console.error('Database not available');
            return cachedRegistry || []; // Return stale cache if DB unavailable
        }

        const results = await db.select().from(emergencyRegistry);


        // Convert database records to RegistryEntry format
        const entries = results.map(row => ({
            source_id: row.sourceId,
            category: row.category as any,
            subcategory: row.subcategory || '',
            tags: Array.isArray(row.tags) ? row.tags : [],
            jurisdiction_state: row.jurisdictionState as any,
            endpoint_url: row.endpointUrl,
            stream_type: row.streamType as any,
            format: row.format || '',
            access_level: row.accessLevel as any,
            certainly_open: row.certainlyOpen,
            machine_readable: row.machineReadable,
            icao24: row.icao24 || undefined,
            registration: row.registration || undefined,
            tracking_keys: Array.isArray(row.trackingKeys) ? row.trackingKeys : undefined,
            aircraft_type: row.aircraftType || undefined,
            operator: row.operator || undefined,
            role: row.role || undefined,
        }));

        // Update cache
        cachedRegistry = entries;
        cacheTimestamp = Date.now();

        return entries;
    } catch (error) {
        console.error('Failed to load registry from database:', error);
        return cachedRegistry || []; // Return stale cache on error
    }
}

/**
 * Filter registry entries based on criteria
 */
export function filterRegistry(
    entries: RegistryEntry[],
    filters: RegistryFilters
): RegistryEntry[] {
    let filtered = entries;

    if (filters.category) {
        filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.state) {
        filtered = filtered.filter(e => e.jurisdiction_state === filters.state);
    }

    if (filters.machine_readable !== undefined) {
        filtered = filtered.filter(e => e.machine_readable === filters.machine_readable);
    }

    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(e =>
            filters.tags!.some(tag => e.tags.includes(tag))
        );
    }

    return filtered;
}

/**
 * Get registry entries by category
 */
export async function getRegistryByCategory(category: string): Promise<RegistryEntry[]> {
    const registry = await loadRegistry();
    return registry.filter(e => e.category === category);
}

/**
 * Get a single registry entry by source_id
 */
export async function getRegistryEntry(sourceId: string): Promise<RegistryEntry | null> {
    const registry = await loadRegistry();
    return registry.find(e => e.source_id === sourceId) || null;
}
