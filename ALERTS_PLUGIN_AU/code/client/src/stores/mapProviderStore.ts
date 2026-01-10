import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapProvider = 'maptiler' | 'mapbox';

interface MapProviderState {
    provider: MapProvider;
    setProvider: (provider: MapProvider) => void;
}

const DEFAULT_PROVIDER: MapProvider = (import.meta.env.VITE_RECONMAP_DEFAULT_PROVIDER as MapProvider) || 'mapbox';

export const useMapProviderStore = create<MapProviderState>()(
    persist(
        (set) => ({
            provider: DEFAULT_PROVIDER,
            setProvider: (provider) => set({ provider }),
        }),
        {
            name: 'reconmap-provider',
        }
    )
);
