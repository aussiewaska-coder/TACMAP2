import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Map as MapTilerMap } from '@maptiler/sdk';

interface MapState {
  map: MapTilerMap | null;
  isLoaded: boolean;
  isInitializing: boolean;
  error: Error | null;

  setMap: (map: MapTilerMap | null) => void;
  setLoaded: (loaded: boolean) => void;
  setInitializing: (init: boolean) => void;
  setError: (error: Error | null) => void;
}

export const useMapStore = create<MapState>()(
  subscribeWithSelector((set) => ({
    map: null,
    isLoaded: false,
    isInitializing: false,
    error: null,

    setMap: (map) => set({ map }),
    setLoaded: (isLoaded) => set({ isLoaded }),
    setInitializing: (isInitializing) => set({ isInitializing }),
    setError: (error) => set({ error }),
  }))
);

// Selector hooks
export const useMap = () => useMapStore((s) => s.map);
export const useMapLoaded = () => useMapStore((s) => s.isLoaded);
