import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapProvider = 'maptiler' | 'mapbox';

interface MapProviderState {
  provider: MapProvider;
  maptilerStyle: string | null;
  setProvider: (provider: MapProvider) => void;
  setMaptilerStyle: (styleId: string) => void;
}

export const useMapProviderStore = create<MapProviderState>()(
  persist(
    (set) => ({
      provider: 'maptiler',
      maptilerStyle: null,
      setProvider: (provider) => set({ provider }),
      setMaptilerStyle: (maptilerStyle) => set({ maptilerStyle }),
    }),
    {
      name: 'reconmap-provider',
      version: 3,
    }
  )
);
