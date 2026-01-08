// Load and filter the emergency services registry

import type { RegistryEntry, RegistryFilters } from './types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedRegistry: RegistryEntry[] | null = null;

/**
 * Load the registry from the compiled JSON file
 */
export async function loadRegistry(): Promise<RegistryEntry[]> {
    if (cachedRegistry) {
        return cachedRegistry;
    }

    try {
        // Try multiple paths where registry.json might be located
        const possiblePaths = [
            // Vercel serverless: files are in /var/task
            join(process.cwd(), 'public/registry.json'),
            join(process.cwd(), 'registry.json'),
            join('/var/task', 'public/registry.json'),
            join('/var/task', 'registry.json'),
            // Relative to this file
            join(import.meta.dirname, '../../../public/registry.json'),
        ];

        let registryData: string | null = null;
        let loadedFrom: string | null = null;

        for (const path of possiblePaths) {
            try {
                registryData = readFileSync(path, 'utf-8');
                loadedFrom = path;
                break;
            } catch (e) {
                // Try next path
            }
        }

        if (!registryData) {
            console.error('Failed to load registry from any path. Tried:', possiblePaths);
            return [];
        }

        cachedRegistry = JSON.parse(registryData) as RegistryEntry[];
        console.log(`Registry loaded from ${loadedFrom}: ${cachedRegistry.length} entries`);

        return cachedRegistry;
    } catch (error) {
        console.error('Failed to load registry:', error);
        return [];
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
