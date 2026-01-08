# TACMAP2 - Modular Mapping Platform Architecture

**Version:** 2.0.0  
**Created:** January 8, 2026  
**Purpose:** A fully modular, plugin-based mapping platform with support for live streaming data, custom data sources, and runtime feature toggling.

---

## 🎯 Core Design Principles

### 1. **Modularity First**
Every feature is a self-contained module that can be:
- Enabled/disabled at runtime via feature flags
- Added/removed without touching core code
- Tested in isolation
- Hot-swapped without full page reload

### 2. **Plugin Architecture**
All map functionality (except the base canvas) is implemented as plugins:
- Plugins register themselves with a central registry
- Plugins declare their dependencies
- Plugins can communicate via an event bus
- Plugins are lazy-loaded when enabled

### 3. **Data Source Agnostic**
The layer system doesn't care where data comes from:
- Static GeoJSON files
- REST API endpoints
- WebSocket live streams
- Server-Sent Events (SSE)
- Local IndexedDB cache

### 4. **Separation of Concerns**
```
┌─────────────────────────────────────────────────────────────┐
│                        UI Components                         │
│  (React components that render controls, modals, overlays)  │
├─────────────────────────────────────────────────────────────┤
│                     State Management                         │
│  (Zustand stores for map state, features, layers, UI)       │
├─────────────────────────────────────────────────────────────┤
│                      Plugin System                           │
│  (Registry, lifecycle management, dependency resolution)    │
├─────────────────────────────────────────────────────────────┤
│                      Layer Manager                           │
│  (Add/remove/update layers, style management, z-ordering)   │
├─────────────────────────────────────────────────────────────┤
│                    Data Source Layer                         │
│  (Adapters for static, API, WebSocket, SSE data sources)    │
├─────────────────────────────────────────────────────────────┤
│                    MapLibre GL Core                          │
│  (Base map canvas, tile rendering, interaction handling)    │
└─────────────────────────────────────────────────────────────┘
```

### 5. **Independent Mobile & Desktop Experiences**
Mobile and desktop views are **completely independent** in terms of UI state and behavior:
- **Shared:** Design system, CSS variables, component styling, feature flags, map state
- **Independent:** Button states, modal visibility, active panels, control positions
- Toggling a feature on mobile does NOT affect the desktop view (and vice versa)
- Each viewport maintains its own UI store instance

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Foundation                         │
│  (Design tokens, CSS, theme, feature flags, map state)      │
├──────────────────────────┬──────────────────────────────────┤
│    Mobile UI State       │       Desktop UI State           │
│  ┌────────────────────┐  │  ┌────────────────────────────┐  │
│  │ mobileUIStore      │  │  │ desktopUIStore             │  │
│  │ - activePanel      │  │  │ - activePanel              │  │
│  │ - openModals       │  │  │ - openModals               │  │
│  │ - controlPositions │  │  │ - sidebarCollapsed         │  │
│  │ - bottomSheetState │  │  │ - panelPositions           │  │
│  └────────────────────┘  │  └────────────────────────────┘  │
├──────────────────────────┼──────────────────────────────────┤
│   MobileControls.tsx     │      DesktopControls.tsx         │
│   MobileModals.tsx       │      DesktopPanels.tsx           │
│   BottomSheet.tsx        │      Sidebar.tsx                 │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 📁 Directory Structure

```
client/src/
├── app/                          # Application shell
│   ├── App.tsx                   # Root component, providers
│   ├── Router.tsx                # Route definitions
│   └── providers/                # Context providers
│       ├── MapProvider.tsx       # Map instance context
│       ├── FeatureProvider.tsx   # Feature flags context
│       └── ThemeProvider.tsx     # Theme context
│
├── core/                         # Core map functionality
│   ├── MapCore.tsx               # Base map component (minimal)
│   ├── MapContainer.tsx          # Container with sizing/responsive
│   ├── mapInstance.ts            # Map singleton management
│   └── constants.ts              # Map constants (Australia bounds, etc.)
│
├── plugins/                      # Plugin system
│   ├── registry/
│   │   ├── PluginRegistry.ts     # Central plugin registration
│   │   ├── PluginLoader.ts       # Lazy loading logic
│   │   └── types.ts              # Plugin interface definitions
│   │
│   ├── terrain/                  # Terrain plugin
│   │   ├── index.ts              # Plugin entry point
│   │   ├── TerrainPlugin.ts      # Plugin implementation
│   │   ├── TerrainControls.tsx   # UI component
│   │   └── terrainStore.ts       # Plugin-specific state
│   │
│   ├── navigation/               # Fly-to, city navigation
│   │   ├── index.ts
│   │   ├── NavigationPlugin.ts
│   │   ├── CityPicker.tsx
│   │   └── navigationStore.ts
│   │
│   ├── drawing/                  # Draw tools plugin
│   │   ├── index.ts
│   │   ├── DrawPlugin.ts
│   │   ├── DrawToolbar.tsx
│   │   └── drawStore.ts
│   │
│   ├── geocoder/                 # Search/geocoding plugin
│   │   ├── index.ts
│   │   ├── GeocoderPlugin.ts
│   │   ├── SearchBox.tsx
│   │   └── geocoderStore.ts
│   │
│   ├── measurement/              # Distance/area measurement
│   │   ├── index.ts
│   │   ├── MeasurementPlugin.ts
│   │   ├── MeasurementTools.tsx
│   │   └── measurementStore.ts
│   │
│   ├── export/                   # PDF/image export
│   │   ├── index.ts
│   │   ├── ExportPlugin.ts
│   │   └── ExportModal.tsx
│   │
│   └── basemaps/                 # Basemap style switching
│       ├── index.ts
│       ├── BasemapPlugin.ts
│       ├── StylePicker.tsx
│       └── basemapStore.ts
│
├── layers/                       # Layer management system
│   ├── manager/
│   │   ├── LayerManager.ts       # Central layer coordination
│   │   ├── LayerRegistry.ts      # Layer type registration
│   │   └── types.ts              # Layer interfaces
│   │
│   ├── base/
│   │   ├── BaseLayer.ts          # Abstract layer class
│   │   ├── GeoJSONLayer.ts       # GeoJSON implementation
│   │   ├── RasterLayer.ts        # Raster/tile layer
│   │   ├── VectorLayer.ts        # Vector tile layer
│   │   └── HeatmapLayer.ts       # Heatmap implementation
│   │
│   ├── specialized/
│   │   ├── ClusterLayer.ts       # Point clustering
│   │   ├── AnimatedLayer.ts      # Animated features
│   │   ├── ChoroplethLayer.ts    # Choropleth visualization
│   │   └── Building3DLayer.ts    # 3D building extrusion
│   │
│   └── live/
│       ├── LiveLayer.ts          # Base live-updating layer
│       ├── WebSocketLayer.ts     # WebSocket data source
│       ├── SSELayer.ts           # Server-Sent Events source
│       └── PollingLayer.ts       # HTTP polling source
│
├── data-sources/                 # Data source adapters
│   ├── DataSourceRegistry.ts     # Source registration
│   ├── types.ts                  # Source interfaces
│   │
│   ├── static/
│   │   ├── GeoJSONSource.ts      # Static GeoJSON
│   │   ├── FileUploadSource.ts   # User-uploaded files
│   │   └── CachedSource.ts       # IndexedDB cached data
│   │
│   ├── api/
│   │   ├── RestAPISource.ts      # REST API fetching
│   │   ├── TRPCSource.ts         # tRPC integration
│   │   └── PaginatedSource.ts    # Paginated API handling
│   │
│   └── realtime/
│       ├── WebSocketSource.ts    # WebSocket connection
│       ├── SSESource.ts          # SSE connection
│       └── MQTTSource.ts         # MQTT (future)
│
├── features/                     # Feature flag system
│   ├── FeatureRegistry.ts        # Feature registration
│   ├── FeatureGate.tsx           # Conditional rendering
│   ├── featureStore.ts           # Feature state management
│   └── hooks/
│       ├── useFeature.ts         # Check if feature enabled
│       ├── useFeatureToggle.ts   # Toggle feature on/off
│       └── useFeatureConfig.ts   # Get feature configuration
│
├── stores/                       # Global state (Zustand)
│   ├── mapStore.ts               # Map instance & state (SHARED)
│   ├── layerStore.ts             # Active layers (SHARED)
│   ├── featureStore.ts           # Feature flags (SHARED)
│   ├── mobileUIStore.ts          # Mobile UI state (INDEPENDENT)
│   ├── desktopUIStore.ts         # Desktop UI state (INDEPENDENT)
│   └── userStore.ts              # User preferences (SHARED)
│
├── hooks/                        # Shared React hooks
│   ├── useMap.ts                 # Access map instance
│   ├── useMapEvent.ts            # Subscribe to map events
│   ├── useLayer.ts               # Layer management
│   ├── useDataSource.ts          # Data source access
│   └── useBreakpoint.ts          # Responsive breakpoints
│
├── components/                   # Shared UI components
│   ├── layout/
│   │   ├── MapLayout.tsx         # Full-page map layout
│   │   ├── ControlPanel.tsx      # Side control panel
│   │   └── MobileControls.tsx    # Mobile-specific controls
│   │
│   ├── controls/
│   │   ├── ZoomControls.tsx      # Zoom +/- buttons
│   │   ├── CompassControl.tsx    # North arrow/compass
│   │   ├── ScaleBar.tsx          # Distance scale
│   │   └── GeolocateButton.tsx   # Find my location
│   │
│   ├── modals/
│   │   ├── ModalContainer.tsx    # Modal management
│   │   ├── DraggableModal.tsx    # Draggable modal base
│   │   └── ConfirmDialog.tsx     # Confirmation dialogs
│   │
│   ├── overlays/
│   │   ├── LoadingOverlay.tsx    # Loading indicator
│   │   ├── ErrorOverlay.tsx      # Error display
│   │   └── TooltipOverlay.tsx    # Map tooltips
│   │
│   └── ui/                       # shadcn/ui components
│       └── [existing ui components]
│
├── pages/                        # Page-level components
│   ├── MapPage.tsx               # Main map page (minimal)
│   ├── AdminPage.tsx             # Admin dashboard
│   └── HomePage.tsx              # Landing page
│
├── events/                       # Event system
│   ├── EventBus.ts               # Central event bus
│   ├── MapEvents.ts              # Map-specific events
│   └── types.ts                  # Event type definitions
│
├── utils/                        # Utility functions
│   ├── geo/
│   │   ├── coordinates.ts        # Coordinate helpers
│   │   ├── distance.ts           # Distance calculations
│   │   └── bounds.ts             # Bounds calculations
│   │
│   ├── style/
│   │   ├── colorScales.ts        # Color scale generators
│   │   └── expressions.ts        # MapLibre expression helpers
│   │
│   └── performance/
│       ├── debounce.ts           # Debounce helper
│       ├── throttle.ts           # Throttle helper
│       └── batchUpdates.ts       # Batch layer updates
│
└── types/                        # TypeScript definitions
    ├── map.ts                    # Map-related types
    ├── layer.ts                  # Layer types
    ├── plugin.ts                 # Plugin types
    ├── dataSource.ts             # Data source types
    └── feature.ts                # Feature flag types

server/
├── routers/                      # tRPC routers (split by domain)
│   ├── index.ts                  # Router aggregation
│   ├── auth.ts                   # Authentication
│   ├── features.ts               # Feature flags
│   ├── layers.ts                 # Layer management
│   ├── styles.ts                 # Map styles
│   └── settings.ts               # User settings
│
├── services/                     # Business logic
│   ├── FeatureService.ts
│   ├── LayerService.ts
│   └── SettingsService.ts
│
├── db/                           # Database layer
│   ├── client.ts                 # Drizzle client
│   ├── queries/                  # Query functions
│   │   ├── features.ts
│   │   ├── layers.ts
│   │   └── settings.ts
│   └── migrations/               # Schema migrations
│
└── websocket/                    # WebSocket server (future)
    ├── server.ts
    ├── handlers/
    └── types.ts
```

---

## 🔌 Plugin System

### Plugin Interface

```typescript
// plugins/registry/types.ts

export interface Plugin {
  /** Unique plugin identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Plugin description */
  description: string;
  
  /** Plugin category for organization */
  category: 'core' | 'visualization' | 'tools' | 'data' | 'export';
  
  /** Plugin version */
  version: string;
  
  /** Required plugins that must be loaded first */
  dependencies?: string[];
  
  /** Default enabled state */
  defaultEnabled: boolean;
  
  /** Initialize plugin when enabled */
  initialize: (map: MapLibreGLMap, config?: PluginConfig) => Promise<void>;
  
  /** Cleanup when disabled */
  destroy: () => Promise<void>;
  
  /** Optional UI component to render */
  component?: React.ComponentType<PluginComponentProps>;
  
  /** Optional control panel component */
  controlPanel?: React.ComponentType<PluginControlProps>;
  
  /** Plugin-specific configuration schema */
  configSchema?: z.ZodSchema;
}

export interface PluginConfig {
  [key: string]: unknown;
}

export interface PluginComponentProps {
  map: MapLibreGLMap;
  config: PluginConfig;
}
```

### Plugin Registration

```typescript
// plugins/terrain/index.ts

import { definePlugin } from '../registry/PluginRegistry';
import { TerrainPlugin } from './TerrainPlugin';
import { TerrainControls } from './TerrainControls';
import { terrainConfigSchema } from './schema';

export default definePlugin({
  id: 'terrain',
  name: '3D Terrain',
  description: 'Adds 3D terrain elevation using AWS Terrain Tiles',
  category: 'core',
  version: '1.0.0',
  dependencies: [], // No dependencies
  defaultEnabled: true,
  
  configSchema: terrainConfigSchema,
  
  initialize: async (map, config) => {
    const terrain = new TerrainPlugin(map, config);
    await terrain.enable();
    return terrain;
  },
  
  destroy: async (instance) => {
    await instance.disable();
  },
  
  controlPanel: TerrainControls,
});
```

### Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Lifecycle                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. REGISTERED     Plugin defined and registered             │
│         │                                                    │
│         ▼                                                    │
│  2. PENDING        Feature flag checked                      │
│         │                                                    │
│    ┌────┴────┐                                               │
│    │         │                                               │
│    ▼         ▼                                               │
│ DISABLED   3. LOADING   Dependencies resolved, loading       │
│    │              │                                          │
│    │              ▼                                          │
│    │       4. INITIALIZING  initialize() called              │
│    │              │                                          │
│    │              ▼                                          │
│    │       5. ACTIVE  Plugin fully operational               │
│    │              │                                          │
│    │              ▼                                          │
│    │       6. DESTROYING  destroy() called                   │
│    │              │                                          │
│    └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Layer System

### Layer Interface

```typescript
// layers/manager/types.ts

export interface LayerDefinition {
  /** Unique layer ID */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Layer type */
  type: 'geojson' | 'raster' | 'vector' | 'heatmap' | 'cluster' | 'live';
  
  /** Data source reference */
  source: DataSourceDefinition;
  
  /** MapLibre layer style */
  style: LayerStyle;
  
  /** Layer visibility */
  visible: boolean;
  
  /** Layer opacity (0-1) */
  opacity: number;
  
  /** Z-order (higher = on top) */
  zIndex: number;
  
  /** Optional popup template */
  popupTemplate?: string | ((feature: GeoJSON.Feature) => string);
  
  /** Is layer interactive (clickable) */
  interactive: boolean;
  
  /** Minimum zoom level */
  minZoom?: number;
  
  /** Maximum zoom level */
  maxZoom?: number;
}

export interface LayerStyle {
  /** MapLibre paint properties */
  paint: Record<string, unknown>;
  
  /** MapLibre layout properties */
  layout?: Record<string, unknown>;
  
  /** Optional filter expression */
  filter?: unknown[];
}
```

### Layer Manager

```typescript
// layers/manager/LayerManager.ts

export class LayerManager {
  private map: MapLibreGLMap;
  private layers: Map<string, ManagedLayer> = new Map();
  private eventBus: EventBus;
  
  constructor(map: MapLibreGLMap, eventBus: EventBus) {
    this.map = map;
    this.eventBus = eventBus;
  }
  
  /** Add a new layer */
  async addLayer(definition: LayerDefinition): Promise<void> {
    const layer = await this.createLayer(definition);
    this.layers.set(definition.id, layer);
    this.eventBus.emit('layer:added', { layerId: definition.id });
  }
  
  /** Remove a layer */
  async removeLayer(layerId: string): Promise<void> {
    const layer = this.layers.get(layerId);
    if (layer) {
      await layer.destroy();
      this.layers.delete(layerId);
      this.eventBus.emit('layer:removed', { layerId });
    }
  }
  
  /** Update layer visibility */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setVisibility(visible);
      this.eventBus.emit('layer:visibility', { layerId, visible });
    }
  }
  
  /** Update layer opacity */
  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setOpacity(opacity);
      this.eventBus.emit('layer:opacity', { layerId, opacity });
    }
  }
  
  /** Get all layers */
  getLayers(): ManagedLayer[] {
    return Array.from(this.layers.values());
  }
  
  /** Reorder layers by z-index */
  reorderLayers(orderedIds: string[]): void {
    // Implementation
  }
}
```

---

## 📡 Data Source System

### Data Source Interface

```typescript
// data-sources/types.ts

export interface DataSource<T = GeoJSON.FeatureCollection> {
  /** Unique source ID */
  id: string;
  
  /** Source type */
  type: 'static' | 'api' | 'websocket' | 'sse' | 'polling';
  
  /** Get current data */
  getData(): Promise<T>;
  
  /** Subscribe to data updates (for live sources) */
  subscribe(callback: (data: T) => void): () => void;
  
  /** Refresh data (for cacheable sources) */
  refresh(): Promise<void>;
  
  /** Clean up resources */
  destroy(): void;
  
  /** Connection status (for live sources) */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface StaticSourceConfig {
  type: 'static';
  data: GeoJSON.FeatureCollection | string; // inline or URL
}

export interface APISourceConfig {
  type: 'api';
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  transform?: (response: unknown) => GeoJSON.FeatureCollection;
  refreshInterval?: number; // ms, 0 = no auto-refresh
}

export interface WebSocketSourceConfig {
  type: 'websocket';
  url: string;
  protocols?: string[];
  heartbeatInterval?: number;
  reconnectAttempts?: number;
  transform?: (message: unknown) => GeoJSON.Feature | GeoJSON.Feature[];
}

export interface SSESourceConfig {
  type: 'sse';
  url: string;
  eventName?: string;
  transform?: (event: MessageEvent) => GeoJSON.Feature | GeoJSON.Feature[];
}

export type DataSourceConfig = 
  | StaticSourceConfig 
  | APISourceConfig 
  | WebSocketSourceConfig 
  | SSESourceConfig;
```

### Live Data Source Example

```typescript
// data-sources/realtime/WebSocketSource.ts

export class WebSocketSource implements DataSource {
  private ws: WebSocket | null = null;
  private config: WebSocketSourceConfig;
  private data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  private subscribers: Set<(data: GeoJSON.FeatureCollection) => void> = new Set();
  private reconnectAttempts = 0;
  
  status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  
  constructor(public id: string, config: WebSocketSourceConfig) {
    this.config = config;
    this.connect();
  }
  
  private connect() {
    this.status = 'connecting';
    this.ws = new WebSocket(this.config.url, this.config.protocols);
    
    this.ws.onopen = () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const features = this.config.transform 
          ? this.config.transform(raw)
          : raw;
        
        // Update or append features
        this.updateFeatures(Array.isArray(features) ? features : [features]);
        
        // Notify subscribers
        this.notifySubscribers();
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.status = 'disconnected';
      this.scheduleReconnect();
    };
    
    this.ws.onerror = () => {
      this.status = 'error';
    };
  }
  
  private scheduleReconnect() {
    const maxAttempts = this.config.reconnectAttempts ?? 5;
    if (this.reconnectAttempts < maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    }
  }
  
  private updateFeatures(newFeatures: GeoJSON.Feature[]) {
    for (const feature of newFeatures) {
      const existingIndex = this.data.features.findIndex(
        f => f.id === feature.id
      );
      
      if (existingIndex >= 0) {
        this.data.features[existingIndex] = feature;
      } else {
        this.data.features.push(feature);
      }
    }
  }
  
  private notifySubscribers() {
    for (const callback of this.subscribers) {
      callback(this.data);
    }
  }
  
  getData(): Promise<GeoJSON.FeatureCollection> {
    return Promise.resolve(this.data);
  }
  
  subscribe(callback: (data: GeoJSON.FeatureCollection) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  refresh(): Promise<void> {
    // For WebSocket, this might trigger a full data request
    return Promise.resolve();
  }
  
  destroy() {
    this.ws?.close();
    this.subscribers.clear();
  }
}
```

---

## 🎚️ Feature Flag System

### Feature Definition

```typescript
// features/FeatureRegistry.ts

export interface FeatureDefinition {
  /** Unique feature key */
  key: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description */
  description: string;
  
  /** Feature category */
  category: 'core' | 'plugin' | 'layer' | 'ui' | 'experimental';
  
  /** Default enabled state */
  defaultEnabled: boolean;
  
  /** Is this feature configurable by users, or admin-only? */
  adminOnly: boolean;
  
  /** Associated plugin ID (if this feature maps to a plugin) */
  pluginId?: string;
  
  /** Feature-specific configuration */
  config?: Record<string, unknown>;
}

// Define all features
export const FEATURES = {
  // Core features
  TERRAIN_3D: {
    key: 'terrain_3d',
    name: '3D Terrain',
    description: 'Enable 3D terrain elevation with AWS terrain tiles',
    category: 'core',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'terrain',
    config: {
      exaggeration: 1.5,
      source: 'aws',
    },
  },
  
  BASEMAP_SWITCHER: {
    key: 'basemap_switcher',
    name: 'Basemap Styles',
    description: 'Allow switching between basemap styles',
    category: 'core',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'basemaps',
  },
  
  // Tool features
  DRAW_TOOLS: {
    key: 'draw_tools',
    name: 'Drawing Tools',
    description: 'Enable drawing points, lines, and polygons',
    category: 'plugin',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'drawing',
  },
  
  GEOCODER: {
    key: 'geocoder',
    name: 'Search & Geocoding',
    description: 'Enable location search',
    category: 'plugin',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'geocoder',
  },
  
  MEASUREMENT: {
    key: 'measurement',
    name: 'Measurement Tools',
    description: 'Measure distances and areas',
    category: 'plugin',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'measurement',
  },
  
  EXPORT: {
    key: 'export',
    name: 'Export to PDF/Image',
    description: 'Export map view to PDF or image',
    category: 'plugin',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'export',
  },
  
  // Layer features
  HEATMAP_LAYERS: {
    key: 'heatmap_layers',
    name: 'Heatmap Visualization',
    description: 'Support for heatmap layers',
    category: 'layer',
    defaultEnabled: true,
    adminOnly: false,
  },
  
  CLUSTER_LAYERS: {
    key: 'cluster_layers',
    name: 'Point Clustering',
    description: 'Automatic clustering of dense point data',
    category: 'layer',
    defaultEnabled: true,
    adminOnly: false,
  },
  
  LIVE_DATA_LAYERS: {
    key: 'live_data_layers',
    name: 'Live Data Layers',
    description: 'Support for real-time data streaming',
    category: 'layer',
    defaultEnabled: true,
    adminOnly: true, // Admin needs to configure data sources
  },
  
  // UI features
  CITY_NAVIGATION: {
    key: 'city_navigation',
    name: 'City Quick Navigation',
    description: 'Quick fly-to buttons for Australian cities',
    category: 'ui',
    defaultEnabled: true,
    adminOnly: false,
    pluginId: 'navigation',
  },
  
  MOBILE_CONTROLS: {
    key: 'mobile_controls',
    name: 'Mobile-Optimized Controls',
    description: 'Touch-friendly controls for mobile devices',
    category: 'ui',
    defaultEnabled: true,
    adminOnly: false,
  },
  
  // Experimental
  OFFLINE_MODE: {
    key: 'offline_mode',
    name: 'Offline Support',
    description: 'Cache tiles for offline use',
    category: 'experimental',
    defaultEnabled: false,
    adminOnly: true,
  },
} as const;
```

### Feature Gate Component

```typescript
// features/FeatureGate.tsx

import { useFeature } from './hooks/useFeature';

interface FeatureGateProps {
  feature: keyof typeof FEATURES;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeature(feature);
  
  if (!isEnabled) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Usage:
// <FeatureGate feature="DRAW_TOOLS">
//   <DrawToolbar />
// </FeatureGate>
```

---

## 🗂️ State Management

### Zustand Stores

```typescript
// stores/mapStore.ts

import { create } from 'zustand';
import { Map as MapLibreGLMap } from 'maplibre-gl';

interface MapState {
  // Map instance
  map: MapLibreGLMap | null;
  isLoaded: boolean;
  
  // View state
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  
  // Actions
  setMap: (map: MapLibreGLMap) => void;
  setLoaded: (loaded: boolean) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  updateViewState: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  isLoaded: false,
  center: [133.7751, -25.2744], // Australia center
  zoom: 4,
  pitch: 0,
  bearing: 0,
  
  setMap: (map) => set({ map }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  
  flyTo: (center, zoom = 12) => {
    const { map } = get();
    if (map) {
      map.flyTo({ center, zoom, pitch: 60, duration: 3500 });
    }
  },
  
  updateViewState: () => {
    const { map } = get();
    if (map) {
      const center = map.getCenter();
      set({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      });
    }
  },
}));
```

```typescript
// stores/layerStore.ts

import { create } from 'zustand';
import { LayerDefinition } from '@/layers/manager/types';

interface LayerState {
  // Active layers
  layers: Map<string, LayerDefinition>;
  layerOrder: string[]; // z-order
  
  // Actions
  addLayer: (layer: LayerDefinition) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<LayerDefinition>) => void;
  setLayerOrder: (order: string[]) => void;
  toggleVisibility: (layerId: string) => void;
  setOpacity: (layerId: string, opacity: number) => void;
}

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: new Map(),
  layerOrder: [],
  
  addLayer: (layer) => {
    set((state) => {
      const newLayers = new Map(state.layers);
      newLayers.set(layer.id, layer);
      return {
        layers: newLayers,
        layerOrder: [...state.layerOrder, layer.id],
      };
    });
  },
  
  removeLayer: (layerId) => {
    set((state) => {
      const newLayers = new Map(state.layers);
      newLayers.delete(layerId);
      return {
        layers: newLayers,
        layerOrder: state.layerOrder.filter(id => id !== layerId),
      };
    });
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
  
  setLayerOrder: (order) => set({ layerOrder: order }),
  
  toggleVisibility: (layerId) => {
    const layer = get().layers.get(layerId);
    if (layer) {
      get().updateLayer(layerId, { visible: !layer.visible });
    }
  },
  
  setOpacity: (layerId, opacity) => {
    get().updateLayer(layerId, { opacity });
  },
}));
```

```typescript
// stores/mobileUIStore.ts
// INDEPENDENT from desktopUIStore - mobile UI state is completely separate

import { create } from 'zustand';

interface MobileUIState {
  // Panel state
  activePanel: 'layers' | 'search' | 'settings' | 'navigation' | null;
  
  // Modal state
  openModals: Set<string>;
  
  // Bottom sheet
  bottomSheetOpen: boolean;
  bottomSheetContent: 'layers' | 'settings' | 'cities' | null;
  
  // Control buttons
  controlsVisible: boolean;
  
  // Actions
  setActivePanel: (panel: MobileUIState['activePanel']) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleBottomSheet: (content?: MobileUIState['bottomSheetContent']) => void;
  setControlsVisible: (visible: boolean) => void;
}

export const useMobileUIStore = create<MobileUIState>((set) => ({
  activePanel: null,
  openModals: new Set(),
  bottomSheetOpen: false,
  bottomSheetContent: null,
  controlsVisible: true,
  
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  openModal: (modalId) => set((state) => ({
    openModals: new Set([...state.openModals, modalId]),
  })),
  
  closeModal: (modalId) => set((state) => {
    const newModals = new Set(state.openModals);
    newModals.delete(modalId);
    return { openModals: newModals };
  }),
  
  toggleBottomSheet: (content) => set((state) => ({
    bottomSheetOpen: content ? true : !state.bottomSheetOpen,
    bottomSheetContent: content ?? state.bottomSheetContent,
  })),
  
  setControlsVisible: (visible) => set({ controlsVisible: visible }),
}));
```

```typescript
// stores/desktopUIStore.ts
// INDEPENDENT from mobileUIStore - desktop UI state is completely separate

import { create } from 'zustand';

interface DesktopUIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  
  // Panel state
  activePanel: 'layers' | 'search' | 'settings' | 'navigation' | 'tools' | null;
  
  // Modal state
  openModals: Set<string>;
  
  // Draggable panel positions
  panelPositions: Record<string, { x: number; y: number }>;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActivePanel: (panel: DesktopUIState['activePanel']) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setPanelPosition: (panelId: string, position: { x: number; y: number }) => void;
}

export const useDesktopUIStore = create<DesktopUIState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: 320,
  activePanel: 'layers',
  openModals: new Set(),
  panelPositions: {},
  
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed,
  })),
  
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  openModal: (modalId) => set((state) => ({
    openModals: new Set([...state.openModals, modalId]),
  })),
  
  closeModal: (modalId) => set((state) => {
    const newModals = new Set(state.openModals);
    newModals.delete(modalId);
    return { openModals: newModals };
  }),
  
  setPanelPosition: (panelId, position) => set((state) => ({
    panelPositions: { ...state.panelPositions, [panelId]: position },
  })),
}));
```

---


## 🎨 UI Component Strategy

### Control Panels

The UI is divided into distinct panels that plugins can register sections to:

```typescript
// components/layout/ControlPanel.tsx

export interface ControlPanelSection {
  id: string;
  title: string;
  icon: React.ComponentType;
  component: React.ComponentType;
  order: number;
}

export function ControlPanel() {
  const sections = useControlPanelSections(); // From registry
  
  return (
    <div className="control-panel">
      <Tabs>
        {sections.map(section => (
          <TabPanel key={section.id} title={section.title} icon={section.icon}>
            <section.component />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
```

### Mobile-First Approach

```typescript
// components/layout/MapLayout.tsx

export function MapLayout() {
  const isMobile = useBreakpoint('md');
  
  return (
    <div className="map-layout">
      <MapContainer />
      
      {isMobile ? (
        <MobileControls />
      ) : (
        <DesktopControls />
      )}
      
      <ModalContainer />
      <ToastContainer />
    </div>
  );
}
```

---

## 🌐 Database Schema (Updated)

```sql
-- Feature flags (admin-controlled)
CREATE TABLE map_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  category ENUM('core', 'plugin', 'layer', 'ui', 'experimental') NOT NULL,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  admin_only BOOLEAN DEFAULT FALSE NOT NULL,
  config JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- User-specific feature preferences (overrides)
CREATE TABLE user_feature_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL,
  config JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY user_feature (user_id, feature_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved layer configurations
CREATE TABLE saved_layers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  layer_id VARCHAR(100) NOT NULL,
  layer_name VARCHAR(200) NOT NULL,
  layer_type ENUM('geojson', 'raster', 'vector', 'heatmap', 'cluster', 'live') NOT NULL,
  source_config JSON NOT NULL,
  style_config JSON NOT NULL,
  visible BOOLEAN DEFAULT TRUE,
  opacity DECIMAL(3,2) DEFAULT 1.00,
  z_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Data source configurations
CREATE TABLE data_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id VARCHAR(100) NOT NULL UNIQUE,
  source_name VARCHAR(200) NOT NULL,
  source_type ENUM('static', 'api', 'websocket', 'sse', 'polling') NOT NULL,
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  admin_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Basemap styles
CREATE TABLE basemap_styles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  style_id VARCHAR(100) NOT NULL UNIQUE,
  style_name VARCHAR(200) NOT NULL,
  description TEXT,
  style_url TEXT NOT NULL,
  thumbnail_url TEXT,
  supports_terrain BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User map settings/preferences
CREATE TABLE user_map_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  default_center JSON,  -- {lat, lng}
  default_zoom DECIMAL(4,2) DEFAULT 4.00,
  default_pitch INT DEFAULT 0,
  default_bearing INT DEFAULT 0,
  default_style_id VARCHAR(100),
  terrain_exaggeration DECIMAL(3,1) DEFAULT 1.5,
  theme ENUM('light', 'dark', 'system') DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🚀 Implementation Order

### Phase 1: Core Foundation (Week 1)
1. ✅ Create directory structure
2. ✅ Implement MapCore with minimal functionality
3. ✅ Set up Zustand stores
4. ✅ Implement Event Bus
5. ✅ Basic MapLayout with mobile/desktop detection

### Phase 2: Plugin System (Week 1-2)
1. PluginRegistry implementation
2. Plugin loader with dependency resolution
3. First plugin: Terrain (proof of concept)
4. Second plugin: Navigation (city fly-to)

### Phase 3: Layer System (Week 2)
1. LayerManager implementation
2. Base layer classes (GeoJSON, Raster)
3. Layer UI controls
4. Layer persistence

### Phase 4: Data Sources (Week 2-3)
1. DataSourceRegistry
2. Static sources (GeoJSON, file upload)
3. API source with transform
4. WebSocket source for live data

### Phase 5: Feature Flags (Week 3)
1. FeatureRegistry connected to database
2. Feature toggle UI in admin panel
3. FeatureGate component
4. User preference overrides

### Phase 6: Remaining Plugins (Week 3-4)
1. Drawing tools plugin
2. Geocoder plugin
3. Measurement plugin
4. Export plugin
5. Basemap switcher plugin

### Phase 7: Polish & Testing (Week 4)
1. Mobile optimization
2. Performance tuning
3. Error handling
4. Documentation

---

## 📝 Notes for Implementation

### File Size Guidelines
- **Max 200 lines** per component file
- **Max 300 lines** per utility/service file
- **Split larger files** into sub-modules

### Testing Strategy
- Unit tests for utilities and services
- Integration tests for plugins
- E2E tests for critical user flows

### Performance Considerations
- Lazy load plugins when enabled
- Debounce layer updates
- Use `useMemo` and `useCallback` appropriately
- Consider web workers for heavy data processing

---

**Ready to build? Let's start with Phase 1: Core Foundation.**
