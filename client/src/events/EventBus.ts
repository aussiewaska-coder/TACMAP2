// Central event bus for cross-component communication
// Plugins, layers, and UI components can publish/subscribe to events

type EventCallback<T = unknown> = (data: T) => void;
type Unsubscribe = () => void;

/**
 * Type-safe event definitions
 */
export interface EventMap {
    // Map lifecycle events
    'map:load': { map: unknown };
    'map:error': { error: Error };
    'map:move': { center: [number, number]; zoom: number };
    'map:moveend': { center: [number, number]; zoom: number };

    // Layer events
    'layer:added': { layerId: string };
    'layer:removed': { layerId: string };
    'layer:visibility': { layerId: string; visible: boolean };
    'layer:opacity': { layerId: string; opacity: number };
    'layer:error': { layerId: string; error: Error };

    // Plugin events
    'plugin:loading': { pluginId: string };
    'plugin:ready': { pluginId: string };
    'plugin:error': { pluginId: string; error: Error };
    'plugin:destroyed': { pluginId: string };

    // Feature events
    'feature:enabled': { featureKey: string };
    'feature:disabled': { featureKey: string };

    // Data source events
    'datasource:connected': { sourceId: string };
    'datasource:disconnected': { sourceId: string };
    'datasource:data': { sourceId: string; data: unknown };
    'datasource:error': { sourceId: string; error: Error };

    // UI events
    'ui:modal:open': { modalId: string };
    'ui:modal:close': { modalId: string };
    'ui:panel:change': { panelId: string | null };

    // Navigation events
    'navigation:flyto:start': { location: string };
    'navigation:flyto:end': { location: string };
}

/**
 * Global event bus singleton
 * 
 * @example
 * ```ts
 * // Subscribe to an event
 * const unsubscribe = eventBus.on('layer:added', ({ layerId }) => {
 *   console.log(`Layer ${layerId} was added`);
 * });
 * 
 * // Emit an event
 * eventBus.emit('layer:added', { layerId: 'my-layer' });
 * 
 * // Unsubscribe when done
 * unsubscribe();
 * ```
 */
class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    /**
     * Subscribe to an event
     */
    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): Unsubscribe {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        const callbacks = this.listeners.get(event)!;
        callbacks.add(callback as EventCallback);

        // Return unsubscribe function
        return () => {
            callbacks.delete(callback as EventCallback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        };
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     */
    once<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): Unsubscribe {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }

    /**
     * Emit an event
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event (or all events)
     */
    off<K extends keyof EventMap>(event?: K): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get the number of listeners for an event
     */
    listenerCount<K extends keyof EventMap>(event: K): number {
        return this.listeners.get(event)?.size ?? 0;
    }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export class for testing
export { EventBus };
