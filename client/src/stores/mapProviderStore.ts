import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapProvider = 'maptiler' | 'mapbox';

interface MapProviderState {
    provider: MapProvider;
    setProvider: (provider: MapProvider) => void;
    maptilerStyle: string;
    setMaptilerStyle: (style: string) => void;
}

const DEFAULT_PROVIDER: MapProvider = (import.meta.env.VITE_RECONMAP_DEFAULT_PROVIDER as MapProvider) || 'maptiler';
const DEFAULT_MAPTILER_STYLE = (import.meta.env.VITE_MAPTILER_STYLE as string | undefined) || '019ba6b7-5a01-7042-bc9a-d1ace6393958';

export const useMapProviderStore = create<MapProviderState>()(
    persist(
        (set) => ({
            provider: DEFAULT_PROVIDER,
            setProvider: (provider) => set({ provider }),
            maptilerStyle: DEFAULT_MAPTILER_STYLE,
            setMaptilerStyle: (style) => set({ maptilerStyle: style }),
        }),
        {
            name: 'reconmap-provider',
        }
    )
);
