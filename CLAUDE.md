# TACMAP2 - Claude Code Context

## Project Structure

**IMPORTANT**: The app deploys from the ROOT directory, NOT from any subdirectory.

- `/client/` - Frontend React app (Vite)
- `/server/` - Backend API
- `/drizzle/` - Database schema
- `vercel.json` - Vercel deployment config
- `vite.config.ts` - Vite config (root is `/client/`)

## Tactical Flight Command Dashboard

### Overview
A full HUD overlay system with manual controls, automated great-circle missions, and real-time telemetry. Features a glassmorphic tactical aesthetic with cyan/blue accents.

### Key Files
| File | Purpose |
|------|---------|
| `/client/src/stores/flightStore.ts` | Flight state management (Zustand) |
| `/client/src/hooks/useFlight.ts` | Flight animation hook |
| `/client/src/utils/geodesic.ts` | Great-circle calculations |
| `/client/src/components/overlays/FlightDashboard.tsx` | Main HUD container |
| `/client/src/components/layout/UnifiedSidebar.tsx` | Flight button (toggles dashboard) |

### Activation
- Click the Plane button (bottom-right) to open/close the dashboard
- Button color indicates state:
  - White/glass: Dashboard closed
  - Cyan: Dashboard open, flight off
  - Blue: Manual flight active
  - Green (pulsing): Autopilot active

### Flight Modes
1. **Off** - No flight, dashboard can be open or closed
2. **Manual** - User controls via speed/heading/altitude sliders
3. **Autopilot** - Follow great-circle route to destination

### Manual Controls
| Control | Range | Default |
|---------|-------|---------|
| Speed | 100-2000 km/h | 500 |
| Heading | 0-360° | 0 (north) |
| Altitude | 1000-50000m | 10000 |

### Autopilot Destinations
Predefined Australian destinations:
- Sydney, Nimbin, Melbourne, Brisbane, Uluru, Perth, Adelaide, Hobart, Darwin, Cairns

### HUD Layout
```
+------------------------------------------------------------------+
|  [COMPASS]     MODE: AUTOPILOT     [LAT/LNG]  [SPEED]  [ETA]    |
+------------------------------------------------------------------+
|  [HORIZON]                                        [CONTROLS]     |
|  [ALTITUDE]          [MAP AREA]                   [AUTOPILOT]    |
+------------------------------------------------------------------+
```

### State Management (flightStore)
```typescript
interface FlightState {
  dashboardOpen: boolean;
  mode: 'off' | 'manual' | 'autopilot';
  targetSpeed: number;
  targetHeading: number;
  targetAltitude: number;
  telemetry: FlightTelemetry;
  destination: Destination | null;
  routeGeometry: GeoJSON.LineString | null;
  distanceRemaining: number;
  etaSeconds: number;
}
```

### Geodesic Utilities (geodesic.ts)
- `greatCircleDistance(from, to)` - Haversine formula
- `greatCircleBearing(from, to)` - Forward azimuth
- `greatCirclePath(from, to, numPoints)` - Interpolated LineString
- `greatCircleInterpolate(from, to, fraction)` - Point along path
- `destinationPoint(from, bearing, distance)` - Point at bearing/distance

### Auto-Stop on User Interaction
Flight automatically stops when user:
- Drags the map (`dragstart`)
- Scrolls/zooms (`wheel`)
- Double-clicks (`dblclick`)
- Touches the map (`touchstart`)

### Route Visualization
Autopilot routes are displayed on the map as a dashed cyan line using a GeoJSON source/layer:
- Source ID: `flight-route-source`
- Layer ID: `flight-route-layer`
- Style: 3px width, cyan color, 70% opacity, dashed

### Animation Pattern
Uses `requestAnimationFrame` with delta time calculation (capped at 50ms)

## Key Files

| File | Purpose |
|------|---------|
| `/client/src/components/layout/UnifiedSidebar.tsx` | Main sidebar + flight button |
| `/client/src/components/layout/MapLayout.tsx` | Layout that renders UnifiedSidebar |
| `/client/src/pages/MapPageNew.tsx` | Map page component |
| `/client/src/stores/index.ts` | Zustand stores including mapStore |
| `/client/src/core/constants.ts` | Z_INDEX and other constants |

## Common Mistakes to Avoid

1. **DO NOT** edit files in any `maplibre_mapping_app/` directory - it doesn't exist anymore and was never deployed
2. **ALWAYS** check `vite.config.ts` and `vercel.json` to understand build structure
3. The map instance comes from `useMapStore`, not a ref in the component
4. MapLibre GL JS uses `jumpTo()` for instant updates, `easeTo()`/`flyTo()` for animated
