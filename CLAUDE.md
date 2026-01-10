# TACMAP2 - Claude Code Context

> **CURRENT FOCUS: MapTiler/MapLibre ONLY**
> All development uses MapTiler as the sole map provider. Ignore Mapbox code paths.

## 🚨 FAULT RESPONSE PROTOCOL - TRIGGERS IMMEDIATELY

**WHEN THE USER SAYS ANY OF THESE:**
- "not working" / "doesn't work" / "broken"
- "not updating" / "not showing" / "not appearing"
- "your code is garbage" / "fucking garbage" / any frustration about code
- "still the same" / "nothing changed"
- "why isn't this working"

**YOU MUST IMMEDIATELY:**

1. **STOP. DO NOT GUESS. DO NOT MAKE RANDOM CHANGES.**

2. **RUN THROUGH THE CHECKLISTS BELOW IN ORDER:**
   - Section: "FULL TROUBLESHOOTING CHECKLIST - When Code Changes Don't Work"
   - Section: "UI ELEMENTS NOT SHOWING - Why Your Component Is Invisible"

3. **VERIFY EACH ITEM SYSTEMATICALLY** - don't assume anything

4. **START WITH THE MOST LIKELY CULPRITS:**
   - VITE_ env vars not rebuilt (BAKED AT BUILD TIME)
   - Zustand localStorage caching old values
   - Vercel build cache serving old code
   - Browser cache serving old JS
   - Component not rendering due to conditional/state issue

5. **TEST BEFORE CLAIMING IT'S FIXED:**
   - `curl` the API endpoints directly
   - Check Vercel deployment logs
   - Verify with browser Network tab
   - Force clean rebuild if ANY doubt

**DO NOT PUSH RANDOM FIXES. DIAGNOSE FIRST.**

## Critical Rules

1. **MapTiler Only** - Use MapLibre GL JS with MapTiler tiles exclusively
2. **No Mapbox** - Do not add, modify, or reference Mapbox code
3. **Root Deployment** - App deploys from ROOT directory, not subdirectories
4. **Safe Map Access** - Never access map instance before `isLoaded` is true
5. **Terrain Constraint** - When terrain enabled, prevent vertical shift during pan
6. **NEVER TOUCH `/client/src/flightSim/` FOLDER - THE USER WILL FUCKING MURDER YOU IF YOU EDIT THESE FILES** - This is a separate flight simulator system. DO NOT edit, read, or reference ANY files in this folder unless explicitly asked to "edit the flight simulator". For map camera/orbit controls, ONLY edit `/client/src/components/recon/CameraControls.tsx` and related hooks. **STAY THE FUCK AWAY FROM THE FLIGHT SIMULATOR FOLDER.**
7. **NEVER HARDCODE VARIABLES** - Always use environment variables. Never bypass env vars with hardcoded values. If an env var isn't working, fix the env var configuration, don't hardcode around it.
8. **NEVER OVERCOMPLICATE STATE** - Use ONE state variable when ONE will do. Don't create multiple variables that need to stay in sync (e.g., `isConfirming` + `confirmStep`). Just use `confirmStep > 0` for the boolean check. If you find yourself keeping two variables in sync, YOU ARE DOING IT WRONG. Simplify or die.

## ⚠️ CRITICAL: VITE ENV VARS & VERCEL DEPLOYMENT - READ THIS OR DIE

**THIS CAUSED A 1+ HOUR DISASTER. NEVER FORGET.**

### The Problem
When commits don't seem to take effect, it's almost ALWAYS one of these:

1. **VITE_ env vars are baked at BUILD TIME** - Changing them in Vercel does NOTHING until Vercel REBUILDS the frontend. A redeploy is NOT a rebuild.

2. **Zustand persist caches to localStorage** - The `mapProviderStore` uses `persist` middleware. Even with new code, old values survive in localStorage. Added `version: 2` to force reset - INCREMENT THIS VERSION if you change defaults.

3. **Vercel build cache** - Vercel caches builds. Must explicitly disable cache when redeploying.

### MANDATORY: Force Clean Rebuild
**EVERY TIME you push changes to VITE_ env vars or Zustand store defaults:**

```bash
# From git - creates new file to bust cache
echo "// Build: $(date +%s)" > client/src/buildstamp.ts && git add -A && git commit -m "Force rebuild" && git push
```

**OR in Vercel Dashboard:**
1. Deployments → Click latest → Three dots (⋮) → "Redeploy"
2. **UNCHECK** "Use existing Build Cache"
3. Click "Redeploy"

### When User Says "It's Not Updating"
**FIRST SUSPECT:** VITE_ env vars + build cache. CHECK:
1. Is the env var set correctly in Vercel? (Settings → Environment Variables)
2. Has Vercel actually REBUILT? (Check deployment logs for build output)
3. Is localStorage caching old values? (Increment Zustand persist version)
4. Is browser caching old JS? (Hard refresh: Cmd+Shift+R / Ctrl+Shift+R)

### Files That Use Cached Values
- `client/src/stores/mapProviderStore.ts` - Zustand persist, version must increment on schema changes
- `client/src/core/MapCore.tsx` - Reads VITE_MAPTILER_STYLE and VITE_MAPTILER_API_KEY
- Any file using `import.meta.env.VITE_*` - Baked at build time

**NEVER ASSUME A PUSH = DEPLOYED. VERIFY THE BUILD COMPLETED.**

### FULL TROUBLESHOOTING CHECKLIST - When Code Changes Don't Work

**RUN THROUGH THIS ENTIRE LIST. DO NOT SKIP.**

#### 1. GIT & DEPLOYMENT
- [ ] Did you actually `git push`? Check `git status` - is branch ahead of origin?
- [ ] Is Vercel connected to the correct repo/branch?
- [ ] Did Vercel detect the push? Check Deployments tab for new deployment
- [ ] Did the Vercel BUILD succeed? Check build logs for errors
- [ ] Is the deployment "Ready" status or still "Building"?
- [ ] Is there a deployment queue/delay?

#### 2. VITE ENVIRONMENT VARIABLES (FRONTEND)
- [ ] Are VITE_ env vars set in Vercel Dashboard → Settings → Environment Variables?
- [ ] Are they set for the correct environment (Production/Preview/Development)?
- [ ] Did you REBUILD after changing env vars? (Redeploy with cache OFF)
- [ ] Remember: VITE_ vars are BAKED INTO JS at build time - runtime changes do nothing

#### 3. SERVER ENVIRONMENT VARIABLES (BACKEND)
- [ ] Are non-VITE env vars set in Vercel? (DATABASE_URL, REDIS_URL, etc.)
- [ ] Server env vars work at runtime - but still need redeploy to pick up changes

#### 4. BROWSER CACHING
- [ ] Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
- [ ] Try incognito/private window
- [ ] Clear browser cache completely
- [ ] Check Network tab - is browser serving cached JS files? (look for "from disk cache")

#### 5. LOCALSTORAGE & STATE PERSISTENCE
- [ ] Zustand persist stores data in localStorage
- [ ] Old values survive code changes
- [ ] Increment `version` in persist config to force reset
- [ ] Or manually clear localStorage: `localStorage.clear()` in console
- [ ] Current persist stores: `mapProviderStore` (key: `reconmap-provider`)

#### 6. VERCEL BUILD CACHE
- [ ] Vercel caches node_modules and build output
- [ ] Force clean: Redeploy with "Use existing Build Cache" UNCHECKED
- [ ] Or push a new file: `echo "// $(date +%s)" > client/src/buildstamp.ts`

#### 7. CDN & EDGE CACHING
- [ ] Vercel edge network may cache responses
- [ ] Check response headers for cache status
- [ ] Wait a few minutes for cache invalidation
- [ ] Try adding `?nocache=timestamp` to URLs for testing

#### 8. REDIS CACHE (BACKEND)
- [ ] MapTiler proxy caches tiles/styles in Redis
- [ ] Old cached data may persist after code changes
- [ ] May need to flush Redis cache for certain changes
- [ ] Check Redis connection is working (look for Redis logs in Vercel)

#### 9. API/PROXY ISSUES
- [ ] Is the API endpoint being called? Check Network tab
- [ ] Is the API returning correct data? Check response in Network tab
- [ ] Are there CORS errors? Check Console for CORS messages
- [ ] Is the request URL correct? Log it and verify

#### 10. CODE ISSUES
- [ ] Did you save the file?
- [ ] Is TypeScript compiling? Run `pnpm type-check`
- [ ] Are there import errors? Check browser console
- [ ] Is the code path actually being executed? Add console.log to verify
- [ ] Are you editing the right file? (not a copy, not wrong branch)

#### 11. EXTERNAL SERVICES
- [ ] Is MapTiler API up? Test direct URL: `curl https://api.maptiler.com/maps/STYLE_ID/style.json?key=API_KEY`
- [ ] Is Redis connected? Check Vercel logs for Redis connection messages
- [ ] Is the database accessible? Check for DB connection errors
- [ ] Are third-party APIs responding? Check their status pages

#### 12. TIMING & PROPAGATION
- [ ] DNS propagation can take time
- [ ] CDN cache invalidation can take minutes
- [ ] Vercel deployments take 1-3 minutes to fully propagate
- [ ] Don't test immediately after deploy - wait for "Ready" status

**WHEN IN DOUBT: FORCE CLEAN REBUILD + INCOGNITO + WAIT 2 MINUTES**

### UI ELEMENTS NOT SHOWING - Why Your Component Is Invisible

**CHECK ALL OF THESE:**

#### Rendering Issues
- [ ] Is the component actually imported and used in the parent?
- [ ] Is there a conditional render (`{condition && <Component/>}`) that's false?
- [ ] Is the component returning `null` early due to a guard clause?
- [ ] Is the component inside a fragment that's not being rendered?
- [ ] Check React DevTools - is the component in the tree at all?

#### CSS/Styling Issues
- [ ] `display: none` or `visibility: hidden` applied?
- [ ] `opacity: 0` making it invisible?
- [ ] `z-index` too low - element behind something else?
- [ ] `position: absolute/fixed` with wrong coordinates (off-screen)?
- [ ] `width: 0` or `height: 0` collapsing the element?
- [ ] `overflow: hidden` on parent cutting off the element?
- [ ] Tailwind class not applying? Check for typos, check if class exists
- [ ] `hidden` class applied? (`hidden` = `display: none` in Tailwind)
- [ ] Parent has `pointer-events: none` blocking interaction?

#### Conditional/State Issues
- [ ] State not initialized correctly?
- [ ] State update not triggering re-render? (mutating object instead of new reference)
- [ ] useEffect dependencies wrong - not running when expected?
- [ ] Loading state stuck? Check `isLoading`, `isPending`, `isInitializing` flags
- [ ] Error state hiding content? Check error boundaries

#### Map-Specific UI Issues
- [ ] Map not loaded yet? UI depends on `isLoaded` from `useMapStore`
- [ ] Map container has zero height? Check parent container styles
- [ ] Map controls added but map instance is null?
- [ ] Layer/source not added because map wasn't ready?
- [ ] Popup/marker coordinates are `NaN` or invalid?

#### Layout Issues
- [ ] Flexbox/Grid child being squished? Check `flex-shrink`, `min-width`
- [ ] Absolute positioned element needs `position: relative` on parent?
- [ ] Fixed element inside transformed parent breaks positioning?
- [ ] Mobile responsive hiding? Check `hidden md:block` etc.
- [ ] Container query not matching?

#### Data Issues
- [ ] Data not loaded yet? Check if data is `undefined`/`null`/empty array
- [ ] Mapping over empty array returns nothing (valid but invisible)
- [ ] Data has wrong shape? Check console for undefined property access
- [ ] API returned error instead of data?

**DEBUG STEPS:**
1. Add `console.log('RENDER', props)` at top of component
2. Add temporary `style={{border: '5px solid red'}}` to see if element exists
3. Check React DevTools for component and its props/state
4. Check Elements tab - is the DOM element there but hidden?
5. Check computed styles in Elements tab - what's hiding it?

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
VITE_MAPTILER_STYLE=019ba6b7-5a01-7042-bc9a-d1ace6393958

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
