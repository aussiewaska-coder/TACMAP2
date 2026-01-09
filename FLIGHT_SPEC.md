# TACMAP Flight Simulator Dashboard - Technical Specification

## CRITICAL RULES (DO NOT VIOLATE)

### Rule 1: Zustand Selectors
```typescript
// WRONG - causes infinite re-render
export const useFlightControls = () => useFlightStore((state) => ({
    speed: state.speed,
    heading: state.heading,
}));

// CORRECT - use shallow comparator
import { shallow } from 'zustand/shallow';
export const useFlightControls = () => useFlightStore(
    (state) => ({
        speed: state.speed,
        heading: state.heading,
    }),
    shallow
);
```

### Rule 2: Event Handlers - Get State Fresh
```typescript
// WRONG - map captured at render time, may be null/stale
const map = useMapStore((state) => state.map);
const handleClick = () => {
    if (!map) return; // map is stale closure!
    map.flyTo(...);
};

// CORRECT - get fresh state on each click
const handleClick = () => {
    const map = useMapStore.getState().map;
    if (!map) return;
    map.flyTo(...);
};
```

### Rule 3: Animation Loops - Get State Each Frame
```typescript
// WRONG - uses stale closure
const startFlight = () => {
    const go = (t: number) => {
        if (!map) return; // stale!
        map.setCenter(...);
        requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
};

// CORRECT - get fresh each frame
const startFlight = () => {
    const go = (t: number) => {
        const map = useMapStore.getState().map;
        if (!map) return;
        map.setCenter(...);
        requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
};
```

### Rule 4: Map Cleanup Order
```typescript
// In MapCore.tsx cleanup:
return () => {
    const mapToDestroy = mapRef.current;
    mapRef.current = null;
    setMap(null);           // 1. Signal to subscribers FIRST
    setLoaded(false);
    mapToDestroy?.remove(); // 2. THEN destroy map
};
```

### Rule 5: Safe Map Access
```typescript
// Always check before ANY map operation
function isMapValid(map: any): boolean {
    return map && typeof map.getCenter === 'function';
}
```

---

## FILE STRUCTURE

```
client/src/
├── stores/
│   └── flightStore.ts       # CREATE - Flight state
├── components/
│   └── flight/
│       ├── FlightButton.tsx     # CREATE - Floating button
│       └── FlightDashboard.tsx  # CREATE - HUD overlay
└── components/layout/
    └── MapLayout.tsx            # MODIFY - Add FlightDashboard
```

**DO NOT** put flight logic in UnifiedSidebar.tsx. Keep it separate.

---

## FILE 1: flightStore.ts

```typescript
import { create } from 'zustand';

interface FlightState {
    dashboardOpen: boolean;
    mode: 'off' | 'pan' | 'sightseeing';
    animationId: number | null;
    prevProjection: string | null;

    openDashboard: () => void;
    closeDashboard: () => void;
    setMode: (mode: 'off' | 'pan' | 'sightseeing') => void;
    setAnimationId: (id: number | null) => void;
    setPrevProjection: (proj: string | null) => void;
}

export const useFlightStore = create<FlightState>((set) => ({
    dashboardOpen: false,
    mode: 'off',
    animationId: null,
    prevProjection: null,

    openDashboard: () => set({ dashboardOpen: true }),
    closeDashboard: () => set({ dashboardOpen: false }),
    setMode: (mode) => set({ mode }),
    setAnimationId: (id) => set({ animationId: id }),
    setPrevProjection: (proj) => set({ prevProjection: proj }),
}));

// SIMPLE selectors - primitives don't need shallow
export const useFlightDashboardOpen = () => useFlightStore((s) => s.dashboardOpen);
export const useFlightMode = () => useFlightStore((s) => s.mode);
```

---

## FILE 2: FlightButton.tsx

```typescript
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightMode } from '@/stores/flightStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

export function FlightButton() {
    const mode = useFlightMode();

    const stopFlight = () => {
        const store = useFlightStore.getState();
        if (store.animationId) cancelAnimationFrame(store.animationId);

        // Restore projection if saved
        const map = useMapStore.getState().map;
        if (map && store.prevProjection) {
            map.setProjection({ type: store.prevProjection as any });
        }

        store.setAnimationId(null);
        store.setPrevProjection(null);
        store.setMode('off');
    };

    const startPan = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();
        useFlightStore.getState().setMode('pan');

        let lastTime = 0;
        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const currentMode = useFlightStore.getState().mode;

            if (!currentMap || currentMode !== 'pan') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();
                const newLat = Math.min(85, center.lat + 0.00008 * delta);
                currentMap.setCenter([center.lng, newLat]);
            }

            lastTime = time;
            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
        };

        const id = requestAnimationFrame(animate);
        useFlightStore.getState().setAnimationId(id);
        toast.info('Flight: Pan north');
    };

    const startSightseeing = () => {
        const map = useMapStore.getState().map;
        if (!map) {
            toast.error('Map not ready');
            return;
        }

        stopFlight();

        // Save projection and switch to globe
        const currentProj = map.getProjection()?.type || 'mercator';
        useFlightStore.getState().setPrevProjection(currentProj);
        map.setProjection({ type: 'globe' });
        useFlightStore.getState().setMode('sightseeing');

        let lastTime = 0;
        let targetBearing = map.getBearing();
        let targetZoom = map.getZoom();
        let waypoint = { lng: map.getCenter().lng, lat: map.getCenter().lat };

        const animate = (time: number) => {
            const currentMap = useMapStore.getState().map;
            const currentMode = useFlightStore.getState().mode;

            if (!currentMap || currentMode !== 'sightseeing') {
                useFlightStore.getState().setAnimationId(null);
                return;
            }

            if (lastTime) {
                const delta = Math.min(time - lastTime, 50);
                const center = currentMap.getCenter();
                const zoom = currentMap.getZoom();
                const bearing = currentMap.getBearing();

                // Distance to waypoint
                const dx = waypoint.lng - center.lng;
                const dy = waypoint.lat - center.lat;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Generate new waypoint when close
                if (dist < 0.02) {
                    const angle = Math.random() * 6.28;
                    waypoint = {
                        lng: ((center.lng + Math.cos(angle) * 0.15 + 180) % 360) - 180,
                        lat: Math.max(-85, Math.min(85, center.lat + Math.sin(angle) * 0.15))
                    };
                    targetBearing = (targetBearing + Math.random() * 90 - 45 + 360) % 360;
                    targetZoom = 3 + Math.random() * 10;
                }

                // Move toward waypoint
                const moveAngle = Math.atan2(dy, dx);
                const newLng = center.lng + Math.cos(moveAngle) * 0.00012 * delta;
                const newLat = Math.max(-85, Math.min(85, center.lat + Math.sin(moveAngle) * 0.00012 * delta));

                // Smooth bearing
                const bearingDiff = ((targetBearing - bearing + 540) % 360) - 180;
                const newBearing = bearing + Math.sign(bearingDiff) * Math.min(Math.abs(bearingDiff), 0.03 * delta);

                // Smooth zoom
                const zoomDiff = targetZoom - zoom;
                const newZoom = zoom + Math.sign(zoomDiff) * Math.min(Math.abs(zoomDiff), 0.005 * delta);

                currentMap.jumpTo({
                    center: [newLng, newLat],
                    bearing: newBearing,
                    zoom: newZoom
                });
            }

            lastTime = time;
            const id = requestAnimationFrame(animate);
            useFlightStore.getState().setAnimationId(id);
        };

        const id = requestAnimationFrame(animate);
        useFlightStore.getState().setAnimationId(id);
        toast.info('Flight: Sightseeing');
    };

    const handleClick = () => {
        if (mode === 'off') {
            startPan();
        } else {
            stopFlight();
        }
    };

    const handleLongPress = () => {
        if (mode === 'off') {
            startSightseeing();
        } else {
            stopFlight();
        }
    };

    // Long press detection
    let pressTimer: ReturnType<typeof setTimeout> | null = null;

    const onMouseDown = () => {
        pressTimer = setTimeout(() => {
            handleLongPress();
            pressTimer = null;
        }, 500);
    };

    const onMouseUp = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            handleClick();
        }
    };

    const onMouseLeave = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    return (
        <Button
            variant={mode !== 'off' ? 'default' : 'outline'}
            size="icon"
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onMouseDown}
            onTouchEnd={onMouseUp}
            title="Click: pan north | Hold: sightseeing"
            className={`
                fixed bottom-6 right-4 w-14 h-14 rounded-2xl shadow-2xl select-none
                ${mode === 'pan' ? 'bg-blue-600 text-white' : ''}
                ${mode === 'sightseeing' ? 'bg-purple-600 text-white animate-pulse' : ''}
                ${mode === 'off' ? 'bg-white/90 backdrop-blur-xl text-gray-800 hover:bg-white border border-white/50' : ''}
            `}
            style={{ zIndex: Z_INDEX.CONTROLS }}
        >
            <Plane className="w-6 h-6" />
        </Button>
    );
}
```

---

## FILE 3: FlightDashboard.tsx

```typescript
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightDashboardOpen, useFlightMode } from '@/stores/flightStore';

export function FlightDashboard() {
    const isOpen = useFlightDashboardOpen();
    const mode = useFlightMode();

    if (!isOpen) return null;

    const closeDashboard = () => {
        useFlightStore.getState().closeDashboard();
    };

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* Top bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md border border-cyan-500/50 rounded-lg px-6 py-2 text-cyan-400 font-mono">
                    MODE: {mode.toUpperCase()}
                </div>
            </div>

            {/* Close button */}
            <div className="absolute top-4 right-4 pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeDashboard}
                    className="text-cyan-400 hover:bg-cyan-500/20"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
```

---

## FILE 4: MapLayout.tsx changes

```typescript
// Add imports at top
import { FlightButton } from '@/components/flight/FlightButton';
import { FlightDashboard } from '@/components/flight/FlightDashboard';

// Add to JSX after UnifiedSidebar:
<FlightButton />
<FlightDashboard />
```

---

## FILE 5: Remove flight code from UnifiedSidebar.tsx

Remove these lines (approximately lines 55-78):
- `const map = useMapStore((state) => state.map);`
- `const [flightMode, setFlightMode] = useState...`
- `const flightRef = useRef...`
- `const pressTimer = useRef...`
- `const prevProj = useRef...`
- `const stopFlight = () => ...`
- `useEffect(() => { if (!map) return; const stop = ...` (the user interaction effect)
- `const startPan = () => ...`
- `const startSight = () => ...`
- `const handleFlightClick = () => ...`
- `const handleFlightLongPress = () => ...`
- `const fDown = () => ...`
- `const fUp = () => ...`
- The entire `FlightButton` component definition
- Remove `<FlightButton />` from both mobile and desktop layouts

Also remove `Plane` from the lucide-react imports.

---

## IMPLEMENTATION ORDER

1. Create `flightStore.ts` - test that store works
2. Create `FlightButton.tsx` - test button appears and click works
3. Test pan flight works - click button, map moves north
4. Create `FlightDashboard.tsx` - test it opens/closes
5. Add sightseeing mode (already in FlightButton.tsx)
6. Remove old code from UnifiedSidebar.tsx
7. Update MapLayout.tsx

**TEST AFTER EACH STEP. DO NOT PROCEED IF BROKEN.**

---

## STOP FLIGHT ON USER INTERACTION

Add this useEffect to FlightButton.tsx:

```typescript
import { useEffect } from 'react';

// Inside FlightButton component:
useEffect(() => {
    const map = useMapStore.getState().map;
    if (!map) return;

    const stop = () => {
        const currentMode = useFlightStore.getState().mode;
        if (currentMode !== 'off') {
            stopFlight();
        }
    };

    map.on('dragstart', stop);
    map.on('wheel', stop);
    map.on('dblclick', stop);
    map.on('touchstart', stop);

    return () => {
        try {
            map.off('dragstart', stop);
            map.off('wheel', stop);
            map.off('dblclick', stop);
            map.off('touchstart', stop);
        } catch (e) {
            // Map may be destroyed
        }
    };
}, []);
```

---

## BUGS TO AVOID

| Bug | Cause | Prevention |
|-----|-------|------------|
| Infinite re-render | Object selector without `shallow` | Use `shallow` or select primitives only |
| Stale map | Closure captures null map | Use `getState()` in handlers |
| Animation continues after stop | Old animationId not cancelled | Store animationId, cancel before new |
| Map access after destroy | Cleanup order wrong | `setMap(null)` before `map.remove()` |
| Click does nothing | Event handler uses stale state | Always `getState()` in onClick |
| Long press not working | pressTimer is stale | Use local variable, not ref |
