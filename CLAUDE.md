# TACMAP2 - Claude Code Context

> **CURRENT FOCUS: MapTiler/MapLibre ONLY**
> All development uses MapTiler as the sole map provider. Ignore Mapbox code paths.

## Critical Rules

1. **MapTiler Only** - Use MapLibre GL JS with MapTiler tiles exclusively
2. **No Mapbox** - Do not add, modify, or reference Mapbox code
3. **Root Deployment** - App deploys from ROOT directory, not subdirectories
4. **Safe Map Access** - Never access map instance before `isLoaded` is true
5. **Terrain Constraint** - When terrain enabled, prevent vertical shift during pan

## Project Structure

```
/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── core/              # Map initialization
│       ├── components/recon/  # RECONMAP UI components
│       ├── hooks/             # Alert & map hooks
│       ├── layers/            # Map layer components
│       ├── stores/            # Zustand state management
│       ├── pages/             # Route pages
│       ├── types/             # TypeScript definitions
│       └── utils/             # Utilities (mapUtils, etc.)
├── server/                    # Express + tRPC backend
│   ├── _core/                 # Server setup, middleware
│   ├── routers.ts             # tRPC route definitions
│   └── db.ts                  # Drizzle ORM queries
├── api/                       # Vercel serverless functions
│   └── emergency/             # Emergency alert endpoints
├── drizzle/                   # PostgreSQL schema
├── shared/                    # Shared types/utilities
├── vite.config.ts             # Vite config (root: /client/)
└── vercel.json                # Deployment config
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Map Engine | MapLibre GL JS + MapTiler tiles |
| Frontend | React 19, Vite 7, TypeScript 5.9 |
| State | Zustand (persisted stores) |
| API Client | tRPC 11.6 + React Query 5.90 |
| Styling | Tailwind CSS 4 + Radix UI |
| Routing | Wouter |
| Backend | Express, tRPC, Drizzle ORM |
| Database | Neon PostgreSQL |
| Deployment | Vercel |

## Environment Variables

```bash
# MapTiler (REQUIRED)
VITE_MAPTILER_API_KEY=your-maptiler-key
VITE_MAPTILER_STYLE=019ba5e4-9d97-74d1-bac9-f2e25b888881

# Provider Lock (set to maptiler)
VITE_RECONMAP_DEFAULT_PROVIDER=maptiler

# Database
DATABASE_URL=postgresql://...

# External APIs
WAZE_API_KEY=your-waze-key
```

## Core Architecture

### Map Engine (`/client/src/core/`)

| File | Purpose |
|------|---------|
| `MapCore.tsx` | MapLibre initialization, terrain, gov layers |
| `MapContainer.tsx` | Responsive map container |
| `constants.ts` | MAP_CONFIG, AU cities, breakpoints |

**MapCore Responsibilities:**
- Initialize MapLibre GL with MapTiler style URL
- Add 3D terrain (AWS Terrarium tiles)
- Add government data layers (land use, geology, bushfire)
- Sync map instance to Zustand store
- Handle pitch/bearing locks when terrain enabled

### State Management (`/client/src/stores/`)

| Store | Purpose |
|-------|---------|
| `mapProviderStore.ts` | Provider selection (locked to `maptiler`), style ID |
| `mapStore.ts` | Map instance, view state, terrain settings, loading flags |

**Pattern:** Zustand with `subscribeWithSelector` for fine-grained updates.

### RECONMAP UI (`/client/src/components/recon/`)

| Component | Purpose |
|-----------|---------|
| `ReconLayout.tsx` | Map + overlay layout container |
| `AlertsSidebar.tsx` | Tactical alerts command panel (draggable, collapsible) |
| `MapProviderSwitcher.tsx` | Provider toggle (locked to MapTiler) |

### Alert Hooks (`/client/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useUnifiedAlerts.ts` | Renders alert layers (points, clusters, polygons) |
| `useHeatmap.ts` | Police heatmap overlay with color schemes |
| `useEmergencyAlerts.ts` | Fetches emergency alerts via React Query |
| `useMapEvent.ts` | Safe map event binding |

### Pages (`/client/src/pages/`)

| Page | Route | Purpose |
|------|-------|---------|
| `Home.tsx` | `/` | Landing screen (provider selection) |
| `MapPageNew.tsx` | `/map` | Main map page entry point |

## Alert Systems

### Emergency Alerts
- **Endpoint:** `GET /api/emergency/alerts`
- **Format:** GeoJSON FeatureCollection (points + polygons)
- **Storage:** None (live aggregation from registry sources)
- **Refresh:** 30-second polling
- **Sources:** CAP, RSS, GeoJSON feeds from AU emergency services

### Police Alerts (Waze)
- **Fetch:** `trpc.waze.getAlertsAndJams` mutation
- **Storage:** PostgreSQL `police_reports` table (deduped by alertId)
- **Refresh:** 60-second polling
- **Heatmap:** `trpc.police.heatmap` (0.001° grid aggregation)

### Alert Rendering Flow
1. `AlertsSidebar` toggles mode (emergency/police)
2. Hook fetches data (React Query or tRPC)
3. `useUnifiedAlerts` normalizes to GeoJSON
4. Renders MapLibre layers (points, clusters, polygons)
5. Click handlers show popups

## Government Data Layers

| Layer | Source | WMS Endpoint |
|-------|--------|--------------|
| Land Use | Geoscience Australia | `services.ga.gov.au` |
| Surface Geology | Geoscience Australia | `services.ga.gov.au` |
| Bushfire Hotspots | Sentinel (72-hour) | `hotspots.dea.ga.gov.au` |

**Proxy:** `/api/wms-proxy` with SSRF protection (whitelist of AU gov domains)

## Database Schema (`/drizzle/schema.ts`)

| Table | Purpose |
|-------|---------|
| `users` | Authentication (email, magic link) |
| `map_settings` | Per-user map state |
| `map_features` | Feature registry (plugins, controls) |
| `map_styles` | Available map styles |
| `custom_layers` | User-created layers |
| `police_reports` | Waze alert persistence |
| `emergency_registry` | Emergency alert sources |
| `magic_link_tokens` | Passwordless auth tokens |

## Key Patterns

### Safe Map Operations
```typescript
import { isMapValid, safeRemoveLayer, safeRemoveSource } from '@/utils/mapUtils';

// Always check before accessing map
if (!isMapValid(map)) return;

// Use safe removal helpers
safeRemoveLayer(map, 'layer-id');
safeRemoveSource(map, 'source-id');
```

### Map Lifecycle
1. `MapCore` mounts → initializes MapLibre → syncs to Zustand
2. Components subscribe to `useMapStore`, wait for `isLoaded=true`
3. Hooks render layers only after map loaded
4. Cleanup handlers safely remove layers/sources/events

### Layer Naming Convention
Prefix layers with scope:
- `recon-emergency-*` - Emergency alert layers
- `recon-police-*` - Police alert layers
- `recon-heatmap-*` - Heatmap layers

## Common Mistakes to Avoid

1. **Accessing map before loaded** - Always check `isLoaded` from `useMapStore`
2. **Forgetting cleanup** - Use `safeRemoveLayer`/`safeRemoveSource` in useEffect cleanup
3. **Hardcoding Mapbox** - Use MapTiler/MapLibre APIs only
4. **Missing terrain lock** - Prevent vertical shift during pan when terrain enabled
5. **Direct map mutations** - Update via Zustand store actions when possible

## Build & Deploy

```bash
# Development
pnpm dev

# Build
pnpm build          # Builds client + server

# Database
pnpm drizzle-kit push   # Push schema to Neon

# Type checking
pnpm type-check
```

**Output:**
- Client: `/dist/public`
- Server: `/dist/index.js`
