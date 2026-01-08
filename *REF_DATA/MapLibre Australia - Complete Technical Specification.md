# MapLibre Australia - Complete Technical Specification

**Version:** 9a8acc0c  
**Last Updated:** January 8, 2026  
**Purpose:** Open-source alternative to Google Maps/Waze with access to advanced MapLibre GL JS features

---

## 🎯 Application Purpose

This is a **feature-rich, Australia-focused interactive mapping platform** built as an open-source alternative to Google Maps and Waze. Unlike proprietary mapping solutions, this application leverages **MapLibre GL JS** (open-source fork of Mapbox GL JS) to provide access to advanced mapping capabilities including 3D terrain, custom data layers, drawing tools, and extensive plugin ecosystem.

**Key Differentiator:** Full control over map features, data sources, and customization without vendor lock-in or API limitations.

---

## 🏗️ Technology Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Mapping Library:** MapLibre GL JS v5.0.0
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Routing:** Wouter
- **State Management:** React hooks + tRPC
- **Drag & Drop:** @dnd-kit/core (React 19 compatible)

### Backend
- **Server:** Express 4
- **API Layer:** tRPC 11 (type-safe API)
- **Database:** MySQL/TiDB via Drizzle ORM
- **Authentication:** Manus OAuth (built-in)
- **File Storage:** AWS S3 (via built-in helpers)

### MapLibre Plugins Integrated
- **@maplibre/maplibre-gl-geocoder** - Search/geocoding functionality
- **@maplibre/maplibre-gl-compare** - Side-by-side map comparison
- **maplibre-gl-export** - PDF/image export
- **@watergis/maplibre-gl-export** - Alternative export plugin

### Data Sources
- **Base Map Tiles:** OpenStreetMap via multiple style providers
- **3D Terrain:** AWS Terrain Tiles (Terrarium format)
  - Source: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
  - Encoding: Terrarium (Red * 256 + Green + Blue / 256 - 32768)
  - Coverage: Global
  - Resolution: Varies by zoom level
- **Hillshading:** Computed from AWS terrain tiles
- **Vector Tiles:** OSM data via various style providers

---

## 📊 Database Schema

### Tables

#### `users` (Built-in Auth)
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,  -- Manus OAuth ID
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  lastSignedIn TIMESTAMP DEFAULT NOW()
);
```

#### `map_settings` (User Preferences)
```sql
CREATE TABLE map_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  terrainEnabled BOOLEAN DEFAULT TRUE,
  terrainExaggeration FLOAT DEFAULT 1.5,
  hillshadeEnabled BOOLEAN DEFAULT TRUE,
  skyLayerEnabled BOOLEAN DEFAULT TRUE,
  defaultStyle VARCHAR(255) DEFAULT 'osm-bright',
  defaultZoom FLOAT DEFAULT 4,
  defaultCenter JSON,  -- {lat, lng}
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### `map_features` (Admin Feature Toggles)
```sql
CREATE TABLE map_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  featureName VARCHAR(255) NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  category VARCHAR(100),  -- 'plugin', 'layer', 'control', 'example'
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

#### `map_styles` (Available Basemap Styles)
```sql
CREATE TABLE map_styles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  styleUrl TEXT NOT NULL,
  thumbnail TEXT,
  isDefault BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

#### `custom_layers` (Future: User Data Layers)
```sql
CREATE TABLE custom_layers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layerType VARCHAR(50),  -- 'geojson', 'raster', 'vector'
  sourceUrl TEXT,
  styleConfig JSON,
  visible BOOLEAN DEFAULT TRUE,
  opacity FLOAT DEFAULT 1.0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## 🎨 UI/UX Design Rules

### Desktop Experience
- **Layout:** Clean map view with floating control buttons on the right side
- **Control Buttons:** 4 primary buttons (Cities, Settings, Draw, Rotate)
  - Size: 12x12 (w-12 h-12)
  - Position: Fixed bottom-right with 4-unit spacing (space-y-4)
  - Z-index: 50 (above map, below modals)
- **Status Indicator:** Green badge showing "AWS 3D Terrain Active" in bottom-left
- **City Navigation:** Visible panel on left side with quick-access city buttons
- **Modals:** Draggable with backdrop dimming, closeable via X button or backdrop click

### Mobile Experience (< 768px)
- **Layout:** Completely clean map view
- **Control Buttons:** Larger touch targets (14x14, w-14 h-14)
- **Status Indicator:** Hidden on mobile (md:block)
- **City Navigation:** Hidden by default, accessible via modal only
- **Modals:** Full-screen or near-full-screen, optimized for touch
- **Touch Gestures:** 
  - Pinch to zoom
  - Two-finger rotate
  - Two-finger tilt (pitch)
  - Single-finger pan

### Modal System
1. **Cities & Locations Modal**
   - Lists all Australian cities + mountainous demo locations
   - Click to fly to location with smooth zoom
   - "Reset to Australia View" button
   - Closes automatically after selection

2. **Map Settings Modal**
   - **Draggable:** Via @dnd-kit/core (grip handle at top)
   - **Tabs:** Layers, Styles, Controls, Terrain
   - **Layers Tab:** Toggle visibility + opacity sliders for each layer
   - **Styles Tab:** Switch between 5 basemap styles
   - **Controls Tab:** Toggle map controls (geocoder, draw, etc.)
   - **Terrain Tab:** Terrain exaggeration slider (0.5x - 3x)

---

## 🗺️ Map Features & Implementation

### Core Map Configuration
```typescript
Initial View:
- Center: [133.7751, -25.2744] (Australia center)
- Zoom: 4
- Pitch: 0 (can be adjusted to 60° for 3D view)
- Bearing: 0
- Min Zoom: 3
- Max Zoom: 20
```

### 3D Terrain (AWS Terrain Tiles)
**Status:** ✅ ACTIVE BY DEFAULT

**Implementation:**
```typescript
// Terrain source added to map style
{
  "terrainSource": {
    "type": "raster-dem",
    "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    "encoding": "terrarium",
    "tileSize": 256,
    "maxzoom": 15
  }
}

// Terrain applied to map
map.setTerrain({
  source: 'terrainSource',
  exaggeration: 1.5  // Adjustable via settings modal
});
```

**Key Details:**
- Terrain loads by default (no user action required)
- Exaggeration range: 0.5x to 3x (controlled via slider)
- Hillshading automatically computed from terrain data
- Sky layer added for realistic 3D atmosphere

### Basemap Styles (5 Options)
1. **OSM Bright** (Default)
   - URL: `https://tiles.openfreemap.org/styles/bright`
   - Clean, colorful style for general use

2. **OSM Liberty**
   - URL: `https://tiles.openfreemap.org/styles/liberty`
   - Classic OpenStreetMap appearance

3. **Positron**
   - URL: `https://tiles.openfreemap.org/styles/positron`
   - Light, minimal style for data overlay

4. **Dark Matter**
   - URL: `https://tiles.openfreemap.org/styles/dark`
   - Dark theme for night use or dramatic effect

5. **Custom Style** (Built-in)
   - Inline style object with OSM raster tiles
   - Includes terrain source pre-configured

### Map Layers (Toggleable)
- **Hillshade Layer:** Shading from terrain elevation
- **Sky Layer:** 3D atmosphere effect
- **Australia Outline:** GeoJSON polygon of Australia boundary
- **Heatmap:** Demo earthquake data (example)
- **Clusters:** Point clustering example
- **3D Buildings:** Extruded building footprints

### Map Controls
- **Navigation Controls:** Zoom +/-, Compass, Pitch, Rotation
- **Scale Bar:** Shows distance scale (km)
- **Geolocate:** "Find my location" button
- **Attribution:** MapLibre + OpenStreetMap credits

### Drawing Tools
**Plugin:** MapLibre GL Draw (planned, not yet fully integrated)
- Draw points, lines, polygons
- Edit and delete geometries
- Export as GeoJSON

---

## 🚀 Loading & Performance Features

### Smooth Zoom with Tile Preloading
**Status:** ✅ IMPLEMENTED

**How It Works:**
1. User clicks city in modal
2. Show loading toast: "Preparing [City]..."
3. **Preload Phase:**
   - Invisibly jump to destination coordinates
   - Wait for `map.areTilesLoaded()` to return true
   - Timeout after 3 seconds to prevent infinite wait
4. **Return Phase:**
   - Jump back to original position
   - Dismiss loading toast
   - Show success toast: "Flying to [City]"
5. **Animation Phase:**
   - Smooth flyTo animation (3.5 seconds)
   - Ease-out easing: `t * (2 - t)`
   - Pitch: 60° for 3D terrain view
   - Tiles already loaded = no loading delay!

**Code Location:** `/client/src/pages/MapPage.tsx` - `flyToCity()` function

### City Navigation Presets
**Australian Cities:**
- Sydney: [151.2093, -33.8688]
- Melbourne: [144.9631, -37.8136]
- Brisbane: [153.0251, -27.4698]
- Perth: [115.8605, -31.9505]
- Adelaide: [138.6007, -34.9285]
- Canberra: [149.1300, -35.2809]

**Mountainous Demo Locations:**
- Blue Mountains: [150.3117, -33.7320] - Dramatic terrain showcase
- Tasmania (Cradle Mountain): [145.9500, -41.6848] - Rugged peaks

---

## 📁 File Structure

```
/home/ubuntu/maplibre_mapping_app/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page
│   │   │   ├── MapPage.tsx           # Main map interface ⭐
│   │   │   └── AdminDashboard.tsx    # Admin feature toggles
│   │   ├── components/
│   │   │   ├── MapLibreMap.tsx       # Core map component
│   │   │   ├── MapSettingsModal.tsx  # Draggable settings modal ⭐
│   │   │   ├── MapPlugins.tsx        # Plugin integrations
│   │   │   ├── MapExamples.tsx       # Demo visualizations
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── App.tsx                   # Routes & layout
│   │   ├── main.tsx                  # React entry point
│   │   └── index.css                 # Global styles (Tailwind)
│   └── public/                       # Static assets
├── server/
│   ├── routers.ts                    # tRPC API endpoints ⭐
│   ├── db.ts                         # Database queries ⭐
│   └── _core/                        # Framework internals (don't edit)
├── drizzle/
│   └── schema.ts                     # Database schema ⭐
├── DOCUMENTATION.md                  # User-facing docs
├── TECHNICAL_SPECIFICATION.md        # This file ⭐
└── todo.md                           # Feature tracking

⭐ = Critical files for understanding the app
```

---

## 🔌 API Endpoints (tRPC)

### Authentication
- `auth.me` - Get current user
- `auth.logout` - Clear session

### Map Settings
- `mapSettings.get` - Get user's map preferences
- `mapSettings.update` - Update user preferences
- `mapSettings.getDefaultStyle` - Get default basemap style

### Map Features (Admin)
- `mapFeatures.list` - List all feature toggles
- `mapFeatures.update` - Enable/disable features
- `mapFeatures.getEnabled` - Get enabled features only

### Map Styles
- `mapStyles.list` - List available basemap styles
- `mapStyles.getDefault` - Get default style
- `mapStyles.setDefault` - Set default style (admin)

### Custom Layers (Future)
- `customLayers.list` - List user's custom layers
- `customLayers.create` - Upload new data layer
- `customLayers.update` - Update layer config
- `customLayers.delete` - Remove layer

---

## 🎯 Current State Summary

### ✅ Fully Implemented
1. **3D Terrain with AWS tiles** - Active by default, adjustable exaggeration
2. **Mobile-responsive UI** - Clean map on mobile, modals for all controls
3. **Smooth zoom with tile preloading** - No loading delays during navigation
4. **Draggable settings modal** - 4 tabs (Layers, Styles, Controls, Terrain)
5. **5 basemap styles** - Switchable via settings modal
6. **Australian city navigation** - 6 cities + 2 mountainous demo locations
7. **Database schema** - All tables created and migrated
8. **Admin dashboard** - Role-based access for feature management
9. **Authentication** - Manus OAuth integration

### 🚧 Partially Implemented
1. **MapLibre plugins** - Installed but not fully integrated into UI
2. **Drawing tools** - Button present but functionality incomplete
3. **Map examples** - Code exists but not all are visible/functional
4. **Custom data layers** - Database schema ready, UI not built

### ❌ Not Yet Implemented
1. **Distance/area measurement tools**
2. **Real Australian government data integration**
3. **Saved map views / bookmarking system**
4. **Shareable URLs with map state**
5. **GeoJSON/Shapefile upload interface**
6. **Route planning / directions**
7. **Real-time traffic data (Waze-like)**
8. **User-contributed data (POIs, hazards)**

---

## 🔮 Recommended Next Steps

### Priority 1: Core Mapping Features
1. **Measurement Tools**
   - Add distance measurement (click points to measure)
   - Add area measurement (draw polygon to calculate)
   - Display results in metric units (km, km²)
   - Use Turf.js for calculations (already installed)

2. **Drawing Tool Integration**
   - Fully integrate MapLibre GL Draw
   - Add draw controls to UI (point, line, polygon, delete)
   - Save drawn features to database
   - Export as GeoJSON/KML

3. **Search & Geocoding**
   - Integrate MapLibre Geocoder plugin (already installed)
   - Add search box to map UI
   - Support Australian address search
   - Fly to search results

### Priority 2: Data Integration
4. **Australian Government Data Layers**
   - Integrate data.gov.au APIs
   - Add layers: Land use, Protected areas, Demographics
   - Make toggleable in settings modal
   - Cache data for performance

5. **Custom Data Upload**
   - Build UI for GeoJSON/Shapefile upload
   - Parse and validate uploaded data
   - Store in `custom_layers` table
   - Render on map with custom styling

6. **Points of Interest (POI)**
   - Add common POI categories (restaurants, gas stations, etc.)
   - Allow users to add custom POIs
   - Search POIs by category or name

### Priority 3: Advanced Features
7. **Route Planning**
   - Integrate routing engine (OSRM or GraphHopper)
   - Add origin/destination input
   - Display route on map
   - Show turn-by-turn directions

8. **Saved Views & Bookmarks**
   - Save current map state (center, zoom, layers)
   - Create shareable URLs with map state
   - User's saved locations list
   - Quick access to bookmarks

9. **Real-Time Features (Waze-like)**
   - User-reported hazards (accidents, road closures)
   - Traffic data integration (if available)
   - Community-driven updates
   - Notification system for nearby events

### Priority 4: Polish & UX
10. **Offline Support**
    - Cache map tiles for offline use
    - Service worker for PWA functionality
    - Download regions for offline access

11. **Performance Optimization**
    - Lazy load map examples
    - Optimize tile loading strategy
    - Add loading skeletons
    - Reduce bundle size

12. **Accessibility**
    - Keyboard navigation for map controls
    - Screen reader support
    - High contrast mode
    - Focus indicators

---

## 🐛 Known Issues & Limitations

### Current Issues
1. **Draw mode button** - Present but drawing functionality not fully wired up
2. **Map examples** - Some examples in code but not all visible in UI
3. **Geocoder plugin** - Installed but not added to map UI yet

### Limitations
1. **Terrain coverage** - AWS tiles have global coverage but resolution varies
2. **Offline mode** - Not implemented, requires internet connection
3. **Mobile performance** - May be slow on older devices with 3D terrain
4. **Browser support** - Requires WebGL support (modern browsers only)

---

## 🔧 Development Workflow

### Making Changes
1. **Database changes:**
   - Edit `drizzle/schema.ts`
   - Run `pnpm db:push` to apply migrations

2. **API changes:**
   - Add procedures to `server/routers.ts`
   - Add database queries to `server/db.ts`
   - Types flow automatically to frontend

3. **UI changes:**
   - Edit components in `client/src/components/`
   - Edit pages in `client/src/pages/`
   - Tailwind classes for styling

4. **Testing:**
   - Write tests in `server/*.test.ts`
   - Run `pnpm test` to execute

### Key Commands
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm db:push      # Apply database migrations
pnpm test         # Run tests
pnpm check        # TypeScript type checking
```

---

## 📚 Additional Resources

### MapLibre Documentation
- Main docs: https://maplibre.org/maplibre-gl-js/docs/
- Examples: https://maplibre.org/maplibre-gl-js/docs/examples/
- Plugins: https://maplibre.org/maplibre-gl-js/docs/plugins/

### Data Sources
- OpenStreetMap: https://www.openstreetmap.org/
- AWS Terrain Tiles: https://registry.opendata.aws/terrain-tiles/
- Geoscience Australia: https://www.ga.gov.au/
- data.gov.au: https://data.gov.au/

### Tools & Libraries
- Turf.js (geospatial analysis): https://turfjs.org/
- Drizzle ORM: https://orm.drizzle.team/
- tRPC: https://trpc.io/
- shadcn/ui: https://ui.shadcn.com/

---

## 🎬 Quick Start for Next AI

**Context:** This is a fully functional MapLibre-based mapping application, built as an open-source alternative to Google Maps. It has working 3D terrain, mobile-responsive UI, smooth zoom with tile preloading, and a solid foundation for adding advanced features.

**Latest Checkpoint:** `9a8acc0c`

**To Continue Development:**
1. Review this document + `DOCUMENTATION.md`
2. Check `todo.md` for completed vs pending features
3. Understand the database schema in `drizzle/schema.ts`
4. Review API endpoints in `server/routers.ts`
5. Examine main map component in `client/src/pages/MapPage.tsx`

**Most Requested Next Features:**
- Distance/area measurement tools
- Australian government data integration
- Drawing tool completion
- Saved views & shareable URLs

**Critical Files to Understand:**
- `/client/src/pages/MapPage.tsx` - Main map interface
- `/client/src/components/MapSettingsModal.tsx` - Settings UI
- `/server/routers.ts` - API layer
- `/drizzle/schema.ts` - Database structure

Good luck! 🚀
