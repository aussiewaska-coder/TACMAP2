# TACMAP2 - Claude Code Context

## Project Structure

**IMPORTANT**: The app deploys from the ROOT directory, NOT from any subdirectory.

- `/client/` - Frontend React app (Vite)
- `/server/` - Backend API
- `/drizzle/` - Database schema
- `vercel.json` - Vercel deployment config
- `vite.config.ts` - Vite config (root is `/client/`)

## Flight Simulator Feature

### Location
`/client/src/components/layout/UnifiedSidebar.tsx`

### Overview
A flight simulator button that provides two modes:
1. **Pan Mode** (click) - Continuous slow pan north
2. **Sightseeing Mode** (hold 500ms) - Random path with rotation and zoom on globe projection

### UI Button
- Position: Fixed, bottom-right corner (`bottom-6 right-4`)
- Icon: `Plane` from lucide-react
- Visual states:
  - Off: White/glass background
  - Pan mode: Blue (`bg-blue-600`)
  - Sightseeing: Purple with pulse animation (`bg-purple-600 animate-pulse`)

### State Variables
```typescript
const [flightMode, setFlightMode] = useState<'off' | 'pan' | 'sightseeing'>('off');
const flightRef = useRef<number | null>(null);        // requestAnimationFrame ID
const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);  // Long press detection
const prevProj = useRef<string | null>(null);         // Previous projection to restore
```

### Core Functions

#### `stopFlight()`
- Cancels animation frame
- Restores previous map projection (if changed)
- Sets mode to 'off'

#### `startPan()`
- Simple northward pan
- Speed: `0.00008` degrees latitude per millisecond
- Uses `map.setCenter()` each frame
- Clamps latitude at 85 degrees

#### `startSight()` (Sightseeing)
- Switches map to globe projection
- Generates random waypoints
- Interpolates:
  - **Position**: Moves toward waypoint at `0.00012` deg/ms
  - **Bearing**: Smooth rotation toward random target at `0.03` deg/ms
  - **Zoom**: Random zoom between 3-13, interpolates at `0.005` per ms
- New waypoint generated when within `0.02` degrees of current target
- Bearing changes by random ±45 degrees at each waypoint

### User Interaction Handling

#### Long Press Detection
```typescript
const fDown = () => {
  pressTimer.current = setTimeout(() => {
    startSight();
    pressTimer.current = null;
  }, 500);
};

const fUp = () => {
  if (pressTimer.current) {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    if (flightMode === 'off') startPan();
    else stopFlight();
  }
};
```

#### Auto-Stop on User Interaction
Flight automatically stops when user:
- Drags the map (`dragstart`)
- Scrolls/zooms (`wheel`)
- Double-clicks (`dblclick`)
- Touches the map (`touchstart`)

```typescript
useEffect(() => {
  if (!map) return;
  const stop = () => { if (flightRef.current) stopFlight(); };
  map.on('dragstart', stop);
  map.on('wheel', stop);
  map.on('dblclick', stop);
  map.on('touchstart', stop);
  return () => { /* cleanup */ };
}, [map]);
```

### Button Event Handlers
```typescript
onMouseDown={fDown}
onMouseUp={fUp}
onMouseLeave={() => { /* clear timer */ }}
onTouchStart={fDown}
onTouchEnd={fUp}
```

### Dependencies
- `useMapStore` - Zustand store for map instance
- `toast` from sonner - Notifications
- `Plane` icon from lucide-react
- `Z_INDEX.CONTROLS` from constants

### Animation Loop Pattern
Uses `requestAnimationFrame` with delta time calculation:
```typescript
let last = 0;
const go = (t: number) => {
  if (!map) return;
  if (last) {
    const delta = Math.min(t - last, 50); // Cap at 50ms to prevent jumps
    // ... update map position/bearing/zoom
  }
  last = t;
  flightRef.current = requestAnimationFrame(go);
};
flightRef.current = requestAnimationFrame(go);
```

### Globe Projection
Sightseeing mode switches to globe projection for cinematic effect:
```typescript
prevProj.current = map.getProjection()?.type || 'mercator';
map.setProjection({ type: 'globe' });
// ... on stop, restore:
map.setProjection({ type: prevProj.current as any });
```

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
