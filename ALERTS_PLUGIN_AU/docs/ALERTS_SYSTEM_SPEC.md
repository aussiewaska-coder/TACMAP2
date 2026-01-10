# AU Emergency Services Alerts Plugin - Map-Agnostic Technical Spec

## Purpose
This module is a standalone, modular alerts plugin for AU police + emergency services data. It is map-system agnostic by design: all map-specific work is isolated behind an adapter layer so it can run on MapLibre, MapTiler, ArcGIS JS, Google Maps, Cesium, or any other map SDK with GeoJSON support.

## High-Level Architecture
- Data registry: emergency feed catalog stored in a database table.
- Emergency alerts pipeline: fetch -> normalize -> GeoJSON output (no persistence).
- Police alerts pipeline: Waze sweep -> persist to DB -> query endpoints.
- Frontend: unified Alerts UI (filters + toggles) and map layers (points, clusters, polygons, heatmap).
- Optional aircraft tracking feed (ADSB) delivered as GeoJSON.

## System Components
### Backend
1) Registry Loader
- Source table: emergency_registry
- Source data: XLSX import (see registry import script)
- Purpose: provide list of machine-readable emergency feeds

2) Emergency Alerts API
- Endpoint: GET /api/emergency/alerts
- Behavior:
  - Load registry
  - Filter to alert categories (Alerts, Hazards, Hazards & Warnings, Weather)
  - Fetch and normalize each feed
  - Return GeoJSON FeatureCollection

3) Police Alerts (Waze)
- Endpoint: tRPC mutation waze.getAlertsAndJams
- Data source: OpenWebNinja Waze API
- Persistence: police_reports table
- Query: tRPC query police.list

4) Heatmap API
- Endpoint: tRPC query police.heatmap
- Aggregates police_reports into ~100m buckets

5) Aircraft Tracking
- Endpoint: GET /api/emergency/tracks
- Data source: ADSB.LOL v2 API
- Filters to registry-known aircraft in public/registry.json
- Output: GeoJSON FeatureCollection

### Frontend
1) Alerts UI
- Component: UnifiedAlertsPanel
- Modes: emergency / police
- Emergency filters: hazard type, ops mode, state
- Police filters: time range, sweep action, heatmap toggle

2) Map Rendering
- Hook: useUnifiedAlerts
- Renders:
  - Emergency: points + polygons
  - Police: point clusters
- Click behavior:
  - Cluster click -> zoom to expansion
  - Feature click -> popup

3) Police Heatmap
- Hook: useHeatmap
- Map layer type: heatmap

4) Aircraft Tracks
- Hook: useAircraftTracks
- Note: no map rendering in current UI; adapter should add a layer if enabled

## Canonical Alert Model
See `server/lib/ingest/types.ts`.
Minimal required fields:
- id, source_id, category, subcategory, tags, state, hazard_type,
  severity, severity_rank, title, description, issued_at, updated_at,
  confidence, age_s, geometry

## Map Adapter Contract (Map-Agnostic)
Implement this adapter for any map SDK:
- addGeoJsonSource(id, data, options)
- updateGeoJsonSource(id, data)
- addLayer(layerSpec)
- setLayerVisibility(id, visible)
- removeLayer(id)
- removeSource(id)
- on(event, layerId, handler)
- off(event, layerId, handler)
- queryRenderedFeatures(point, { layers })
- easeTo({ center, zoom })
- getClusterExpansionZoom(sourceId, clusterId)
- addPopup({ lngLat, html })

If the target SDK lacks native clustering, implement server-side clustering or client-side clustering before data reaches the map.

## Adapter Skeletons Included
- MapLibre: `code/map-adapter/maplibreAdapter.ts`
- MapTiler: `code/map-adapter/maptilerAdapter.ts` (MapLibre-compatible)
- Mapbox GL JS: `code/map-adapter/mapboxAdapter.ts` (uses `mapbox-gl`)
- ArcGIS JS: `code/map-adapter/arcgisAdapter.ts` (skeleton, fill TODOs)

## Data Flow
1) Emergency feeds
- registry -> fetch with cache -> normalize -> GeoJSON -> map

2) Police alerts
- sweep -> save -> query -> map
- heatmap -> aggregated query -> heatmap layer

3) Aircraft tracking
- ADSB -> filter -> GeoJSON -> map (optional)
- This bundle includes a MapLibre aircraft layer hook: `code/client/src/hooks/useAircraftLayer.ts`

## Cache Strategy
- Emergency alerts use stale-while-revalidate caching to avoid API timeouts.
- Alerts are not persisted; they are always derived at request time.

## Required Environment
See `docs/env.example` in this bundle.
Critical:
- DATABASE_URL
- WAZE_API_KEY
- KV_REST_API_URL + KV_REST_API_TOKEN (if cache enabled)

## Dependencies (Core)
Backend:
- drizzle-orm, @vercel/node, @vercel/kv, fast-xml-parser
Frontend:
- maplibre-gl (or any map SDK), @tanstack/react-query, @trpc/*,
  isomorphic-dompurify, sonner

## Modularity Guidance
- Treat the Alerts system as a standalone plugin module.
- Keep UI, data fetching, and map rendering in separate layers.
- Porting to another map provider should only require replacing the adapter.
- Never bind the data model or UI logic to a specific map SDK.

## Extension Points
- Add new feed types by implementing a new normalizer.
- Add additional alert sources by adding rows to emergency_registry.
- Enable aircraft tracks by adding a map layer and toggles in the UI.

## Source Code Included
All relevant files are copied into this bundle under `code/` with original paths preserved.
