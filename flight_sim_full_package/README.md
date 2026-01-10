# MapTiler Web Flight Simulator (TACMAP2 Flight Plugin)

This package contains the complete, authoritative spec and scaffolding for the TACMAP2 flight-sim experience. It is a client-only MapLibre + MapTiler implementation that renders a cinematic, planet-scale stealth aircraft with yaw-driven banking, pitch decay, globe transitions, click-to-target navigation, and orbit arrival mode. The full requirements live in `PLAN.md` (do not change or summarise it).

## What’s here
- `PLAN.md`: Full authoritative spec (must be followed exactly).
- `src/`: TypeScript scaffolding for map, aircraft state, controls, easing, navigation, and UI.
- `public/models/stealth_bomber.glb`: Expected GLB path for the aircraft (you supply the model).
- `tsconfig.json`: Strict TS build target for browser ESM.
- `package.json`: Minimal deps: MapLibre GL JS + MapTiler 3D, TypeScript.

## Quick start
1) MapTiler key: set `VITE_MAPTILER_API_KEY` in your env or edit `src/map.ts` (`YOUR_API_KEY` placeholder).
2) Dev server: from repo root run `pnpm vite --config flight_sim_full_package/vite.config.ts --open`.
3) Build bundle: `pnpm vite build --config flight_sim_full_package/vite.config.ts` (outputs to `flight_sim_full_package/dist`).
4) Aircraft model: place your GLB at `public/models/stealth_bomber.glb` (path is baked into the custom layer).

## Integrating into TACMAP2 (“put it on the map”)
- Mount point: ensure the host app has a `div#map` and includes MapLibre styles.
- Map init: `initMap()` in `src/map.ts` uses MapTiler styles; swap style URL if TACMAP2 provides one, but keep MapTiler 3D enabled.
- State + update loop: `initAircraft()` owns the single `FlightState` and exposes `update()` to run each animation frame. Call it inside the host app’s `requestAnimationFrame` loop (or use `main.ts` as-is).
- Controls: `initControls()` binds keyboard + on-screen buttons; wire additional UI into TACMAP2 as needed but keep incremental inputs only.
- HUD: `initUI()` renders flight stats; style to match TACMAP2 while preserving required fields from the spec.
- Custom layer: add the Three.js GLB renderer as a MapTiler CustomLayer attached in `initMap()` to keep aircraft centered while the map scrolls beneath it.

## Development checklist (follow `PLAN.md`)
- Implement physics: pitch decay, yaw-driven roll, heading integration, tiered speed/altitude clamps.
- Camera: third-person lock with altitude-based offset, bearing follows heading, smooth globe transition ≥ ~60k ft or Mach.
- Navigation: click-to-target → NAVIGATE; auto ORBIT on arrival with 25–35° bank and eased transitions only.
- Easing: apply cubic easing to every transition (speed, altitude, heading, camera offsets, globe, FlyTo).
- Performance: requestAnimationFrame loop, avoid per-frame allocations, target 60 FPS.

## Testing & deployment
- Manual flight checks: banking visuals, pitch auto-level feel, Mach speed behavior, globe handoff at altitude, orbit stability.
- Run `pnpm exec tsc` to type-check before pushing.
- Deploy as a static bundle (Vercel-ready). Ensure no server components are required.
