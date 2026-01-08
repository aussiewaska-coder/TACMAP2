// Data Source Types - Interfaces for various data source adapters
// These types define how different data sources connect and provide data

import type { FeatureCollection, Feature } from 'geojson';

/**
 * Data source status
 */
export type DataSourceStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error'
    | 'loading'
    | 'ready';

/**
 * Base data source interface
 * All data sources implement this interface
 */
export interface DataSource<T = FeatureCollection> {
    /** Unique source identifier */
    id: string;

    /** Source type */
    type: 'static' | 'api' | 'websocket' | 'sse' | 'polling';

    /** Current connection status */
    status: DataSourceStatus;

    /** Last error if any */
    error: Error | null;

    /** Get current data */
    getData(): Promise<T>;

    /** Subscribe to data updates (for live sources) */
    subscribe(callback: (data: T) => void): () => void;

    /** Refresh data (for cacheable sources) */
    refresh(): Promise<void>;

    /** Clean up resources */
    destroy(): void;
}

/**
 * Static data source config
 * For GeoJSON files or inline data
 */
export interface StaticSourceConfig {
    type: 'static';
    /** URL to fetch GeoJSON from, or inline data */
    data: FeatureCollection | string;
    /** Optional transform function */
    transform?: (data: unknown) => FeatureCollection;
}

/**
 * API data source config
 * For REST API endpoints
 */
export interface APISourceConfig {
    type: 'api';
    /** API endpoint URL */
    url: string;
    /** HTTP method */
    method?: 'GET' | 'POST';
    /** Request headers */
    headers?: Record<string, string>;
    /** Query parameters */
    params?: Record<string, string>;
    /** Request body (for POST) */
    body?: unknown;
    /** Transform response to GeoJSON */
    transform?: (response: unknown) => FeatureCollection;
    /** Auto-refresh interval in ms (0 = no auto-refresh) */
    refreshInterval?: number;
    /** Cache duration in ms */
    cacheDuration?: number;
}

/**
 * WebSocket data source config
 * For real-time streaming data
 */
export interface WebSocketSourceConfig {
    type: 'websocket';
    /** WebSocket URL */
    url: string;
    /** WebSocket protocols */
    protocols?: string[];
    /** Heartbeat interval in ms */
    heartbeatInterval?: number;
    /** Max reconnection attempts */
    reconnectAttempts?: number;
    /** Reconnection delay in ms */
    reconnectDelay?: number;
    /** Transform incoming messages to GeoJSON */
    transform?: (message: unknown) => Feature | Feature[];
    /** Authentication token */
    authToken?: string;
}

/**
 * Server-Sent Events data source config
 * For one-way streaming data
 */
export interface SSESourceConfig {
    type: 'sse';
    /** SSE endpoint URL */
    url: string;
    /** Event name to listen for */
    eventName?: string;
    /** Transform incoming events to GeoJSON */
    transform?: (event: MessageEvent) => Feature | Feature[];
    /** Whether to reconnect on error */
    autoReconnect?: boolean;
}

/**
 * Polling data source config
 * For periodic API fetching
 */
export interface PollingSourceConfig {
    type: 'polling';
    /** API endpoint URL */
    url: string;
    /** Polling interval in ms */
    interval: number;
    /** HTTP method */
    method?: 'GET' | 'POST';
    /** Request headers */
    headers?: Record<string, string>;
    /** Transform response to GeoJSON */
    transform?: (response: unknown) => FeatureCollection;
}

/**
 * Union type for all data source configs
 */
export type DataSourceConfig =
    | StaticSourceConfig
    | APISourceConfig
    | WebSocketSourceConfig
    | SSESourceConfig
    | PollingSourceConfig;

/**
 * Data source event types
 */
export interface DataSourceEvents {
    'connect': { sourceId: string };
    'disconnect': { sourceId: string; reason?: string };
    'data': { sourceId: string; data: FeatureCollection };
    'error': { sourceId: string; error: Error };
    'status': { sourceId: string; status: DataSourceStatus };
}
