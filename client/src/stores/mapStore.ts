import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MapState {
  center: [number, number];
  zoom: number;
  setView: (center: [number, number], zoom: number) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      center: [133.7751, -25.2744],
      zoom: 4,
      setView: (center, zoom) => set({ center, zoom }),
    }),
    { name: 'tacmap-state' }
  )
);
