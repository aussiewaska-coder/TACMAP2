# TACMAP2 - Claude Code Context

## Project Structure

**IMPORTANT**: The app deploys from the ROOT directory, NOT from any subdirectory.

- `/client/` - Frontend React app (Vite)
- `/server/` - Backend API
- `/drizzle/` - Database schema
- `vercel.json` - Vercel deployment config
- `vite.config.ts` - Vite config (root is `/client/`)

## RECONMAP Alerts Command Dashboard

### Overview
RECONMAP is a modular AU emergency + police alerts system with a map-engine swap layer. The landing screen selects Mapbox or MapTiler (MapLibre). The main UI is a collapsible, tactical Alerts sidebar over the map.

### Key Files
| File | Purpose |
|------|---------|
| `/client/src/pages/Home.tsx` | Provider selection landing screen |
| `/client/src/pages/MapPageNew.tsx` | Map page entry point |
| `/client/src/components/recon/ReconLayout.tsx` | Map + overlay layout |
| `/client/src/components/recon/AlertsSidebar.tsx` | Tactical alerts command UI |
| `/client/src/core/MapCore.tsx` | Map engine bootstrap + provider switching |
| `/client/src/stores/mapProviderStore.ts` | Persisted provider selection |
| `/client/src/stores/mapStore.ts` | Shared map state |
| `/client/src/hooks/useUnifiedAlerts.ts` | Alert layers + clustering |
| `/client/src/hooks/useHeatmap.ts` | Police heatmap overlay |
| `/client/src/hooks/useAircraftTracks.ts` | Aircraft tracking query |
| `/client/src/hooks/useAircraftLayer.ts` | Aircraft map layer |
| `/client/src/layers/live/UserLocationLayer.tsx` | Geolocation control |

### Provider Selection
- Default provider comes from `VITE_RECONMAP_DEFAULT_PROVIDER` (defaults to `mapbox`).
- Landing screen sets provider and routes to `/map?provider=...`.
- `MapCore` re-initializes when provider changes (Mapbox GL JS vs MapLibre).

### Alert Pipelines
- Emergency alerts: `GET /api/emergency/alerts` (live GeoJSON, no persistence).
- Police alerts: Waze sweep -> `police_reports` table -> `trpc.police.list`.
- Heatmap: `trpc.police.heatmap` aggregates police reports.
- Aircraft tracks: `GET /api/emergency/tracks` (optional overlay).

### UI + Map Layers
- `AlertsSidebar` controls mode (emergency/police), filters, heatmap, aircraft overlay.
- `useUnifiedAlerts` renders points, clusters, and emergency polygons.
- `useHeatmap` renders police heatmap.
- `useAircraftLayer` renders aircraft points/labels.

### Common Mistakes to Avoid
1. Don’t access the map instance before `isLoaded` is true.
2. Use `useMapStore` and `isMapValid` for safe cleanup on unmount.
3. Provider changes must rebuild the map (handled by `MapCore`).
