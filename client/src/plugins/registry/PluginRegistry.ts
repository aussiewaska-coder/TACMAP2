// Plugin Registry - Central registration and management of plugins
// All map functionality (except base canvas) is implemented as plugins

import type { Map as MapLibreGLMap } from 'maplibre-gl';
import { eventBus } from '@/events/EventBus';

/**
 * Plugin status
 */
export type PluginStatus =
    | 'registered'
    | 'pending'
    | 'loading'
    | 'initializing'
    | 'active'
    | 'error'
    | 'destroyed';

/**
 * Plugin category
 */
export type PluginCategory = 'core' | 'visualization' | 'tools' | 'data' | 'export';

/**
 * Plugin configuration
 */
export interface PluginConfig {
    [key: string]: unknown;
}

/**
 * Plugin definition interface
 * All plugins must implement this interface
 */
export interface PluginDefinition {
    /** Unique plugin identifier */
    id: string;

    /** Human-readable name */
    name: string;

    /** Plugin description */
    description: string;

    /** Plugin category for organization */
    category: PluginCategory;

    /** Plugin version (semver) */
    version: string;

    /** Required plugins that must be loaded first */
    dependencies?: string[];

    /** Default enabled state */
    defaultEnabled: boolean;

    /** Initialize plugin when enabled */
    initialize: (map: MapLibreGLMap, config?: PluginConfig) => Promise<PluginInstance>;

    /** Default configuration */
    defaultConfig?: PluginConfig;
}

/**
 * Plugin instance (returned from initialize)
 */
export interface PluginInstance {
    /** Plugin ID */
    id: string;

    /** Destroy/cleanup the plugin */
    destroy: () => Promise<void>;

    /** Optional: Update configuration */
    updateConfig?: (config: PluginConfig) => void;

    /** Optional: Get current configuration */
    getConfig?: () => PluginConfig;
}

/**
 * Registered plugin state
 */
interface RegisteredPlugin {
    definition: PluginDefinition;
    instance: PluginInstance | null;
    status: PluginStatus;
    error: Error | null;
    config: PluginConfig;
}

/**
 * Plugin Registry
 * Manages plugin registration, lifecycle, and dependencies
 */
class PluginRegistryClass {
    private plugins: Map<string, RegisteredPlugin> = new Map();
    private map: MapLibreGLMap | null = null;

    /**
     * Set the map instance for plugins to use
     */
    setMap(map: MapLibreGLMap | null): void {
        this.map = map;
    }

    /**
     * Register a plugin definition
     */
    register(definition: PluginDefinition): void {
        if (this.plugins.has(definition.id)) {
            console.warn(`[PluginRegistry] Plugin "${definition.id}" already registered`);
            return;
        }

        this.plugins.set(definition.id, {
            definition,
            instance: null,
            status: 'registered',
            error: null,
            config: definition.defaultConfig || {},
        });

        console.log(`[PluginRegistry] Registered plugin: ${definition.id}`);
    }

    /**
     * Get a registered plugin
     */
    get(id: string): RegisteredPlugin | undefined {
        return this.plugins.get(id);
    }

    /**
     * Get all registered plugins
     */
    getAll(): RegisteredPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get plugins by category
     */
    getByCategory(category: PluginCategory): RegisteredPlugin[] {
        return this.getAll().filter((p) => p.definition.category === category);
    }

    /**
     * Enable and initialize a plugin
     */
    async enable(id: string, config?: PluginConfig): Promise<boolean> {
        const plugin = this.plugins.get(id);
        if (!plugin) {
            console.error(`[PluginRegistry] Plugin "${id}" not found`);
            return false;
        }

        if (plugin.status === 'active') {
            console.warn(`[PluginRegistry] Plugin "${id}" is already active`);
            return true;
        }

        if (!this.map) {
            console.error(`[PluginRegistry] Cannot enable plugin "${id}": map not set`);
            return false;
        }

        // Check dependencies
        const deps = plugin.definition.dependencies || [];
        for (const depId of deps) {
            const dep = this.plugins.get(depId);
            if (!dep || dep.status !== 'active') {
                console.error(`[PluginRegistry] Cannot enable plugin "${id}": dependency "${depId}" not active`);
                return false;
            }
        }

        try {
            // Update status
            plugin.status = 'loading';
            eventBus.emit('plugin:loading', { pluginId: id });

            // Merge config
            const mergedConfig = { ...plugin.config, ...config };
            plugin.config = mergedConfig;

            // Initialize
            plugin.status = 'initializing';
            const instance = await plugin.definition.initialize(this.map, mergedConfig);

            plugin.instance = instance;
            plugin.status = 'active';
            plugin.error = null;

            eventBus.emit('plugin:ready', { pluginId: id });
            console.log(`[PluginRegistry] Plugin "${id}" is now active`);

            return true;
        } catch (error) {
            plugin.status = 'error';
            plugin.error = error instanceof Error ? error : new Error(String(error));

            eventBus.emit('plugin:error', { pluginId: id, error: plugin.error });
            console.error(`[PluginRegistry] Failed to enable plugin "${id}":`, error);

            return false;
        }
    }

    /**
     * Disable and destroy a plugin
     */
    async disable(id: string): Promise<boolean> {
        const plugin = this.plugins.get(id);
        if (!plugin) {
            console.error(`[PluginRegistry] Plugin "${id}" not found`);
            return false;
        }

        if (plugin.status !== 'active' || !plugin.instance) {
            console.warn(`[PluginRegistry] Plugin "${id}" is not active`);
            return true;
        }

        // Check if other plugins depend on this one
        const dependents = this.getAll().filter(
            (p) => p.status === 'active' && p.definition.dependencies?.includes(id)
        );

        if (dependents.length > 0) {
            console.error(
                `[PluginRegistry] Cannot disable plugin "${id}": other plugins depend on it:`,
                dependents.map((p) => p.definition.id)
            );
            return false;
        }

        try {
            await plugin.instance.destroy();
            plugin.instance = null;
            plugin.status = 'registered';

            eventBus.emit('plugin:destroyed', { pluginId: id });
            console.log(`[PluginRegistry] Plugin "${id}" has been disabled`);

            return true;
        } catch (error) {
            console.error(`[PluginRegistry] Failed to disable plugin "${id}":`, error);
            return false;
        }
    }

    /**
     * Update plugin configuration
     */
    updateConfig(id: string, config: Partial<PluginConfig>): void {
        const plugin = this.plugins.get(id);
        if (!plugin) return;

        plugin.config = { ...plugin.config, ...config };

        if (plugin.instance?.updateConfig) {
            plugin.instance.updateConfig(plugin.config);
        }
    }

    /**
     * Disable all plugins
     */
    async disableAll(): Promise<void> {
        const activePlugins = this.getAll().filter((p) => p.status === 'active');

        // Disable in reverse order of dependencies
        for (const plugin of activePlugins.reverse()) {
            await this.disable(plugin.definition.id);
        }
    }

    /**
     * Clear all registrations
     */
    clear(): void {
        this.plugins.clear();
        this.map = null;
    }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistryClass();

// Export class for testing
export { PluginRegistryClass };

/**
 * Helper to define a plugin with type safety
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
    return definition;
}
