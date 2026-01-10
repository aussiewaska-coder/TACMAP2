# AU Emergency Services Alerts Plugin (Map-Agnostic)

This folder is a self-contained plugin bundle for the AU police + emergency services alerts system. It is designed to be map-system agnostic and portable to Mapbox, MapTiler (MapLibre), ArcGIS JS, Google Maps, Cesium, or any platform capable of rendering GeoJSON.

## What This Bundle Contains
- `code/` - copied source files with original paths preserved (includes the RECONMAP client UI)
- `docs/ALERTS_SYSTEM_SPEC.md` - full technical spec and rebuild guide
- `docs/env.example` - environment configuration template
- `code/map-adapter/` - map adapter skeletons (MapLibre, MapTiler, Mapbox GL JS, ArcGIS JS)
- `Mapbox adapter` uses `mapbox-gl`

## UI Entry Points
- Landing screen: `code/client/src/pages/Home.tsx` (provider selection)
- Dashboard: `code/client/src/components/recon/ReconLayout.tsx`
- Alerts UI: `code/client/src/components/recon/AlertsSidebar.tsx`

## Modularity Principles
- Treat this as a pluggable module, not a monolith.
- Keep data fetching, alert normalization, UI, and map rendering in separate layers.
- Map-specific code must live behind a small adapter interface so you can swap map SDKs without rewriting logic.

## Map Adapter Required
Any map SDK integration must implement a minimal adapter with:
- GeoJSON sources and layers
- clustering and polygon rendering
- popup rendering
- layer visibility toggles

If the target SDK does not support clustering, perform clustering before data reaches the map.

## Aircraft Tracks Layer
A MapLibre/Mapbox-compatible aircraft tracks layer hook is included:
`code/client/src/hooks/useAircraftLayer.ts`
It renders live ADSB tracks when enabled in the Alerts sidebar.

## Notes
- Emergency alerts are fetched live and normalized on each request.
- Police alerts are persisted in the database via Waze sweeps.
- Aircraft tracking is available as GeoJSON and can be rendered via the aircraft layer hook.
- Provider selection defaults to Mapbox; MapTiler is available as an open-source option.
