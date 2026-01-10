export interface StrategicLocation {
  id: string;
  name: string;
  coordinates: [number, number]; // [lon, lat]
  zoom: number;
  priority: 1 | 2 | 3;
  radiusTiles: number;
}

export const STRATEGIC_LOCATIONS: StrategicLocation[] = [
  // Priority 1: Default + Major metros
  { id: 'byron-bay', name: 'Byron Bay', coordinates: [153.6020, -28.6474], zoom: 12, priority: 1, radiusTiles: 4 },
  { id: 'sydney', name: 'Sydney', coordinates: [151.2093, -33.8688], zoom: 12, priority: 1, radiusTiles: 5 },
  { id: 'melbourne', name: 'Melbourne', coordinates: [144.9631, -37.8136], zoom: 12, priority: 1, radiusTiles: 5 },
  { id: 'brisbane', name: 'Brisbane', coordinates: [153.0251, -27.4698], zoom: 12, priority: 1, radiusTiles: 4 },

  // Priority 2: State capitals + Alt lifestyle
  { id: 'perth', name: 'Perth', coordinates: [115.8605, -31.9505], zoom: 12, priority: 2, radiusTiles: 4 },
  { id: 'adelaide', name: 'Adelaide', coordinates: [138.6007, -34.9285], zoom: 12, priority: 2, radiusTiles: 4 },
  { id: 'hobart', name: 'Hobart', coordinates: [147.3272, -42.8821], zoom: 12, priority: 2, radiusTiles: 3 },
  { id: 'nimbin', name: 'Nimbin', coordinates: [153.2240, -28.5960], zoom: 12, priority: 2, radiusTiles: 2 },

  // Priority 3: Regional
  { id: 'darwin', name: 'Darwin', coordinates: [130.8456, -12.4634], zoom: 12, priority: 3, radiusTiles: 3 },
  { id: 'canberra', name: 'Canberra', coordinates: [149.1300, -35.2809], zoom: 12, priority: 3, radiusTiles: 3 },
];

export const CACHE_WARM_CONCURRENCY = 5;
