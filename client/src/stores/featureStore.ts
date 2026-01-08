// Feature store - Shared state for feature flags
// This store is SHARED between mobile and desktop views

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '@/events/EventBus';

/**
 * Feature categories
 */
export type FeatureCategory = 'core' | 'plugin' | 'layer' | 'ui' | 'experimental';

/**
 * Feature definition
 */
export interface FeatureDefinition {
    key: string;
    name: string;
    description: string;
    category: FeatureCategory;
    enabled: boolean;
    adminOnly: boolean;
    pluginId?: string;
    config?: Record<string, unknown>;
}

interface FeatureState {
    // Feature definitions
    features: Map<string, FeatureDefinition>;

    // Loading state
    isLoading: boolean;
    error: Error | null;

    // Actions
    setFeatures: (features: FeatureDefinition[]) => void;
    setFeature: (key: string, feature: FeatureDefinition) => void;

    enableFeature: (key: string) => void;
    disableFeature: (key: string) => void;
    toggleFeature: (key: string) => void;

    updateFeatureConfig: (key: string, config: Record<string, unknown>) => void;

    isFeatureEnabled: (key: string) => boolean;
    getFeature: (key: string) => FeatureDefinition | undefined;
    getFeaturesByCategory: (category: FeatureCategory) => FeatureDefinition[];
    getEnabledFeatures: () => FeatureDefinition[];

    setLoading: (loading: boolean) => void;
    setError: (error: Error | null) => void;
}

// Default features (used before server data loads)
const DEFAULT_FEATURES: FeatureDefinition[] = [
    {
        key: 'terrain_3d',
        name: '3D Terrain',
        description: 'Enable 3D terrain elevation with AWS terrain tiles',
        category: 'core',
        enabled: true,
        adminOnly: false,
        pluginId: 'terrain',
        config: { exaggeration: 1.5 },
    },
    {
        key: 'basemap_switcher',
        name: 'Basemap Styles',
        description: 'Allow switching between basemap styles',
        category: 'core',
        enabled: true,
        adminOnly: false,
        pluginId: 'basemaps',
    },
    {
        key: 'draw_tools',
        name: 'Drawing Tools',
        description: 'Enable drawing points, lines, and polygons',
        category: 'plugin',
        enabled: true,
        adminOnly: false,
        pluginId: 'drawing',
    },
    {
        key: 'geocoder',
        name: 'Search & Geocoding',
        description: 'Enable location search',
        category: 'plugin',
        enabled: true,
        adminOnly: false,
        pluginId: 'geocoder',
    },
    {
        key: 'measurement',
        name: 'Measurement Tools',
        description: 'Measure distances and areas',
        category: 'plugin',
        enabled: true,
        adminOnly: false,
        pluginId: 'measurement',
    },
    {
        key: 'city_navigation',
        name: 'City Quick Navigation',
        description: 'Quick fly-to buttons for Australian cities',
        category: 'ui',
        enabled: true,
        adminOnly: false,
        pluginId: 'navigation',
    },
    {
        key: 'live_data_layers',
        name: 'Live Data Layers',
        description: 'Support for real-time data streaming',
        category: 'layer',
        enabled: true,
        adminOnly: true,
    },
];

export const useFeatureStore = create<FeatureState>()(
    subscribeWithSelector((set, get) => ({
        features: new Map(DEFAULT_FEATURES.map((f) => [f.key, f])),
        isLoading: false,
        error: null,

        setFeatures: (features) => {
            set({
                features: new Map(features.map((f) => [f.key, f])),
            });
        },

        setFeature: (key, feature) => {
            set((state) => {
                const newFeatures = new Map(state.features);
                newFeatures.set(key, feature);
                return { features: newFeatures };
            });
        },

        enableFeature: (key) => {
            const feature = get().features.get(key);
            if (feature && !feature.enabled) {
                get().setFeature(key, { ...feature, enabled: true });
                eventBus.emit('feature:enabled', { featureKey: key });
            }
        },

        disableFeature: (key) => {
            const feature = get().features.get(key);
            if (feature && feature.enabled) {
                get().setFeature(key, { ...feature, enabled: false });
                eventBus.emit('feature:disabled', { featureKey: key });
            }
        },

        toggleFeature: (key) => {
            const feature = get().features.get(key);
            if (feature) {
                if (feature.enabled) {
                    get().disableFeature(key);
                } else {
                    get().enableFeature(key);
                }
            }
        },

        updateFeatureConfig: (key, config) => {
            const feature = get().features.get(key);
            if (feature) {
                get().setFeature(key, {
                    ...feature,
                    config: { ...feature.config, ...config },
                });
            }
        },

        isFeatureEnabled: (key) => {
            const feature = get().features.get(key);
            return feature?.enabled ?? false;
        },

        getFeature: (key) => get().features.get(key),

        getFeaturesByCategory: (category) => {
            const { features } = get();
            return Array.from(features.values()).filter((f) => f.category === category);
        },

        getEnabledFeatures: () => {
            const { features } = get();
            return Array.from(features.values()).filter((f) => f.enabled);
        },

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
    }))
);

// Selector hooks
export const useFeature = (key: string) => useFeatureStore((state) => state.features.get(key));
export const useFeatureEnabled = (key: string) => useFeatureStore((state) => state.isFeatureEnabled(key));
export const useEnabledFeatures = () => useFeatureStore((state) => state.getEnabledFeatures());
