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
        // Try multiple loading strategies
        let registryData: string | null = null;

        // Strategy 1: Try file system first (works in dev and some deployments)
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const registryPath = path.join(process.cwd(), 'public/registry.json');
            registryData = await fs.readFile(registryPath, 'utf-8');
            console.log('Loaded registry from file system');
        } catch (fsError) {
            console.log('File system load failed, trying public URL...');

            // Strategy 2: Try fetching from public URL (Vercel deployment)
            try {
                // Use relative path to avoid CORS and auth issues
                const response = await fetch('/registry.json');
                if (response.ok) {
                    registryData = await response.text();
                    console.log('Loaded registry from /registry.json');
                } else {
                    console.warn(`Registry fetch failed: ${response.status} ${response.statusText}`);
                }
            } catch (fetchError) {
                console.warn('Public URL fetch failed:', fetchError);
            }
        }

        if (!registryData) {
            console.error('Failed to load registry from any source');
            return [];
        }

        cachedRegistry = JSON.parse(registryData) as RegistryEntry[];
        console.log(`Registry loaded: ${cachedRegistry.length} entries`);

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
