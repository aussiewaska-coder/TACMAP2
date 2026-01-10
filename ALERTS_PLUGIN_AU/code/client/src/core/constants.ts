// Core constants for the TACMAP mapping platform
// These are shared across the entire application

/**
 * Australia-centered map configuration
 */
export const MAP_CONFIG = {
  // Default center: Geographic center of Australia
  DEFAULT_CENTER: [133.7751, -25.2744] as [number, number],
  
  // Default zoom levels
  DEFAULT_ZOOM: 4,
  MIN_ZOOM: 3,
  MAX_ZOOM: 20,
  
  // Default camera settings
  DEFAULT_PITCH: 0,
  DEFAULT_BEARING: 0,
  
  // Animation durations (ms)
  FLY_TO_DURATION: 3500,
  EASE_TO_DURATION: 1000,
  
  // Terrain configuration
  TERRAIN: {
    // AWS Terrain Tiles (Terrarium encoding)
    SOURCE_URL: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    ENCODING: 'terrarium' as const,
    TILE_SIZE: 256,
    MAX_ZOOM: 15,
    DEFAULT_EXAGGERATION: 1.5,
    MIN_EXAGGERATION: 0.5,
    MAX_EXAGGERATION: 3.0,
  },
  
  // Australia bounds (for constraining pan)
  BOUNDS: {
    MIN_LNG: 112.0,
    MAX_LNG: 154.0,
    MIN_LAT: -44.0,
    MAX_LAT: -10.0,
  },
} as const;

/**
 * Australian cities for quick navigation
 */
export const AUSTRALIAN_CITIES = [
  { id: 'sydney', name: 'Sydney', coordinates: [151.2093, -33.8688] as [number, number], zoom: 12 },
  { id: 'melbourne', name: 'Melbourne', coordinates: [144.9631, -37.8136] as [number, number], zoom: 12 },
  { id: 'brisbane', name: 'Brisbane', coordinates: [153.0251, -27.4698] as [number, number], zoom: 12 },
  { id: 'perth', name: 'Perth', coordinates: [115.8605, -31.9505] as [number, number], zoom: 12 },
  { id: 'adelaide', name: 'Adelaide', coordinates: [138.6007, -34.9285] as [number, number], zoom: 12 },
  { id: 'canberra', name: 'Canberra', coordinates: [149.1300, -35.2809] as [number, number], zoom: 12 },
  { id: 'hobart', name: 'Hobart', coordinates: [147.3272, -42.8821] as [number, number], zoom: 12 },
  { id: 'darwin', name: 'Darwin', coordinates: [130.8456, -12.4634] as [number, number], zoom: 12 },
] as const;

/**
 * Scenic/mountainous locations for terrain demos
 */
export const SCENIC_LOCATIONS = [
  { id: 'blue-mountains', name: 'Blue Mountains', coordinates: [150.3117, -33.7320] as [number, number], zoom: 13 },
  { id: 'cradle-mountain', name: 'Cradle Mountain', coordinates: [145.9500, -41.6848] as [number, number], zoom: 13 },
  { id: 'uluru', name: 'Uluru', coordinates: [131.0369, -25.3444] as [number, number], zoom: 14 },
  { id: 'snowy-mountains', name: 'Snowy Mountains', coordinates: [148.3000, -36.4500] as [number, number], zoom: 11 },
] as const;

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/**
 * Z-index layers for UI elements
 */
export const Z_INDEX = {
  MAP: 0,
  CONTROLS: 10,
  SIDEBAR: 20,
  OVERLAY: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  TOAST: 60,
  TOOLTIP: 70,
} as const;
