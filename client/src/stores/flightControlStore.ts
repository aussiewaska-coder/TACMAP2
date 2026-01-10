import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FlightMode = 'auto-rotate' | 'auto-orbit' | 'flight' | 'random-path' | 'standard';

export interface Bookmark {
  id: string;
  name: string;
  coords: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  icon?: string;
  color?: string;
  createdAt: number;
}

export interface PathPoint {
  coords: [number, number];
  timestamp: number;
  altitude: number;
  heading: number;
}

export type FlightWarningType = 'altitude-high' | 'altitude-low' | 'speed-fast' | 'speed-slow' | 'terrain-proximity';
export type WarningsSeverity = 'info' | 'warning' | 'danger';

export interface FlightWarning {
  type: FlightWarningType;
  severity: WarningsSeverity;
  message: string;
}

export interface FlightControlState {
  // Mode
  activeMode: FlightMode;
  setActiveMode: (mode: FlightMode) => void;

  // Bookmarks
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;

  // Flight path trail
  pathPoints: PathPoint[];
  addPathPoint: (point: PathPoint) => void;
  clearPath: () => void;
  maxPathPoints: number;
  pathVisible: boolean;
  setPathVisible: (visible: boolean) => void;

  // Warnings
  warnings: FlightWarning[];
  addWarning: (warning: FlightWarning) => void;
  clearWarnings: () => void;
  removeWarning: (type: FlightWarningType) => void;

  // UI state
  showKeyboardHelp: boolean;
  toggleKeyboardHelp: () => void;

  // Magnification
  activeMagnification: null | '5x' | '10x';
  setMagnification: (mag: null | '5x' | '10x') => void;
  baseZoom: number;
  setBaseZoom: (zoom: number) => void;

  // Collapse state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useFlightControlStore = create<FlightControlState>()(
  persist(
    (set) => ({
      // Mode
      activeMode: 'standard',
      setActiveMode: (mode) => set({ activeMode: mode }),

      // Bookmarks
      bookmarks: [],
      addBookmark: (bookmark) =>
        set((state) => ({
          bookmarks: [
            ...state.bookmarks,
            {
              ...bookmark,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
            },
          ],
        })),
      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),
      updateBookmark: (id, updates) =>
        set((state) => ({
          bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      // Path trail
      pathPoints: [],
      addPathPoint: (point) =>
        set((state) => {
          const newPoints = [...state.pathPoints, point];
          // Keep only last N points
          if (newPoints.length > state.maxPathPoints) {
            newPoints.shift();
          }
          return { pathPoints: newPoints };
        }),
      clearPath: () => set({ pathPoints: [] }),
      maxPathPoints: 100,
      pathVisible: true,
      setPathVisible: (visible) => set({ pathVisible: visible }),

      // Warnings
      warnings: [],
      addWarning: (warning) =>
        set((state) => {
          // Deduplicate by type - remove old warning of same type
          const filtered = state.warnings.filter((w) => w.type !== warning.type);
          return { warnings: [...filtered, warning] };
        }),
      clearWarnings: () => set({ warnings: [] }),
      removeWarning: (type) =>
        set((state) => ({
          warnings: state.warnings.filter((w) => w.type !== type),
        })),

      // UI state
      showKeyboardHelp: false,
      toggleKeyboardHelp: () => set((state) => ({ showKeyboardHelp: !state.showKeyboardHelp })),

      // Magnification
      activeMagnification: null,
      setMagnification: (mag) => set({ activeMagnification: mag }),
      baseZoom: 0,
      setBaseZoom: (zoom) => set({ baseZoom: zoom }),

      // Collapse state
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'reconmap-flight-control',
      version: 1,
      // Only persist specific state
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        showKeyboardHelp: state.showKeyboardHelp,
        pathVisible: state.pathVisible,
        maxPathPoints: state.maxPathPoints,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
