// Centralized plugin registration
import { pluginRegistry } from './registry';
import { navigationPlugin } from './navigation';
import { terrainPlugin } from './terrain';
import { basemapPlugin } from './basemaps';
import { geocoderPlugin } from './geocoder';
import { directionsPlugin } from './directions';
import { measurementPlugin } from './measurement';
import { weatherPlugin } from './weather';

/**
 * Register all available plugins
 */
export function registerAllPlugins() {
    console.log('[Plugins] Registering all plugins...');

    pluginRegistry.register(navigationPlugin);
    pluginRegistry.register(terrainPlugin);
    pluginRegistry.register(basemapPlugin);
    pluginRegistry.register(geocoderPlugin);
    pluginRegistry.register(directionsPlugin);
    pluginRegistry.register(measurementPlugin);
    pluginRegistry.register(weatherPlugin);

    console.log('[Plugins] All plugins registered');
}

export * from './registry';
