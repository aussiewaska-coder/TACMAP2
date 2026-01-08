// Load and filter the emergency services registry

import type { RegistryEntry, RegistryFilters } from './types.js';

let cachedRegistry: RegistryEntry[] | null = null;

/**
 * Load the registry from the compiled JSON file
 */
export async function loadRegistry(): Promise<RegistryEntry[]> {
    if (cachedRegistry) {
        return cachedRegistry;
    }

    try {
        // In production (Vercel), load from public folder
        // In development, load from file system
        const registryPath = process.env.NODE_ENV === 'production'
            ? './public/registry.json'
            : './public/registry.json';

        const fs = await import('fs/promises');
        const registryData = await fs.readFile(registryPath, 'utf-8');
        cachedRegistry = JSON.parse(registryData) as RegistryEntry[];

        return cachedRegistry;
    } catch (error) {
        console.error('Failed to load registry:', error);
        // Return empty array as fallback
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
