// Static GeoJSON data source
// For loading static GeoJSON files or inline data

import type { FeatureCollection } from 'geojson';
import type { DataSource, DataSourceStatus, StaticSourceConfig } from '../types';

/**
 * Static data source for GeoJSON files or inline data
 * 
 * @example
 * ```ts
 * // From URL
 * const source = new StaticSource('boundaries', {
 *   type: 'static',
 *   data: '/data/boundaries.geojson'
 * });
 * 
 * // Inline data
 * const source = new StaticSource('points', {
 *   type: 'static',
 *   data: {
 *     type: 'FeatureCollection',
 *     features: [...]
 *   }
 * });
 * ```
 */
export class StaticSource implements DataSource<FeatureCollection> {
    readonly id: string;
    readonly type = 'static';

    private config: StaticSourceConfig;
    private data: FeatureCollection | null = null;
    private subscribers: Set<(data: FeatureCollection) => void> = new Set();
    private loadPromise: Promise<FeatureCollection> | null = null;

    status: DataSourceStatus = 'idle';
    error: Error | null = null;

    constructor(id: string, config: StaticSourceConfig) {
        this.id = id;
        this.config = config;
    }

    /**
     * Load data from URL or use inline data
     */
    private async load(): Promise<FeatureCollection> {
        if (this.data) {
            return this.data;
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.status = 'loading';

        this.loadPromise = (async () => {
            try {
                let rawData: unknown;

                if (typeof this.config.data === 'string') {
                    // Fetch from URL
                    const response = await fetch(this.config.data);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch: ${response.statusText}`);
                    }
                    rawData = await response.json();
                } else {
                    // Use inline data
                    rawData = this.config.data;
                }

                // Apply transform if provided
                if (this.config.transform) {
                    this.data = this.config.transform(rawData);
                } else {
                    this.data = rawData as FeatureCollection;
                }

                this.status = 'ready';
                this.error = null;

                // Notify subscribers
                this.notifySubscribers();

                return this.data;

            } catch (error) {
                this.error = error instanceof Error ? error : new Error(String(error));
                this.status = 'error';
                throw this.error;
            } finally {
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    /**
     * Notify all subscribers
     */
    private notifySubscribers(): void {
        if (!this.data) return;

        for (const callback of this.subscribers) {
            try {
                callback(this.data);
            } catch (error) {
                console.error(`[StaticSource:${this.id}] Subscriber error:`, error);
            }
        }
    }

    // DataSource interface implementation

    async getData(): Promise<FeatureCollection> {
        return this.load();
    }

    subscribe(callback: (data: FeatureCollection) => void): () => void {
        this.subscribers.add(callback);

        // Load data if not already loaded
        this.load().catch(console.error);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    async refresh(): Promise<void> {
        // Reset and reload
        this.data = null;
        this.loadPromise = null;
        await this.load();
    }

    destroy(): void {
        this.subscribers.clear();
        this.data = null;
        this.loadPromise = null;
        this.status = 'idle';
    }
}
