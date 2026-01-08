// Data source registry - Manages all data sources

import type { FeatureCollection } from 'geojson';
import type { DataSource, DataSourceConfig, DataSourceStatus } from './types';
import { StaticSource } from './static/StaticSource';
import { WebSocketSource } from './realtime/WebSocketSource';

/**
 * Data Source Registry
 * Central management of all data sources
 */
class DataSourceRegistryClass {
    private sources: Map<string, DataSource> = new Map();

    /**
     * Create and register a data source from config
     */
    create(id: string, config: DataSourceConfig): DataSource {
        // Remove existing source with same id
        if (this.sources.has(id)) {
            this.remove(id);
        }

        let source: DataSource;

        switch (config.type) {
            case 'static':
                source = new StaticSource(id, config);
                break;
            case 'websocket':
                source = new WebSocketSource(id, config);
                break;
            // Add more source types as implemented
            default:
                throw new Error(`Unknown data source type: ${(config as DataSourceConfig).type}`);
        }

        this.sources.set(id, source);
        console.log(`[DataSourceRegistry] Created source: ${id} (${config.type})`);

        return source;
    }

    /**
     * Get a data source by id
     */
    get(id: string): DataSource | undefined {
        return this.sources.get(id);
    }

    /**
     * Get all data sources
     */
    getAll(): DataSource[] {
        return Array.from(this.sources.values());
    }

    /**
     * Get data sources by type
     */
    getByType(type: string): DataSource[] {
        return this.getAll().filter((s) => s.type === type);
    }

    /**
     * Get data sources by status
     */
    getByStatus(status: DataSourceStatus): DataSource[] {
        return this.getAll().filter((s) => s.status === status);
    }

    /**
     * Remove a data source
     */
    remove(id: string): boolean {
        const source = this.sources.get(id);
        if (source) {
            source.destroy();
            this.sources.delete(id);
            console.log(`[DataSourceRegistry] Removed source: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Remove all data sources
     */
    clear(): void {
        for (const source of this.sources.values()) {
            source.destroy();
        }
        this.sources.clear();
    }

    /**
     * Refresh all data sources
     */
    async refreshAll(): Promise<void> {
        await Promise.all(
            Array.from(this.sources.values()).map((s) => s.refresh())
        );
    }
}

// Export singleton
export const dataSourceRegistry = new DataSourceRegistryClass();

// Export class for testing
export { DataSourceRegistryClass };
