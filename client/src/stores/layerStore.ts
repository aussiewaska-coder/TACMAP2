// Layer store - Shared state for map layers
// This store is SHARED between mobile and desktop views

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '@/events/EventBus';

/**
 * Layer type definitions
 */
export type LayerType = 'geojson' | 'raster' | 'vector' | 'heatmap' | 'cluster' | 'live';

export interface LayerDefinition {
    id: string;
    name: string;
    type: LayerType;
    visible: boolean;
    opacity: number;
    zIndex: number;
    interactive: boolean;
    minZoom?: number;
    maxZoom?: number;
    metadata?: Record<string, unknown>;
}

interface LayerState {
    // Active layers (ordered by z-index)
    layers: Map<string, LayerDefinition>;
    layerOrder: string[];

    // Loading state per layer
    loadingLayers: Set<string>;
    layerErrors: Map<string, Error>;

    // Actions
    addLayer: (layer: LayerDefinition) => void;
    removeLayer: (layerId: string) => void;
    updateLayer: (layerId: string, updates: Partial<LayerDefinition>) => void;

    setLayerVisibility: (layerId: string, visible: boolean) => void;
    toggleLayerVisibility: (layerId: string) => void;
    setLayerOpacity: (layerId: string, opacity: number) => void;

    setLayerOrder: (order: string[]) => void;
    moveLayerUp: (layerId: string) => void;
    moveLayerDown: (layerId: string) => void;

    setLayerLoading: (layerId: string, loading: boolean) => void;
    setLayerError: (layerId: string, error: Error | null) => void;

    getLayer: (layerId: string) => LayerDefinition | undefined;
    getVisibleLayers: () => LayerDefinition[];

    // Bulk operations
    hideAllLayers: () => void;
    showAllLayers: () => void;
    removeAllLayers: () => void;
}

export const useLayerStore = create<LayerState>()(
    subscribeWithSelector((set, get) => ({
        layers: new Map(),
        layerOrder: [],
        loadingLayers: new Set(),
        layerErrors: new Map(),

        addLayer: (layer) => {
            set((state) => {
                const newLayers = new Map(state.layers);
                newLayers.set(layer.id, layer);
                return {
                    layers: newLayers,
                    layerOrder: [...state.layerOrder, layer.id],
                };
            });
            eventBus.emit('layer:added', { layerId: layer.id });
        },

        removeLayer: (layerId) => {
            set((state) => {
                const newLayers = new Map(state.layers);
                newLayers.delete(layerId);

                const newLoadingLayers = new Set(state.loadingLayers);
                newLoadingLayers.delete(layerId);

                const newLayerErrors = new Map(state.layerErrors);
                newLayerErrors.delete(layerId);

                return {
                    layers: newLayers,
                    layerOrder: state.layerOrder.filter((id) => id !== layerId),
                    loadingLayers: newLoadingLayers,
                    layerErrors: newLayerErrors,
                };
            });
            eventBus.emit('layer:removed', { layerId });
        },

        updateLayer: (layerId, updates) => {
            set((state) => {
                const layer = state.layers.get(layerId);
                if (!layer) return state;

                const newLayers = new Map(state.layers);
                newLayers.set(layerId, { ...layer, ...updates });
                return { layers: newLayers };
            });
        },

        setLayerVisibility: (layerId, visible) => {
            get().updateLayer(layerId, { visible });
            eventBus.emit('layer:visibility', { layerId, visible });
        },

        toggleLayerVisibility: (layerId) => {
            const layer = get().layers.get(layerId);
            if (layer) {
                get().setLayerVisibility(layerId, !layer.visible);
            }
        },

        setLayerOpacity: (layerId, opacity) => {
            const clampedOpacity = Math.max(0, Math.min(1, opacity));
            get().updateLayer(layerId, { opacity: clampedOpacity });
            eventBus.emit('layer:opacity', { layerId, opacity: clampedOpacity });
        },

        setLayerOrder: (order) => set({ layerOrder: order }),

        moveLayerUp: (layerId) => {
            const { layerOrder } = get();
            const index = layerOrder.indexOf(layerId);
            if (index < layerOrder.length - 1) {
                const newOrder = [...layerOrder];
                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                set({ layerOrder: newOrder });
            }
        },

        moveLayerDown: (layerId) => {
            const { layerOrder } = get();
            const index = layerOrder.indexOf(layerId);
            if (index > 0) {
                const newOrder = [...layerOrder];
                [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                set({ layerOrder: newOrder });
            }
        },

        setLayerLoading: (layerId, loading) => {
            set((state) => {
                const newLoadingLayers = new Set(state.loadingLayers);
                if (loading) {
                    newLoadingLayers.add(layerId);
                } else {
                    newLoadingLayers.delete(layerId);
                }
                return { loadingLayers: newLoadingLayers };
            });
        },

        setLayerError: (layerId, error) => {
            set((state) => {
                const newLayerErrors = new Map(state.layerErrors);
                if (error) {
                    newLayerErrors.set(layerId, error);
                    eventBus.emit('layer:error', { layerId, error });
                } else {
                    newLayerErrors.delete(layerId);
                }
                return { layerErrors: newLayerErrors };
            });
        },

        getLayer: (layerId) => get().layers.get(layerId),

        getVisibleLayers: () => {
            const { layers, layerOrder } = get();
            return layerOrder
                .map((id) => layers.get(id))
                .filter((layer): layer is LayerDefinition => layer !== undefined && layer.visible);
        },

        hideAllLayers: () => {
            const { layers } = get();
            layers.forEach((layer) => {
                get().setLayerVisibility(layer.id, false);
            });
        },

        showAllLayers: () => {
            const { layers } = get();
            layers.forEach((layer) => {
                get().setLayerVisibility(layer.id, true);
            });
        },

        removeAllLayers: () => {
            const { layerOrder } = get();
            layerOrder.forEach((layerId) => {
                get().removeLayer(layerId);
            });
        },
    }))
);

// Selector hooks
export const useLayers = () => useLayerStore((state) =>
    state.layerOrder.map((id) => state.layers.get(id)).filter(Boolean) as LayerDefinition[]
);

export const useVisibleLayers = () => useLayerStore((state) => state.getVisibleLayers());

export const useLayerById = (layerId: string) => useLayerStore((state) => state.layers.get(layerId));
