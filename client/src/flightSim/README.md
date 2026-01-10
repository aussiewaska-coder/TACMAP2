# MapTiler Web Flight Simulator (TACMAP2 Flight Plugin)

This package contains the complete, authoritative spec and scaffolding for the TACMAP2 flight-sim experience. It is a client-only MapLibre + MapTiler implementation that renders a cinematic, planet-scale stealth aircraft with yaw-driven banking, pitch decay, globe transitions, click-to-target navigation, and orbit arrival mode. The full requirements live in `PLAN.md` (do not change or summarise it).

## What’s here
- `PLAN.md`: Full authoritative spec (must be followed exactly).
- `client/src/flightSim/`: TypeScript scaffolding for map, aircraft state, controls, easing, navigation, custom layer, and UI.
- `client/public/models/stealth_bomber.glb`: Expected GLB path for the aircraft (model included placeholder; swap if needed).

## Quick start (TACMAP2 Vercel-ready)
1) Install deps: `pnpm install` (adds `three` + MapLibre already in root).
2) MapTiler key: ensure `VITE_MAPTILER_API_KEY` is set (already in Vercel env). `map.ts` reads it automatically.
3) Aircraft model: confirm `/client/public/models/stealth_bomber.glb` exists (replace with your preferred GLB if desired).
4) Run locally: `pnpm dev` then open `/flight-sim`.
5) Build for Vercel: `pnpm build:vercel` (flight sim is bundled with the root Vite app).

## Integrating into TACMAP2 (“put it on the map”)
- Route: `/flight-sim` mounts the sim via `FlightSimPage.tsx` using `startFlightSim("flight-map")`.
- Mount point: `FlightSimPage` renders `<div id="flight-map" class="flight-map">` inside `.flight-sim-root`; styles are in `flightSim.css`.
- Map init: `initMap()` in `flightSim/map.ts` uses the MapTiler key from env and locks rotation; fog is enabled on load.
- State + loop: `initAircraft()` holds `FlightState`, updated each RAF via `startFlightSim()`. Controls/UI/navigation wire up automatically.
- Controls/HUD: keyboard + on-screen buttons; HUD is rendered via `flightSim/ui.ts` and includes required fields.
- Custom layer: Three.js GLB renderer in `flightSim/modelLayer.ts` attaches on map load and orients the aircraft by heading/pitch/roll.

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
