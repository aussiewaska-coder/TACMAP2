# MapLibre Australia - Comprehensive Documentation

**Author:** Manus AI  
**Version:** 1.0.0  
**Last Updated:** January 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [MapLibre Integration](#maplibre-integration)
5. [Plugin System](#plugin-system)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Admin Dashboard](#admin-dashboard)
9. [Map Examples](#map-examples)
10. [Mobile Responsiveness](#mobile-responsiveness)
11. [Customization Guide](#customization-guide)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Introduction

MapLibre Australia is a comprehensive, feature-rich interactive mapping application built with MapLibre GL JS, React 19, TypeScript, and tRPC. The application serves as both a fully functional mapping platform and an extensible skeleton for custom data integration. It is specifically optimized for Australian geographic data and includes extensive plugin support, an admin dashboard, and mobile-responsive design.

### Key Features

The application provides a robust foundation for mapping projects with the following capabilities:

**Core Mapping Features:** The platform centers on Australia's geographic center (latitude -25.2744, longitude 133.7751) with zoom levels ranging from 3 (continent view) to 20 (street level). Users can navigate through major Australian cities including Sydney, Melbourne, Brisbane, Perth, Adelaide, and Canberra with smooth fly-to animations. The map supports advanced interactions including tilt (pitch up to 85 degrees), rotation (bearing 0-360 degrees), and programmatic camera control.

**Plugin Ecosystem:** MapLibre Australia integrates multiple plugins to extend functionality. The Drawing Tools plugin enables users to create and edit points, lines, and polygons directly on the map. The Geocoder plugin provides location search functionality using OpenStreetMap's Nominatim service, focused on Australian locations. The Export Control allows users to export maps as PDF, PNG, JPEG, or SVG files in various sizes and orientations. Additional plugins include measurement tools for distance and area calculations, and map comparison for side-by-side visualization.

**Administrative Control:** The admin dashboard provides comprehensive feature management through a role-based access control system. Administrators can enable or disable plugins, manage map layers, configure basemap styles, and monitor system statistics. The dashboard organizes features into categories (plugins, layers, examples) for easy management and includes real-time status indicators.

**Visualization Examples:** The application includes multiple demonstration features showcasing MapLibre capabilities. These include 3D building extrusions, heatmap visualizations with gradient coloring, point clustering with automatic aggregation, animated markers that move along routes, choropleth maps for regional data, and GeoJSON layer rendering for custom geometries.

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend Framework | React | 19.2.1 | UI component library |
| Language | TypeScript | 5.9.3 | Type-safe development |
| Styling | Tailwind CSS | 4.1.14 | Utility-first CSS framework |
| Mapping Library | MapLibre GL JS | 5.15.0 | Core mapping engine |
| API Layer | tRPC | 11.6.0 | Type-safe API communication |
| Database ORM | Drizzle ORM | 0.44.5 | Database queries and migrations |
| Backend | Express | 4.21.2 | Server framework |
| State Management | TanStack Query | 5.90.2 | Data fetching and caching |

---

## Architecture Overview

### System Architecture

The application follows a modern full-stack architecture with clear separation of concerns. The frontend consists of React components that communicate with the backend through tRPC procedures, ensuring end-to-end type safety. The backend handles authentication, database operations, and business logic, while MapLibre GL JS manages all map rendering and interactions.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React      │  │   MapLibre   │  │   Tailwind   │     │
│  │  Components  │  │   GL JS      │  │     CSS      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                         tRPC API
                            │
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Express    │  │    tRPC      │  │   Drizzle    │     │
│  │   Server     │  │   Routers    │  │     ORM      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                         Database
                            │
┌─────────────────────────────────────────────────────────────┐
│                         Data Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Users     │  │  Map Settings│  │  Map Features│     │
│  │    Table     │  │    Table     │  │    Table     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

The project follows a modular structure that separates client-side and server-side code:

```
maplibre_mapping_app/
├── client/                      # Frontend application
│   ├── public/                  # Static assets
│   └── src/
│       ├── components/          # Reusable UI components
│       │   ├── MapLibreMap.tsx         # Core map component
│       │   ├── MapPlugins.tsx          # Plugin integration
│       │   ├── MapSettingsModal.tsx    # Settings interface
│       │   └── MapExamples.tsx         # Demonstration features
│       ├── pages/               # Page-level components
│       │   ├── Home.tsx                # Landing page
│       │   ├── MapPage.tsx             # Main map interface
│       │   └── AdminDashboard.tsx      # Admin panel
│       ├── lib/                 # Utility libraries
│       │   └── trpc.ts                 # tRPC client setup
│       └── App.tsx              # Route configuration
├── server/                      # Backend application
│   ├── db.ts                    # Database query helpers
│   ├── routers.ts               # tRPC API routes
│   └── _core/                   # Framework internals
├── drizzle/                     # Database schema and migrations
│   └── schema.ts                # Table definitions
└── shared/                      # Shared types and constants
```

### Data Flow

User interactions flow through the application in a predictable pattern. When a user interacts with the map (panning, zooming, clicking), MapLibre GL JS handles the interaction and updates the map state. React components observe these changes through event listeners and update the UI accordingly. For persistent changes (such as saving map settings), components invoke tRPC mutations that communicate with the backend. The backend validates the request, performs database operations through Drizzle ORM, and returns the result. The frontend then updates its cache and re-renders affected components.

---

## Core Components

### MapLibreMap Component

The `MapLibreMap` component serves as the foundation of the mapping application. It initializes the MapLibre GL JS map instance, configures Australia-specific settings, and provides a clean API for parent components.

**Component Interface:**

```typescript
interface MapLibreMapProps {
  center?: [number, number];        // Initial center [lng, lat]
  zoom?: number;                    // Initial zoom level
  pitch?: number;                   // Initial tilt (0-85 degrees)
  bearing?: number;                 // Initial rotation (0-360 degrees)
  style?: string | StyleSpecification;  // Map style URL or object
  minZoom?: number;                 // Minimum zoom level
  maxZoom?: number;                 // Maximum zoom level
  maxBounds?: [[number, number], [number, number]];  // Pan restrictions
  onMapLoad?: (map: MapLibreGLMap) => void;  // Load callback
  onMapMove?: (map: MapLibreGLMap) => void;  // Move callback
  className?: string;               // Additional CSS classes
  showNavigation?: boolean;         // Show navigation controls
  showScale?: boolean;              // Show scale bar
  enableTerrain?: boolean;          // Enable 3D terrain
}
```

**Default Configuration:**

The component initializes with Australia-optimized defaults. The center point is set to [133.7751, -25.2744], representing Australia's geographic center. The default zoom level is 4, which displays the entire Australian continent. Zoom levels range from 3 (showing Australia and surrounding ocean) to 20 (street-level detail). The map includes navigation controls (zoom buttons, compass, pitch control) positioned in the top-right corner, and a metric scale bar in the bottom-left corner.

**Usage Example:**

```typescript
<MapLibreMap
  center={[133.7751, -25.2744]}
  zoom={4}
  showNavigation={true}
  showScale={true}
  onMapLoad={(map) => {
    // Add custom layers, markers, or event handlers
    console.log('Map loaded:', map);
  }}
  onMapMove={(map) => {
    // Track map position changes
    const center = map.getCenter();
    const zoom = map.getZoom();
  }}
/>
```

**Key Methods:**

The component exposes the underlying MapLibre GL JS map instance through the `onMapLoad` callback, providing access to all MapLibre methods. Common operations include `map.flyTo()` for smooth camera transitions, `map.addLayer()` for adding visualization layers, `map.addSource()` for registering data sources, `map.on()` for event handling, and `map.setStyle()` for changing the basemap style.

### MapPlugins Component

The `MapPlugins` component manages the integration of third-party MapLibre plugins. It handles plugin initialization, lifecycle management, and cleanup to prevent memory leaks.

**Supported Plugins:**

**Drawing Tools (MapboxDraw):** Enables users to draw and edit geometric features on the map. Supports point, line, and polygon creation with customizable styling. Features include vertex editing, feature deletion, and programmatic access to drawn geometries. The component provides callbacks for create, update, and delete events.

**Geocoder (MaplibreGeocoder):** Integrates location search functionality using OpenStreetMap's Nominatim service. The geocoder is configured to prioritize Australian locations and displays results in a dropdown menu. When a user selects a result, the map automatically flies to that location with appropriate zoom level.

**Export Control (MaplibreExportControl):** Allows users to export the current map view as an image or PDF. Supports multiple formats (PNG, JPEG, SVG, PDF), page sizes (A3, A4, Letter), orientations (portrait, landscape), and DPI settings (96, 200, 300). The export includes all visible layers and respects the current map state.

**Component Interface:**

```typescript
interface MapPluginsProps {
  map: MapLibreGLMap;                    // Map instance
  enableDraw?: boolean;                   // Enable drawing tools
  enableGeocoder?: boolean;               // Enable search
  enableExport?: boolean;                 // Enable export
  enableMeasure?: boolean;                // Enable measurements
  onDrawCreate?: (features: any) => void; // Draw create callback
  onDrawUpdate?: (features: any) => void; // Draw update callback
  onDrawDelete?: (features: any) => void; // Draw delete callback
}
```

**Plugin Lifecycle:**

Plugins are initialized when the component mounts and the corresponding enable flag is true. The component uses React's `useEffect` hook to manage plugin lifecycle, ensuring proper cleanup when plugins are disabled or the component unmounts. Each plugin is stored in a ref to maintain the instance across re-renders.

### MapSettingsModal Component

The `MapSettingsModal` component provides a comprehensive interface for configuring map settings. It is fully draggable, allowing users to reposition it anywhere on the screen while interacting with the map.

**Modal Structure:**

The modal organizes settings into four tabs: Layers, Styles, Controls, and Plugins. Each tab provides specific configuration options relevant to its category.

**Layers Tab:** Displays all available map layers with visibility toggles and opacity sliders. Users can show or hide layers individually and adjust their transparency from 0% (invisible) to 100% (fully opaque). Changes apply immediately to the map.

**Styles Tab:** Provides a dropdown menu for selecting basemap styles. Available styles include Default (MapLibre demo tiles), Streets (vector street map), Satellite (hybrid imagery), and Terrain (topographic map). Changing the style reloads the map with the new basemap while preserving custom layers where possible.

**Controls Tab:** Offers sliders for adjusting map camera properties. The Pitch slider controls tilt from 0° (top-down view) to 85° (maximum tilt). The Bearing slider controls rotation from 0° to 360°. The Zoom slider provides fine-grained zoom control from level 3 to 20. A "Reset to Default View" button returns the map to the Australia-centered default state.

**Plugins Tab:** Lists all available plugins with enable/disable toggles. Changes to plugin states may require page refresh to take effect, as some plugins cannot be dynamically loaded or unloaded.

**Draggable Functionality:**

The modal uses the `react-draggable` library to enable repositioning. Users can click and drag the modal header (marked with a grip icon) to move it. The modal is constrained to the viewport bounds to prevent it from being dragged off-screen.

---

## MapLibre Integration

### Map Initialization

MapLibre GL JS is initialized when the `MapLibreMap` component mounts. The initialization process follows these steps:

1. **Container Setup:** A div element with a ref is created to serve as the map container. The container must have explicit dimensions (width and height) for the map to render correctly.

2. **Map Instance Creation:** A new `maplibregl.Map` instance is created with the container reference and configuration options. The configuration includes the map style URL, initial center coordinates, zoom level, pitch, bearing, and zoom constraints.

3. **Control Addition:** Navigation controls (zoom, compass, pitch) and scale control are added to the map. Controls are positioned using the `addControl` method with position parameters ('top-right', 'bottom-left', etc.).

4. **Event Listeners:** Event listeners are attached for map load, move, click, and other interactions. The 'load' event is particularly important as it signals when the map is ready for layer additions and other operations.

5. **Cleanup:** A cleanup function is returned from the useEffect hook to properly remove the map instance when the component unmounts, preventing memory leaks.

### Map Styles

MapLibre GL JS uses style specifications to define how map data is rendered. A style specification is a JSON document that describes data sources, layers, and visual properties.

**Style Structure:**

```json
{
  "version": 8,
  "sources": {
    "source-id": {
      "type": "vector",
      "url": "https://example.com/tiles.json"
    }
  },
  "layers": [
    {
      "id": "layer-id",
      "type": "fill",
      "source": "source-id",
      "paint": {
        "fill-color": "#0080ff",
        "fill-opacity": 0.5
      }
    }
  ]
}
```

**Default Style:** The application uses MapLibre's demo tiles as the default style. This style provides basic geographic features including land, water, roads, and labels. It is suitable for general-purpose mapping and serves as a neutral base for custom layers.

**Custom Styles:** Users can switch between multiple predefined styles or provide their own style URL. Custom styles must conform to the MapLibre Style Specification and can be hosted on any accessible server.

### Layer Management

Layers are the visual representation of data on the map. MapLibre supports multiple layer types, each suited for different data visualization needs.

**Layer Types:**

| Layer Type | Purpose | Use Cases |
|------------|---------|-----------|
| fill | Polygon fills | Countries, regions, buildings |
| line | Line strings | Roads, boundaries, routes |
| circle | Point circles | Markers, data points |
| symbol | Icons and text | Labels, POI markers |
| fill-extrusion | 3D polygons | 3D buildings, terrain |
| heatmap | Density visualization | Concentration maps |
| hillshade | Terrain shading | Topographic relief |
| raster | Image tiles | Satellite imagery |

**Adding Layers:**

Layers are added using the `map.addLayer()` method. Each layer requires a unique ID, a type, a source reference, and paint properties. Layers can also include layout properties (visibility, text fields, icon images) and filter expressions to show only specific features.

```typescript
map.addLayer({
  id: 'australia-outline',
  type: 'line',
  source: 'australia-data',
  paint: {
    'line-color': '#0080ff',
    'line-width': 3,
    'line-dasharray': [2, 2]
  }
});
```

**Layer Ordering:** Layers are rendered in the order they are added, with later layers appearing on top. The `map.moveLayer()` method can reorder layers after they are added.

### Data Sources

Data sources provide the geographic data that layers visualize. MapLibre supports several source types:

**GeoJSON Sources:** GeoJSON is the most common source type for custom data. It supports points, lines, polygons, and multi-geometries. GeoJSON sources can be updated dynamically by calling `source.setData()` with new data.

```typescript
map.addSource('my-data', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [151.2093, -33.8688]
        },
        properties: {
          name: 'Sydney'
        }
      }
    ]
  }
});
```

**Vector Tile Sources:** Vector tiles provide efficient delivery of large datasets. Tiles are requested as needed based on the current viewport and zoom level. Vector tiles support multiple layers within a single tileset.

**Raster Tile Sources:** Raster tiles are pre-rendered images suitable for satellite imagery, terrain visualization, or custom map styles. Each tile is a fixed-size image (typically 256x256 or 512x512 pixels).

**Raster DEM Sources:** Digital Elevation Model (DEM) sources provide terrain data for 3D visualization. They are used in conjunction with the `map.setTerrain()` method to enable 3D terrain rendering.

### Event Handling

MapLibre GL JS provides a comprehensive event system for responding to user interactions and map state changes.

**Map Events:**

| Event | Trigger | Use Case |
|-------|---------|----------|
| load | Map initialization complete | Add layers, start animations |
| move | Map position changes | Update UI with current position |
| moveend | Map movement stops | Save map state, load data |
| click | User clicks map | Show popups, select features |
| mousemove | Mouse moves over map | Highlight features, show tooltips |
| zoom | Zoom level changes | Adjust layer visibility |
| pitch | Pitch changes | Update 3D visualizations |
| rotate | Bearing changes | Update compass orientation |

**Layer Events:**

Events can be scoped to specific layers by providing the layer ID as the second parameter to `map.on()`. This is useful for feature-specific interactions.

```typescript
map.on('click', 'my-layer', (e) => {
  const features = e.features;
  if (features && features.length > 0) {
    const feature = features[0];
    console.log('Clicked feature:', feature.properties);
  }
});
```

**Event Cleanup:** Event listeners should be removed when no longer needed to prevent memory leaks. Use `map.off()` with the same event name and handler function to remove listeners.

---

## Plugin System

### Drawing Tools (MapboxDraw)

The drawing tools plugin enables users to create and edit geometric features directly on the map. It provides a complete drawing interface with mode switching, vertex editing, and feature management.

**Drawing Modes:**

The plugin supports three primary drawing modes. Point mode allows users to click the map to place point markers. Line mode enables drawing of line strings by clicking to add vertices, with double-click to finish. Polygon mode creates closed polygons by clicking to add vertices, with automatic closure when the user double-clicks or clicks the starting point.

**Editing Features:**

After drawing a feature, users can select it to enter edit mode. In edit mode, vertices can be dragged to new positions, vertices can be added by clicking on line segments, and vertices can be removed by selecting and pressing delete. The plugin provides visual feedback with highlighted vertices and edges.

**Styling:**

The plugin uses custom styles to distinguish between active and inactive features. Active features (currently being edited) are displayed in orange, while inactive features are shown in blue. Vertices are rendered as circles, with larger circles for active vertices.

**Programmatic Access:**

The plugin exposes methods for programmatic feature management. `draw.getAll()` returns all drawn features as a GeoJSON FeatureCollection. `draw.add()` adds features programmatically. `draw.delete()` removes features by ID. `draw.changeMode()` switches between drawing modes.

**Event Callbacks:**

The plugin emits events for feature lifecycle operations. The `draw.create` event fires when a new feature is completed. The `draw.update` event fires when a feature is modified. The `draw.delete` event fires when a feature is removed. These events provide the affected features as GeoJSON objects.

### Geocoder (MaplibreGeocoder)

The geocoder plugin adds location search functionality to the map. It integrates with geocoding services to convert place names and addresses into geographic coordinates.

**Geocoding Service:**

The application uses OpenStreetMap's Nominatim service for geocoding. Nominatim is a free, open-source geocoding service that does not require API keys. It provides global coverage with particularly good data for Australia.

**Search Configuration:**

The geocoder is configured to prioritize Australian results by setting the proximity parameter to Australia's geographic center. Search queries are limited to 5 results to keep the dropdown manageable. Results include the full display name with administrative hierarchy (e.g., "Sydney, New South Wales, Australia").

**User Interface:**

The geocoder appears as a search box in the top-left corner of the map. As users type, matching results appear in a dropdown menu. Clicking a result flies the map to that location with an appropriate zoom level. The search box can be collapsed to save screen space when not in use.

**Custom Geocoding:**

The geocoder supports custom geocoding functions through the `forwardGeocode` option. This allows integration with alternative geocoding services or local databases. The function must return results in the expected format with coordinates, place names, and optional bounding boxes.

### Export Control (MaplibreExportControl)

The export control enables users to save the current map view as an image or PDF. This is useful for creating printable maps, reports, or presentations.

**Export Formats:**

The plugin supports multiple output formats. PNG provides lossless compression suitable for web use and printing. JPEG offers smaller file sizes with lossy compression. SVG creates vector graphics that can be edited in design software. PDF generates printable documents with embedded map images.

**Page Configuration:**

Users can configure the export dimensions and layout. Page sizes include A3, A4, Letter, and custom dimensions. Orientation can be portrait or landscape. DPI settings control output resolution, with options for 96 (screen), 200 (draft print), and 300 (high-quality print).

**Export Options:**

The export can include a crosshair marker at the map center to indicate the focal point. A printable area overlay shows the exact region that will be exported. Attribution text is automatically included to comply with data source requirements.

**Export Process:**

When the user clicks the export button, the plugin captures the current map canvas, applies any overlays or decorations, and generates the output file. The file is automatically downloaded to the user's device with a timestamped filename.

### Comparison Control (Compare)

The comparison control enables side-by-side or swipe comparison of two map views. This is useful for comparing different time periods, data layers, or map styles.

**Comparison Modes:**

The plugin supports two comparison modes. Side-by-side mode displays two maps next to each other with synchronized camera positions. Swipe mode overlays two maps with a vertical divider that users can drag to reveal more of one map or the other.

**Synchronization:**

The two maps maintain synchronized camera positions, zoom levels, and pitch/bearing angles. When the user interacts with one map, the other automatically updates to match. This ensures the comparison remains aligned.

**Use Cases:**

Common use cases include comparing historical and current satellite imagery, showing before and after states of development projects, visualizing different data layers on the same geographic area, and comparing different map styles or color schemes.

---

## Database Schema

### Users Table

The users table stores authentication and profile information for application users. It integrates with the Manus OAuth system for authentication.

**Table Structure:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| openId | varchar(64) | NOT NULL, UNIQUE | Manus OAuth identifier |
| name | text | NULL | User's display name |
| email | varchar(320) | NULL | User's email address |
| loginMethod | varchar(64) | NULL | Authentication method |
| role | enum('user', 'admin') | NOT NULL, DEFAULT 'user' | User role |
| createdAt | timestamp | NOT NULL, DEFAULT NOW() | Account creation time |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update time |
| lastSignedIn | timestamp | NOT NULL, DEFAULT NOW() | Last login time |

**Role-Based Access Control:**

The role column determines user permissions. Users with the 'admin' role can access the admin dashboard and modify system settings. Users with the 'user' role have read-only access to public features. The application owner (identified by openId matching OWNER_OPEN_ID environment variable) is automatically assigned the admin role.

### Map Settings Table

The map_settings table stores user-specific map preferences and state. Each user has one settings record that persists their preferred map configuration.

**Table Structure:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| userId | int | NOT NULL | Foreign key to users table |
| centerLat | varchar(50) | NOT NULL, DEFAULT '-25.2744' | Map center latitude |
| centerLng | varchar(50) | NOT NULL, DEFAULT '133.7751' | Map center longitude |
| zoom | int | NOT NULL, DEFAULT 4 | Default zoom level |
| pitch | int | NOT NULL, DEFAULT 0 | Map pitch (tilt) in degrees |
| bearing | int | NOT NULL, DEFAULT 0 | Map bearing (rotation) in degrees |
| activeStyleId | varchar(100) | NOT NULL, DEFAULT 'streets' | Active map style ID |
| layerVisibility | json | NULL | Layer visibility states (JSON object) |
| layerOpacity | json | NULL | Layer opacity values (JSON object) |
| createdAt | timestamp | NOT NULL, DEFAULT NOW() | Record creation time |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update time |

**JSON Columns:**

The layerVisibility and layerOpacity columns store JSON objects mapping layer IDs to their states. For example:

```json
{
  "layerVisibility": {
    "australia-outline": true,
    "heatmap-layer": false,
    "clusters": true
  },
  "layerOpacity": {
    "australia-outline": 100,
    "heatmap-layer": 70,
    "clusters": 85
  }
}
```

### Map Features Table

The map_features table stores admin-controlled feature toggles. Administrators can enable or disable features globally, affecting all users.

**Table Structure:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| featureKey | varchar(100) | NOT NULL, UNIQUE | Feature identifier |
| featureName | varchar(200) | NOT NULL | Human-readable name |
| description | text | NULL | Feature description |
| enabled | boolean | NOT NULL, DEFAULT true | Whether feature is enabled |
| category | enum('plugin', 'control', 'layer', 'example') | NOT NULL | Feature category |
| config | json | NULL | Feature configuration (JSON object) |
| createdAt | timestamp | NOT NULL, DEFAULT NOW() | Record creation time |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update time |

**Feature Categories:**

Features are organized into categories for easier management. The 'plugin' category includes third-party plugins like Draw, Geocoder, and Export. The 'control' category includes UI controls like navigation and scale. The 'layer' category includes visualization layers like 3D buildings and terrain. The 'example' category includes demonstration features like heatmaps and clusters.

### Map Styles Table

The map_styles table stores available basemap style configurations. Administrators can add, modify, or disable styles.

**Table Structure:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| styleId | varchar(100) | NOT NULL, UNIQUE | Style identifier |
| styleName | varchar(200) | NOT NULL | Human-readable name |
| description | text | NULL | Style description |
| styleUrl | text | NOT NULL | MapLibre style JSON URL |
| thumbnailUrl | text | NULL | Preview thumbnail URL |
| enabled | boolean | NOT NULL, DEFAULT true | Whether style is available |
| sortOrder | int | NOT NULL, DEFAULT 0 | Display order |
| createdAt | timestamp | NOT NULL, DEFAULT NOW() | Record creation time |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update time |

### Custom Layers Table

The custom_layers table provides a placeholder for user-defined data layers. This table is designed for future extension with custom data sources.

**Table Structure:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PRIMARY KEY, AUTO_INCREMENT | Surrogate primary key |
| userId | int | NOT NULL | Foreign key to users table |
| layerId | varchar(100) | NOT NULL | Layer identifier |
| layerName | varchar(200) | NOT NULL | Human-readable name |
| description | text | NULL | Layer description |
| layerType | enum('geojson', 'raster', 'vector', 'heatmap', 'cluster') | NOT NULL | Layer type |
| dataSource | text | NULL | Data source URL or configuration |
| styleConfig | json | NULL | Layer styling configuration (JSON object) |
| visible | boolean | NOT NULL, DEFAULT true | Whether layer is visible by default |
| opacity | int | NOT NULL, DEFAULT 100 | Layer opacity (0-100) |
| zIndex | int | NOT NULL, DEFAULT 0 | Display order (z-index) |
| createdAt | timestamp | NOT NULL, DEFAULT NOW() | Record creation time |
| updatedAt | timestamp | NOT NULL, DEFAULT NOW() ON UPDATE NOW() | Last update time |

---

## API Reference

### Authentication Endpoints

**`auth.me`** (Query)
- **Description:** Returns the currently authenticated user's information
- **Authentication:** Public (returns null if not authenticated)
- **Returns:** User object or null
- **Example:**
```typescript
const { data: user } = trpc.auth.me.useQuery();
if (user) {
  console.log('Logged in as:', user.name);
}
```

**`auth.logout`** (Mutation)
- **Description:** Logs out the current user by clearing the session cookie
- **Authentication:** Public
- **Returns:** `{ success: true }`
- **Example:**
```typescript
const logoutMutation = trpc.auth.logout.useMutation();
await logoutMutation.mutateAsync();
```

### Map Settings Endpoints

**`mapSettings.get`** (Query)
- **Description:** Retrieves the current user's map settings
- **Authentication:** Protected (requires login)
- **Returns:** MapSettings object with default values if no settings exist
- **Example:**
```typescript
const { data: settings } = trpc.mapSettings.get.useQuery();
console.log('Center:', settings.centerLat, settings.centerLng);
console.log('Zoom:', settings.zoom);
```

**`mapSettings.update`** (Mutation)
- **Description:** Updates the current user's map settings
- **Authentication:** Protected (requires login)
- **Input:**
```typescript
{
  centerLat?: string;
  centerLng?: string;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  activeStyleId?: string;
  layerVisibility?: Record<string, boolean>;
  layerOpacity?: Record<string, number>;
}
```
- **Returns:** `{ success: true }`
- **Example:**
```typescript
const updateMutation = trpc.mapSettings.update.useMutation();
await updateMutation.mutateAsync({
  zoom: 8,
  pitch: 45,
  layerVisibility: { 'heatmap-layer': true }
});
```

### Map Features Endpoints

**`mapFeatures.list`** (Query)
- **Description:** Returns all map features with their enabled states
- **Authentication:** Public
- **Returns:** Array of MapFeature objects
- **Example:**
```typescript
const { data: features } = trpc.mapFeatures.list.useQuery();
const enabledPlugins = features.filter(f => f.enabled && f.category === 'plugin');
```

**`mapFeatures.getByKey`** (Query)
- **Description:** Retrieves a specific feature by its key
- **Authentication:** Public
- **Input:** `{ featureKey: string }`
- **Returns:** MapFeature object or undefined
- **Example:**
```typescript
const { data: feature } = trpc.mapFeatures.getByKey.useQuery({
  featureKey: 'draw'
});
```

**`mapFeatures.upsert`** (Mutation)
- **Description:** Creates or updates a map feature
- **Authentication:** Admin only
- **Input:**
```typescript
{
  featureKey: string;
  featureName: string;
  description?: string;
  enabled: boolean;
  category: 'plugin' | 'control' | 'layer' | 'example';
  config?: Record<string, unknown>;
}
```
- **Returns:** `{ success: true }`

**`mapFeatures.toggleEnabled`** (Mutation)
- **Description:** Toggles a feature's enabled state
- **Authentication:** Admin only
- **Input:** `{ featureKey: string, enabled: boolean }`
- **Returns:** `{ success: true }`
- **Example:**
```typescript
const toggleMutation = trpc.mapFeatures.toggleEnabled.useMutation();
await toggleMutation.mutateAsync({
  featureKey: 'draw',
  enabled: false
});
```

### Map Styles Endpoints

**`mapStyles.list`** (Query)
- **Description:** Returns all available map styles
- **Authentication:** Public
- **Returns:** Array of MapStyle objects
- **Example:**
```typescript
const { data: styles } = trpc.mapStyles.list.useQuery();
const enabledStyles = styles.filter(s => s.enabled);
```

**`mapStyles.getById`** (Query)
- **Description:** Retrieves a specific style by its ID
- **Authentication:** Public
- **Input:** `{ styleId: string }`
- **Returns:** MapStyle object or undefined

**`mapStyles.upsert`** (Mutation)
- **Description:** Creates or updates a map style
- **Authentication:** Admin only
- **Input:**
```typescript
{
  styleId: string;
  styleName: string;
  description?: string;
  styleUrl: string;
  thumbnailUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
}
```
- **Returns:** `{ success: true }`

### Custom Layers Endpoints

**`customLayers.list`** (Query)
- **Description:** Returns all custom layers for the current user
- **Authentication:** Protected (requires login)
- **Returns:** Array of CustomLayer objects

**`customLayers.upsert`** (Mutation)
- **Description:** Creates or updates a custom layer
- **Authentication:** Protected (requires login)
- **Input:**
```typescript
{
  id?: number;
  layerId: string;
  layerName: string;
  description?: string;
  layerType: 'geojson' | 'raster' | 'vector' | 'heatmap' | 'cluster';
  dataSource?: string;
  styleConfig?: Record<string, unknown>;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}
```
- **Returns:** `{ success: true }`

**`customLayers.delete`** (Mutation)
- **Description:** Deletes a custom layer
- **Authentication:** Protected (requires login)
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Admin Dashboard

### Access Control

The admin dashboard is restricted to users with the 'admin' role. When a non-admin user attempts to access the dashboard, they are redirected to the home page with an error message. The application owner (identified by the OWNER_OPEN_ID environment variable) is automatically assigned the admin role upon first login.

### Dashboard Layout

The admin dashboard provides a comprehensive interface for managing map features and monitoring system status. The layout consists of a header with navigation links, statistics cards showing key metrics, and a tabbed interface for feature management.

**Statistics Cards:**

The dashboard displays four key metrics at the top of the page. The Total Features card shows the count of all features in the system. The Active Plugins card displays how many plugins are currently enabled. The Map Styles card shows the number of available basemap styles. The Active Layers card indicates how many visualization layers are enabled.

**Feature Management Tabs:**

Features are organized into three tabs for easier management. The Plugins tab lists all plugin features (Draw, Geocoder, Export, etc.) with toggle switches to enable or disable them. The Layers tab shows visualization layers (3D Buildings, Terrain, etc.) with similar controls. The Examples tab displays demonstration features (Heatmap, Clusters, etc.) that can be toggled independently.

### Feature Toggle System

Each feature is displayed as a card with the feature name, description, status badge, and toggle switch. The status badge shows "Active" in green for enabled features and "Inactive" in gray for disabled features. Clicking the toggle switch immediately updates the feature state in the database and refreshes the feature list.

**Toggle Behavior:**

When a feature is toggled, the system performs several actions. First, it validates that the user has admin permissions. Then, it updates the feature's enabled state in the database. Finally, it refetches the feature list to ensure the UI reflects the current state. A toast notification confirms the successful update or displays an error message if the operation fails.

**Feature Categories:**

Features are categorized to help administrators understand their purpose and impact. Plugin features affect core functionality and may require page refresh to take effect. Layer features control visualization options and update immediately. Example features are demonstration capabilities that can be enabled for user education or disabled to simplify the interface.

### System Information

The dashboard includes a System Information panel that displays technical details about the application. This includes the MapLibre GL JS version, database connection status, default map center coordinates, and zoom level range. This information is useful for troubleshooting and verifying system configuration.

---

## Map Examples

### 3D Buildings

The 3D buildings example demonstrates fill-extrusion layers that render polygons with height. This creates a three-dimensional visualization of building footprints.

**Implementation:**

The 3D buildings layer uses the fill-extrusion type with height data from the building source layer. The extrusion height is interpolated based on zoom level, appearing flat at zoom 15 and reaching full height at zoom 15.05. This creates a smooth transition as users zoom in. The base height (minimum elevation) is similarly interpolated to create accurate building representations.

**Visual Properties:**

Buildings are rendered in a neutral gray color with 60% opacity, allowing underlying map features to remain partially visible. The extrusion creates realistic shadows and depth perception, especially when the map is tilted (pitched) to view buildings from an angle.

**Use Cases:**

3D building visualization is useful for urban planning, real estate applications, architectural visualization, and navigation in dense city environments. It provides spatial context that helps users understand building density and urban layout.

### Heatmap Layer

The heatmap example visualizes point density using color gradients. It is particularly effective for showing concentration patterns in large datasets.

**Data Generation:**

The example generates sample data by creating random points around major Australian cities. For each city (Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin), 50 points are generated within a 2-degree radius. Each point has an intensity value between 0 and 1.

**Color Gradient:**

The heatmap uses a color gradient that transitions from transparent blue (low density) through light blue and yellow to red (high density). The gradient is defined using MapLibre's interpolate expression with heatmap-density as the input. This creates a smooth color transition that clearly shows concentration patterns.

**Zoom Behavior:**

The heatmap intensity increases with zoom level, making patterns more pronounced at closer zoom levels. The heatmap radius also increases with zoom, ensuring that individual points remain visible. At zoom level 15 and above, the heatmap fades out to reveal individual points.

**Applications:**

Heatmaps are ideal for visualizing population density, crime statistics, sales data, disease outbreaks, and any other point-based data where concentration patterns are important.

### Cluster Layer

The cluster example demonstrates automatic point aggregation at different zoom levels. This prevents visual clutter when displaying large numbers of points.

**Clustering Algorithm:**

The clustering algorithm groups nearby points into clusters based on the current zoom level. The cluster radius (50 pixels) determines how close points must be to form a cluster. As users zoom in, clusters break apart into smaller clusters or individual points. The maximum zoom for clustering is set to 14, ensuring that all points are visible at street level.

**Visual Design:**

Clusters are rendered as circles with colors based on point count. Small clusters (fewer than 10 points) are light blue. Medium clusters (10-29 points) are yellow. Large clusters (30+ points) are pink. The circle radius also increases with point count, providing a visual indication of cluster size. Each cluster displays its point count as a text label.

**Interaction:**

Clicking a cluster zooms the map to the cluster's expansion zoom level, which is the zoom at which the cluster breaks apart. This provides a natural way for users to explore clustered data by progressively zooming in.

**Performance:**

Clustering significantly improves performance when displaying thousands or millions of points. Instead of rendering every point at low zoom levels, the map only renders a manageable number of clusters. This reduces draw calls and improves frame rates.

### Animated Marker

The animated marker example shows how to create smooth animations along a predefined route. This is useful for visualizing movement, routes, or temporal data.

**Route Definition:**

The example defines a route through major Australian cities: Sydney → Canberra → Melbourne → Adelaide → Perth. The route is represented as a LineString geometry with coordinates for each city. The route line is displayed on the map with a dashed style.

**Animation Logic:**

The animation uses requestAnimationFrame to create smooth 60fps movement. The marker's position is calculated by interpolating between route points based on the current animation frame. The animation is divided into steps, with each segment of the route taking a fixed number of steps to complete. When the marker reaches the end of the route, it loops back to the beginning.

**Marker Styling:**

The animated marker is rendered as a red circle with a white stroke. The circle is larger than static markers to make it more visible during animation. The marker's position is updated by modifying the GeoJSON source data, which triggers a map re-render.

**Extensions:**

This technique can be extended to animate multiple markers simultaneously, vary animation speed based on data attributes, trigger events at waypoints, or synchronize animation with external data sources (e.g., real-time vehicle tracking).

### Choropleth Map

The choropleth example demonstrates data-driven styling where regions are colored based on data values. This is a common technique for visualizing statistical data across geographic areas.

**Data Structure:**

The example uses simplified GeoJSON polygons representing Australian states. Each feature includes a properties object with the state name and a numeric value. In a real application, these values would represent statistical data such as population, GDP, or election results.

**Color Mapping:**

The fill color is determined by interpolating the feature's value property. The interpolation uses a linear scale from light yellow (low values) through green and blue to dark blue (high values). This creates a clear visual distinction between regions with different values.

**Border Styling:**

State borders are rendered as a separate layer with black lines. This ensures that borders remain visible regardless of the fill color and helps users distinguish between adjacent regions with similar values.

**Legend Integration:**

In a production application, a choropleth map should include a legend showing the color scale and value ranges. The legend helps users interpret the visualization and understand what the colors represent.

---

## Mobile Responsiveness

### Touch Interactions

MapLibre GL JS includes built-in support for touch interactions on mobile devices. These interactions are automatically enabled and require no additional configuration.

**Supported Gestures:**

Single-finger drag pans the map in any direction. Two-finger pinch zooms the map in or out. Two-finger rotation rotates the map around its center point. Two-finger tilt (vertical drag) adjusts the map pitch. Single tap selects features or triggers click events. Double tap zooms in one level. Two-finger tap zooms out one level.

**Gesture Conflicts:**

The application handles potential conflicts between map gestures and browser gestures. For example, two-finger drag is used for map tilt rather than page scroll. The map container includes touch-action CSS properties to prevent default browser behaviors that would interfere with map interaction.

### Responsive Layout

The application uses responsive design principles to adapt to different screen sizes. Tailwind CSS utility classes provide breakpoint-based styling that adjusts layouts for mobile, tablet, and desktop devices.

**Breakpoint Strategy:**

The application uses Tailwind's default breakpoints: sm (640px), md (768px), lg (1024px), and xl (1280px). Most layouts are designed mobile-first, with enhancements added at larger breakpoints. For example, the city navigation panel is full-width on mobile but constrained to a sidebar on desktop.

**Component Adaptations:**

The map settings modal adjusts its width and position on mobile devices. On screens smaller than 640px, the modal occupies 90% of the viewport width and is centered. The modal content is scrollable to accommodate small screen heights. Control buttons are sized appropriately for touch targets (minimum 44x44 pixels).

**Navigation Adjustments:**

The city navigation panel collapses into a scrollable list on mobile devices. The panel includes a maximum height constraint with overflow scrolling to prevent it from covering the entire map. Button text is abbreviated on small screens to save space while remaining readable.

### Performance Optimization

Mobile devices have less processing power and memory than desktop computers, requiring careful optimization to maintain smooth performance.

**Rendering Optimization:**

The application limits the number of features rendered at low zoom levels by using clustering and simplification. Complex geometries are simplified at distant zoom levels to reduce vertex count. Tile caching reduces network requests and improves load times.

**Memory Management:**

The application removes event listeners and cleans up resources when components unmount. Large datasets are loaded progressively rather than all at once. Unused map sources and layers are removed to free memory.

**Network Optimization:**

Vector tiles are preferred over raster tiles because they are smaller and can be styled client-side. Tile requests are prioritized based on viewport visibility. Failed tile requests are retried with exponential backoff to handle poor network conditions.

---

## Customization Guide

### Adding Custom Data Layers

The application is designed to be extended with custom data layers. The custom_layers table provides a database structure for storing layer configurations, and the MapLibre API makes it straightforward to add new visualizations.

**Step 1: Prepare Your Data**

Convert your data to GeoJSON format. GeoJSON is a standard format for encoding geographic data structures. It supports points, lines, polygons, and collections of these geometries. Each feature can include properties (attributes) that can be used for styling and filtering.

**Step 2: Add Data Source**

Add your GeoJSON data as a map source using the `map.addSource()` method. The source can reference a URL (for large datasets) or include the data inline (for small datasets).

```typescript
map.addSource('my-custom-data', {
  type: 'geojson',
  data: '/path/to/data.geojson'
});
```

**Step 3: Add Visualization Layer**

Create a layer that visualizes the source data. Choose an appropriate layer type based on your geometry (fill for polygons, line for lines, circle for points).

```typescript
map.addLayer({
  id: 'my-custom-layer',
  type: 'fill',
  source: 'my-custom-data',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.5
  }
});
```

**Step 4: Add Interactivity**

Add event listeners to enable user interaction with your layer. Common interactions include showing popups on click, highlighting features on hover, and filtering based on user input.

```typescript
map.on('click', 'my-custom-layer', (e) => {
  const feature = e.features[0];
  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`<h3>${feature.properties.name}</h3>`)
    .addTo(map);
});
```

**Step 5: Register in Database**

For persistent custom layers, add a record to the custom_layers table using the tRPC API. This allows users to save, load, and manage their custom layers.

### Styling Custom Layers

MapLibre provides extensive styling capabilities through paint and layout properties. These properties control how features are rendered on the map.

**Data-Driven Styling:**

Use expressions to style features based on their properties. For example, color a choropleth map based on population density:

```typescript
'fill-color': [
  'interpolate',
  ['linear'],
  ['get', 'population_density'],
  0, '#ffffcc',
  100, '#a1dab4',
  500, '#41b6c4',
  1000, '#225ea8'
]
```

**Zoom-Based Styling:**

Adjust styling based on zoom level to create appropriate visualizations at different scales:

```typescript
'circle-radius': [
  'interpolate',
  ['linear'],
  ['zoom'],
  5, 2,
  10, 5,
  15, 10
]
```

**Feature State:**

Use feature state to create interactive styling that responds to user actions without modifying the underlying data:

```typescript
map.setFeatureState(
  { source: 'my-source', id: featureId },
  { hover: true }
);

'fill-color': [
  'case',
  ['boolean', ['feature-state', 'hover'], false],
  '#ff0000',
  '#0080ff'
]
```

### Integrating Additional Plugins

The application's plugin system can be extended with additional MapLibre plugins from the ecosystem.

**Plugin Installation:**

Install the plugin package using npm or pnpm:

```bash
pnpm add @maplibre/maplibre-gl-plugin-name
```

**Plugin Integration:**

Import the plugin in the MapPlugins component and add initialization logic:

```typescript
import PluginName from '@maplibre/maplibre-gl-plugin-name';
import '@maplibre/maplibre-gl-plugin-name/dist/plugin.css';

// In useEffect
const plugin = new PluginName(options);
map.addControl(plugin, 'top-right');
```

**Plugin Configuration:**

Add plugin configuration options to the map_features table to allow administrators to control plugin behavior. Store configuration as JSON in the config column.

### Creating Custom Map Styles

Custom map styles allow you to completely control the visual appearance of the map, from colors and fonts to which features are displayed.

**Style Structure:**

A MapLibre style is a JSON document that conforms to the MapLibre Style Specification. It includes metadata, data sources, layers, and optional properties like sprite sheets and glyphs.

**Style Editing Tools:**

Use visual style editors like Maputnik (https://maputnik.github.io/) to create and edit styles without writing JSON manually. These tools provide a graphical interface for adjusting colors, fonts, and layer properties.

**Hosting Styles:**

Styles can be hosted on any web server as JSON files. The style URL is provided to MapLibre when initializing the map or changing styles. For production use, consider using a CDN to improve load times.

**Adding Styles to the Application:**

Add new styles to the map_styles table using the admin dashboard or tRPC API. Include a descriptive name, the style URL, and optionally a thumbnail image for preview.

---

## Deployment

### Environment Configuration

The application requires several environment variables to be configured before deployment. These variables control database connections, authentication, and external service integrations.

**Required Variables:**

`DATABASE_URL` specifies the MySQL/TiDB connection string in the format `mysql://user:password@host:port/database`. `JWT_SECRET` is a secure random string used for signing session cookies. `VITE_APP_ID` is the Manus OAuth application ID. `OAUTH_SERVER_URL` is the Manus OAuth backend base URL. `VITE_OAUTH_PORTAL_URL` is the Manus login portal URL for frontend redirects.

**Optional Variables:**

`VITE_APP_TITLE` sets the application title displayed in the browser. `VITE_APP_LOGO` sets the application logo URL. Additional variables may be required for specific features or integrations.

### Build Process

The application uses a two-stage build process: frontend compilation with Vite and backend compilation with esbuild.

**Frontend Build:**

Run `pnpm build` to compile the React application. Vite processes TypeScript files, bundles dependencies, optimizes assets, and generates static files in the `dist/client` directory. The build includes code splitting for optimal loading performance.

**Backend Build:**

The backend is compiled using esbuild, which bundles the Express server and tRPC routers into a single JavaScript file. The compiled server is output to `dist/index.js` and includes all dependencies except those marked as external.

**Database Migrations:**

Before deploying, run `pnpm db:push` to apply database schema changes. This generates SQL migration files and executes them against the database. Ensure the database is accessible from the build environment.

### Production Deployment

The application can be deployed to any Node.js hosting platform that supports Express applications.

**Deployment Steps:**

1. Clone the repository to the deployment server
2. Install dependencies with `pnpm install`
3. Configure environment variables
4. Run database migrations with `pnpm db:push`
5. Build the application with `pnpm build`
6. Start the production server with `pnpm start`

**Process Management:**

Use a process manager like PM2 to keep the application running and automatically restart it if it crashes. PM2 also provides logging, monitoring, and zero-downtime deployments.

```bash
pm2 start dist/index.js --name maplibre-app
pm2 save
pm2 startup
```

**Reverse Proxy:**

Configure a reverse proxy (nginx or Apache) to forward requests to the Node.js application. The proxy should handle SSL termination, static file serving, and request routing.

**Manus Platform Deployment:**

The application is designed to work seamlessly with the Manus platform's built-in hosting. After creating a checkpoint in the development environment, click the Publish button in the Management UI to deploy. The platform handles environment configuration, database provisioning, and SSL certificates automatically.

---

## Troubleshooting

### Common Issues

**Map Not Rendering:**

If the map container appears blank, check that the container has explicit dimensions (width and height). MapLibre requires a container with defined dimensions to initialize properly. Verify that the map style URL is accessible and returns valid JSON. Check the browser console for error messages.

**Plugins Not Loading:**

If plugins fail to initialize, ensure that the plugin libraries are properly installed and imported. Check that the map instance is fully loaded before adding plugins (use the 'load' event). Verify that plugin CSS files are imported to ensure proper styling.

**Database Connection Errors:**

If the application cannot connect to the database, verify that the DATABASE_URL environment variable is correctly formatted. Ensure that the database server is accessible from the application server. Check that the database user has appropriate permissions. Review the server logs for detailed error messages.

**Authentication Issues:**

If users cannot log in, verify that the OAuth configuration variables (VITE_APP_ID, OAUTH_SERVER_URL, VITE_OAUTH_PORTAL_URL) are correctly set. Ensure that the JWT_SECRET is configured and consistent across deployments. Check that the session cookie domain and path are appropriate for your deployment environment.

**Performance Problems:**

If the map is slow or unresponsive, reduce the number of features rendered at low zoom levels using clustering or simplification. Optimize layer styling to avoid expensive expressions. Use vector tiles instead of GeoJSON for large datasets. Enable browser hardware acceleration if available.

### Debug Mode

Enable debug mode to view detailed information about map rendering and performance.

**Enabling Debug:**

Add the `showCollisionBoxes` and `showTileBoundaries` options when initializing the map:

```typescript
const map = new maplibregl.Map({
  container: mapContainer.current,
  style: style,
  center: center,
  zoom: zoom,
  showCollisionBoxes: true,
  showTileBoundaries: true
});
```

**Debug Information:**

With debug mode enabled, the map displays tile boundaries (red lines), collision boxes for symbols (blue boxes), and other diagnostic information. This helps identify rendering issues, tile loading problems, and symbol placement conflicts.

### Browser Compatibility

MapLibre GL JS requires a browser with WebGL support. Most modern browsers (Chrome, Firefox, Safari, Edge) support WebGL by default.

**Checking WebGL Support:**

The application includes a WebGL detection check that displays an error message if WebGL is not available. Users can verify WebGL support by visiting https://get.webgl.org/.

**Mobile Browser Considerations:**

Mobile browsers may have limited WebGL capabilities compared to desktop browsers. Some older or low-end devices may struggle with complex visualizations. Test the application on target devices to ensure acceptable performance.

**Fallback Options:**

For browsers without WebGL support, consider providing a fallback to a static map image or a simpler mapping library that uses Canvas 2D rendering instead of WebGL.

---

## Conclusion

MapLibre Australia provides a comprehensive foundation for building interactive mapping applications. The combination of MapLibre GL JS, React, TypeScript, and tRPC creates a type-safe, performant, and maintainable codebase. The application's modular architecture makes it easy to extend with custom data layers, plugins, and visualizations.

The admin dashboard and feature toggle system enable fine-grained control over application functionality without code changes. The mobile-responsive design ensures a consistent user experience across devices. The extensive documentation and code examples provide guidance for customization and extension.

Whether you are building a data visualization platform, a location-based service, or a geographic information system, MapLibre Australia offers the tools and structure needed to create professional mapping applications. The Australia-focused configuration provides an optimized starting point for projects targeting Australian users and data, while the flexible architecture supports global applications with minimal modifications.

For questions, issues, or contributions, please refer to the project repository or contact the development team. We welcome feedback and suggestions for improving the application and documentation.

---

**Document Version:** 1.0.0  
**Last Updated:** January 2026  
**Author:** Manus AI
