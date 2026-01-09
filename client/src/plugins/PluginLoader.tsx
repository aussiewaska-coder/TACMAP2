// PluginLoader - Handles plugin initialization and lifecycle
import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores';
import { pluginRegistry } from '@/plugins/registry';
import { registerAllPlugins } from '@/plugins';

/**
 * Component that initializes the plugin system
 */
export function PluginLoader() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // Register all plugins once on mount
    useEffect(() => {
        registerAllPlugins();
    }, []);

    // Initialize/Enable plugins when map is ready
    useEffect(() => {
        if (!map || !isLoaded) return;

        console.log('[Plugins] Map is ready, initializing plugins...');
        pluginRegistry.setMap(map);

        // Enable default plugins
        const enableDefaults = async () => {
            const plugins = pluginRegistry.getAll();
            for (const p of plugins) {
                if (p.definition.defaultEnabled) {
                    await pluginRegistry.enable(p.definition.id);
                }
            }
        };

        enableDefaults();

        return () => {
            // Check if we should cleanup - if map is null, MapCore already signaled destruction
            const currentMap = useMapStore.getState().map;
            if (currentMap) {
                console.log('[Plugins] Cleaning up plugins...');
                pluginRegistry.disableAll();
            } else {
                console.log('[Plugins] Map already destroyed, skipping cleanup');
            }
            pluginRegistry.setMap(null);
        };
    }, [map, isLoaded]);

    return null; // Side-effect only component
}

export default PluginLoader;
