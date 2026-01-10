# MapTiler Web Flight Simulator — COMPLETE AUTHORITATIVE SPEC

---

**THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH.**  
**NO SECTIONS MAY BE OMITTED, SUMMARISED, OR REINTERPRETED.**  
**ARCHITECTURE MUST ALLOW FOR ROADMAP ITEMS BUT MUST NOT IMPLEMENT THEM YET.**

---

## 1. OBJECTIVE

Build a cinematic, planet-scale, web-based 3D flight simulator using MapTiler and MapLibre GL JS.

The simulator must feel:
- Smooth
- Physically coherent
- Cinematic
- Deliberate
- Planetary in scale

**This is NOT an arcade toy and NOT a data viz demo.**

### Core Requirements

- Locked third-person POV camera (above & behind aircraft)
- Realistic-feeling pitch, yaw, roll, and banking
- Banking roll tied to yaw
- Pitch auto-level decay
- Planet-scaled movement tied to altitude & speed
- Seamless globe view at high altitude
- Incremental controls ONLY (buttons + keyboard, NO sliders)
- Click-to-target navigation
- Automatic orbit mode on arrival
- Gorgeous FlyTo-style easing on ALL motion
- Speeds up to Mach 50
- Altitudes up to 100,000 ft
- Single stealth aircraft 3D model (GLB)
- 100% client-side
- Deployable on Vercel

---

## 2. TECH STACK (MANDATORY)

- MapTiler SDK (latest)
- MapLibre GL JS (latest)
- MapTiler 3D / CustomLayerInterface
- Three.js (used ONLY inside the custom 3D layer)
- TypeScript
- requestAnimationFrame update loop
- GLB aircraft model

**NO server logic.**  
**NO physics engines.**  
**NO unnecessary dependencies.**

---

## 3. CORE DATA MODEL

ALL logic derives from ONE state object.

```typescript
FlightState {
  lat: number                // degrees
  lng: number                // degrees
  altitudeFt: number         // feet
  speedMps: number           // meters per second
  pitch: number              // radians
  roll: number               // radians
  yaw: number                // radians per second
  heading: number            // radians
  mode: "MANUAL" | "NAVIGATE" | "ORBIT"
  target: {
    lat: number
    lng: number
  } | null
}
```

**No hidden state.**  
**No magic globals.**

---

## 4. FLIGHT PHYSICS MODEL (INTENTIONAL SIMPLIFICATION)

This is NOT a real aerodynamics simulator.  
It is a convincing cinematic model.

### 4.1 Pitch

Incremental up/down input.

When no input is applied, pitch MUST decay toward level:

```typescript
if (!pitchInput) {
  pitch *= 0.96
}
```

### 4.2 Yaw

Incremental left/right input.

- Controls turn rate
- Drives banking roll

### 4.3 Roll (BANKING — REQUIRED)

Roll MUST be tied to yaw.

```typescript
roll += yawInput * 0.015
roll *= 0.92
```

This creates:
- Visible banking during turns
- Natural roll decay when straightening out

### 4.4 Heading

```typescript
heading += yaw * deltaTime
```

---

## 5. PLANET-SCALED MOVEMENT

Movement MUST feel faster at altitude.

**Constants:**

```
Earth radius = 6,371,000 meters
```

**Forward distance per frame:**

```typescript
distanceMeters = speedMps * deltaTime
```

**Convert meters → degrees:**

```typescript
deltaLat = (distanceMeters / EarthRadius) * (180 / Math.PI)
deltaLng = deltaLat / Math.cos(lat * Math.PI / 180)
```

Apply heading to determine direction vector.

MapLibre handles Mercator distortion; **DO NOT fight it.**

---

## 6. SPEED & ALTITUDE TIERS (HARD LIMITS)

Speed is tiered. Altitude is CLAMPED by speed.

| Speed Tier | Speed (m/s) | Max Altitude (ft) |
|------------|-------------|-------------------|
| 100        | 100         | 500               |
| 500        | 500         | 5,000             |
| 1,000      | 1,000       | 15,000            |
| 5,000      | 5,000       | 45,000            |
| Mach 10    | 3,430       | 80,000            |
| Mach 20    | 6,860       | 95,000            |
| Mach 50    | 17,150      | 100,000           |

**Rules:**

- Altitude MUST clamp dynamically when speed tier changes
- You cannot exceed altitude limits for a given speed
- Visual terrain speed MUST scale dramatically with altitude

---

## 7. CAMERA SYSTEM

### 7.1 Default Camera (PRIMARY MODE)

- Locked above & behind aircraft
- Offset increases with altitude
- Always looks forward along heading
- Camera roll matches aircraft roll
- No free camera rotation
- Aircraft remains visually centered

### 7.2 Globe Camera Mode

**Triggered automatically when:**

- Altitude ≥ ~60,000 ft  
  **OR**
- Mach speeds engaged

**Behaviour:**

- Switch map projection to globe
- Smooth eased transition ONLY (no snapping)
- Camera distance increases with altitude
- Globe rotates with aircraft heading

---

## 8. MAP BEHAVIOUR

- Aircraft remains fixed near screen center
- Map scrolls beneath aircraft
- Map bearing follows aircraft heading
- Map pitch increases with altitude and speed

**NO snapping**  
**NO teleporting**  
**NO sudden bearing jumps**

---

## 9. NAVIGATION & TARGETING

### 9.1 Click-to-Target

- User clicks anywhere on the map
- Target marker is placed
- `FlightState.mode` → `NAVIGATE`

### 9.2 Navigate Mode

- Aircraft FlyTo target
- Heading, speed, altitude eased
- No direct teleport
- Must look cinematic

### 9.3 Orbit Mode

**Triggered automatically when:**

- Aircraft is within arrival radius of target

**Orbit behaviour:**

- Circular orbit around target
- Constant angular velocity
- Bank angle: 25°–35°
- Orbit radius scales with altitude
- Camera continues locked POV

---

## 10. FLYTO & EASING (MANDATORY EVERYWHERE)

**ALL transitions MUST use cubic easing.**  
**LINEAR INTERPOLATION IS FORBIDDEN.**

```typescript
function easeInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}
```

Apply easing to:

- Speed changes
- Altitude changes
- Heading changes
- Camera offsets
- Globe transitions
- FlyTo navigation

---

## 11. CONTROLS

### 11.1 Keyboard Controls

| Key   | Action              |
|-------|---------------------|
| ↑     | Pitch up            |
| ↓     | Pitch down          |
| ←     | Yaw left            |
| →     | Yaw right           |
| R     | Increase altitude   |
| F     | Decrease altitude   |
| +     | Increase speed tier |
| -     | Decrease speed tier |
| G     | Toggle globe (manual override) |
| ESC   | Cancel target / exit orbit |

### 11.2 On-Screen Buttons

- Same actions as keyboard
- Incremental ONLY
- Touch-friendly
- No sliders
- No analog inputs

---

## 12. UI & HUD

**HUD MUST display:**

- Current speed tier
- Altitude (feet)
- Heading (degrees)
- Flight mode (MANUAL / NAVIGATE / ORBIT)
- Distance to target (if active)
- Globe mode indicator

**UI rules:**

- Minimal
- Aviation-inspired
- Monospace / technical fonts
- No clutter
- No novelty UI

---

## 13. 3D AIRCRAFT MODEL

- Single GLB stealth aircraft (fighter / bomber)
- Loaded via MapTiler CustomLayer
- Oriented by heading, pitch, roll
- Subtle scale adjustment with altitude for depth perception
- No LOD switching required initially

---

## 14. PERFORMANCE CONSTRAINTS

- **Target:** 60 FPS
- Single aircraft only
- Deterministic update loop
- No physics engines
- No expensive per-frame allocations

---

## 15. ACCEPTANCE CRITERIA

**The implementation is considered successful ONLY IF:**

- Motion feels smooth and cinematic
- Banking is clearly visible during turns
- Pitch auto-level feels natural
- Globe transition is seamless
- High-speed travel feels planetary
- Orbit mode is stable and beautiful
- **ZERO snapping, jitter, or teleporting**

---

## 16. ROADMAP (GUIDANCE ONLY — DO NOT IMPLEMENT)

**These features are NOT part of the current build.**  
**Architecture MUST allow for them later.**

- Waypoints & multi-leg routes
- Cockpit / first-person view
- Weather systems & clouds
- AI traffic
- Multiplayer

---

**END OF DOCUMENT**

---

Implementation Plan for TACMAP2 Integration (non-normative; spec above remains authoritative)

1) Bootstrap & configuration
- Add MapTiler API key to `src/map.ts`; verify 3D/globe mode is available.
- Place aircraft GLB at `public/models/stealth_bomber.glb` and confirm loading via a simple Three.js custom layer.

2) Core state & loop
- Implement `FlightState` exactly as defined; create a deterministic `update()` loop called from `requestAnimationFrame`.
- Wire incremental control inputs to mutate pitch/yaw/altitude/speed tiers; ensure pitch decay and yaw-driven roll are applied each frame.

3) Map + camera behavior
- Keep aircraft fixed near screen center; drive map bearing/pitch from heading/altitude.
- Implement third-person camera offset scaling with altitude, heading-following, and eased globe transitions ≥ ~60k ft or Mach speeds.

4) Movement, tiers, and constraints
- Convert forward motion to lat/lng deltas using Earth radius; clamp altitude to the active speed tier limits.
- Ensure visual ground speed scales with altitude and high-speed tiers feel planetary.

5) Navigation & orbit
- Add click-to-target to enter NAVIGATE mode with eased FlyTo-style transitions.
- Detect arrival radius, auto-enter ORBIT with 25–35° bank and constant angular velocity; allow ESC to cancel.

6) HUD & controls
- Render HUD with required fields (speed tier, altitude ft, heading deg, mode, target distance, globe indicator).
- Bind keyboard + on-screen buttons for all actions; keep interactions incremental (no sliders/analog).

7) Performance & polish
- Avoid per-frame allocations; profile for stable 60 FPS.
- Validate easing on all transitions; ensure zero snapping or teleporting during globe switches, target arrival, and speed changes.
