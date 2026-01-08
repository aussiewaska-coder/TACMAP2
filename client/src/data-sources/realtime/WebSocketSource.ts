// WebSocket Data Source - Real-time streaming data source
// Handles WebSocket connections with auto-reconnection

import type { FeatureCollection, Feature } from 'geojson';
import type { DataSource, DataSourceStatus, WebSocketSourceConfig } from '../types';
import { eventBus } from '@/events/EventBus';

/**
 * WebSocket data source for real-time data streaming
 * 
 * @example
 * ```ts
 * const source = new WebSocketSource('vehicles', {
 *   type: 'websocket',
 *   url: 'wss://api.example.com/vehicles',
 *   transform: (msg) => ({
 *     type: 'Feature',
 *     geometry: { type: 'Point', coordinates: [msg.lng, msg.lat] },
 *     properties: { id: msg.id, speed: msg.speed }
 *   })
 * });
 * 
 * source.subscribe((data) => {
 *   console.log('New data:', data.features.length, 'features');
 * });
 * ```
 */
export class WebSocketSource implements DataSource<FeatureCollection> {
    readonly id: string;
    readonly type = 'websocket';

    private config: WebSocketSourceConfig;
    private ws: WebSocket | null = null;
    private data: FeatureCollection = { type: 'FeatureCollection', features: [] };
    private subscribers: Set<(data: FeatureCollection) => void> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    status: DataSourceStatus = 'idle';
    error: Error | null = null;

    constructor(id: string, config: WebSocketSourceConfig) {
        this.id = id;
        this.config = {
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            heartbeatInterval: 30000,
            ...config,
        };
    }

    /**
     * Connect to the WebSocket server
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.setStatus('connecting');

        try {
            const url = this.config.authToken
                ? `${this.config.url}?token=${this.config.authToken}`
                : this.config.url;

            this.ws = new WebSocket(url, this.config.protocols);

            this.ws.onopen = () => {
                this.setStatus('connected');
                this.reconnectAttempts = 0;
                this.error = null;
                this.startHeartbeat();

                eventBus.emit('datasource:connected', { sourceId: this.id });
                console.log(`[WebSocketSource:${this.id}] Connected`);
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.ws.onclose = (event) => {
                this.setStatus('disconnected');
                this.stopHeartbeat();

                eventBus.emit('datasource:disconnected', { sourceId: this.id });
                console.log(`[WebSocketSource:${this.id}] Disconnected:`, event.reason || 'Unknown');

                this.scheduleReconnect();
            };

            this.ws.onerror = (event) => {
                this.error = new Error('WebSocket error');
                this.setStatus('error');

                eventBus.emit('datasource:error', { sourceId: this.id, error: this.error });
                console.error(`[WebSocketSource:${this.id}] Error:`, event);
            };

        } catch (error) {
            this.error = error instanceof Error ? error : new Error(String(error));
            this.setStatus('error');

            eventBus.emit('datasource:error', { sourceId: this.id, error: this.error });
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const raw = JSON.parse(event.data);

            if (this.config.transform) {
                const features = this.config.transform(raw);
                const featureArray = Array.isArray(features) ? features : [features];
                this.updateFeatures(featureArray);
            } else if (raw.type === 'FeatureCollection') {
                // Already a FeatureCollection
                this.data = raw;
                this.notifySubscribers();
            } else if (raw.type === 'Feature') {
                // Single feature
                this.updateFeatures([raw]);
            }

        } catch (error) {
            console.error(`[WebSocketSource:${this.id}] Failed to parse message:`, error);
        }
    }

    /**
     * Update features (upsert by id)
     */
    private updateFeatures(newFeatures: Feature[]): void {
        for (const feature of newFeatures) {
            const existingIndex = this.data.features.findIndex(
                (f) => f.id === feature.id || f.properties?.id === feature.properties?.id
            );

            if (existingIndex >= 0) {
                this.data.features[existingIndex] = feature;
            } else {
                this.data.features.push(feature);
            }
        }

        this.notifySubscribers();
    }

    /**
     * Remove a feature by id
     */
    removeFeature(featureId: string | number): void {
        this.data.features = this.data.features.filter(
            (f) => f.id !== featureId && f.properties?.id !== featureId
        );
        this.notifySubscribers();
    }

    /**
     * Clear all features
     */
    clearFeatures(): void {
        this.data.features = [];
        this.notifySubscribers();
    }

    /**
     * Notify all subscribers of data update
     */
    private notifySubscribers(): void {
        for (const callback of this.subscribers) {
            try {
                callback(this.data);
            } catch (error) {
                console.error(`[WebSocketSource:${this.id}] Subscriber error:`, error);
            }
        }

        eventBus.emit('datasource:data', { sourceId: this.id, data: this.data });
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect(): void {
        const maxAttempts = this.config.reconnectAttempts ?? 5;

        if (this.reconnectAttempts >= maxAttempts) {
            console.log(`[WebSocketSource:${this.id}] Max reconnection attempts reached`);
            return;
        }

        const baseDelay = this.config.reconnectDelay ?? 1000;
        const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 30000);

        this.reconnectAttempts++;

        console.log(`[WebSocketSource:${this.id}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        if (!this.config.heartbeatInterval) return;

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Set status and emit event
     */
    private setStatus(status: DataSourceStatus): void {
        this.status = status;
    }

    /**
     * Send a message through the WebSocket
     */
    send(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // DataSource interface implementation

    async getData(): Promise<FeatureCollection> {
        return this.data;
    }

    subscribe(callback: (data: FeatureCollection) => void): () => void {
        this.subscribers.add(callback);

        // Connect if not already connected
        if (this.status === 'idle') {
            this.connect();
        }

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    async refresh(): Promise<void> {
        // For WebSocket, refresh means reconnect
        this.destroy();
        this.connect();
    }

    destroy(): void {
        this.stopHeartbeat();

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.subscribers.clear();
        this.setStatus('idle');
    }
}
