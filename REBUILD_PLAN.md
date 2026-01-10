# TACMAP2 REBUILD - MASTER IMPLEMENTATION PLAN

> **LIFE-SAFETY CRITICAL** - Zero blank screens. Zero tolerance for failure.

## Confirmed Environment Variables

```
VITE_MAPTILER_API_KEY=swiqN5kIjjVtREK4cDwI
VITE_MAPTILER_STYLE=(set in Vercel)
REDIS_URL=(Upstash Redis - set in Vercel)
POSTGRES_URL=(Neon PostgreSQL - set in Vercel)
```

**NO Vercel KV** - Using REDIS_URL only for all caching.

---

## PHASE 0: COMPLETE CODE DELETION

**MUST BE DONE FIRST - No legacy code can remain**

### Files to DELETE (48 files):

#### Core Map Components (4 files)
- `client/src/core/MapCore.tsx`
- `client/src/core/MapContainer.tsx`
- `client/src/core/constants.ts`
- `client/src/core/index.ts`

#### Zustand Stores (4 files)
- `client/src/stores/mapStore.ts`
- `client/src/stores/mapProviderStore.ts`
- `client/src/stores/flightControlStore.ts`
- `client/src/stores/index.ts`

#### Map Hooks (8 files)
- `client/src/hooks/useMapEvent.ts`
- `client/src/hooks/useUnifiedAlerts.ts`
- `client/src/hooks/useHeatmap.ts`
- `client/src/hooks/useCameraAnimation.ts`
- `client/src/hooks/useSmartOrbit.ts`
- `client/src/hooks/useFlyToAndOrbit.ts`
- `client/src/hooks/useAnimatedClusterMarkers.ts`
- `client/src/hooks/index.ts` (MODIFY - remove map exports)

#### Map Utilities (2 files)
- `client/src/utils/mapUtils.ts`
- `client/src/utils/easing.ts`

#### Recon Components (6 files)
- `client/src/components/recon/ReconLayout.tsx`
- `client/src/components/recon/AlertsSidebar.tsx`
- `client/src/components/recon/CameraControls.tsx`
- `client/src/components/recon/MapProviderSwitcher.tsx`
- `client/src/components/recon/FlightControlCenter.tsx`
- `client/src/components/recon/index.ts`

#### Flight Control Center (16 files)
- All files in `client/src/components/recon/FlightControlCenter/`

#### Live Layers (1 file)
- `client/src/layers/live/UserLocationLayer.tsx`

#### Pages (1 file)
- `client/src/pages/MapPageNew.tsx`

#### Types (1 file)
- `client/src/types/mapEngine.ts`

#### API Routes - MapTiler Proxy (6 files)
- `api/maptiler/style.ts`
- `api/maptiler/tile.ts`
- `api/maptiler/tilejson.ts`
- `api/maptiler/sprite.ts`
- `api/maptiler/glyph.ts`
- `api/maptiler/cache.ts`

### Files to MODIFY:
- `client/src/App.tsx` - Remove /map route
- `client/src/hooks/index.ts` - Remove map hook exports
- `server/lib/redis.ts` - Remove KV fallback code

---

## PHASE 1: REDIS TILE CACHE INFRASTRUCTURE

### New Files to Create:

#### `server/lib/cache/client.ts`
Redis client singleton with:
- Exponential backoff reconnection
- No KV fallback (REDIS_URL only)
- Never throws errors (returns null)

#### `server/lib/cache/tileCache.ts`
Tile cache operations:
- `getTile(z, x, y)` - Get from Redis
- `setTile(z, x, y, buffer)` - Write with verification
- **PERMANENT storage** - NO TTL, tiles never expire
- Cache key format: `tile:{z}:{x}:{y}`

#### `server/lib/cache/tileQueue.ts`
Race condition prevention:
- Map-based request queue
- Promise coalescing for duplicate requests
- Auto-cleanup after completion

#### `server/lib/cache/metrics.ts`
Metrics tracking:
- redisHits, redisMisses
- maptilerSuccess, maptilerFailures
- awsTerrainSuccess, awsTerrainFailures
- staticFallbacks
- permanentTilesCached

---

## PHASE 2: FORTRESS-GRADE TILE API ENDPOINT

### New File: `api/tiles/[z]/[x]/[y].ts`

5-tier fallback waterfall:

```
Level 0: Plugin Feeds (VITE_PLUGIN_MAP_FEEDS)
    ↓ (if no plugins OR failure)
Level 1: Redis Cache (PERMANENT)
    ↓ (cache miss)
Level 2: MapTiler API (writes to Redis permanently)
    ↓ (API failure OR 403)
Level 3: AWS Terrain Tiles (free, writes to Redis)
    ↓ (AWS failure)
Level 4: Static Fallback Tile (in-memory, CANNOT FAIL)
```

### Key Implementation Details:
- 5 second timeout per source
- 10 second total maximum
- Static fallback tile embedded as base64
- All successful fetches write PERMANENTLY to Redis
- Error logging without throwing
- X-Cache header for debugging

### Vercel Config Update:
```json
{
  "rewrites": [
    { "source": "/api/tiles/:z/:x/:y", "destination": "/api/tiles/[z]/[x]/[y]" }
  ]
}
```

---

## PHASE 3: NEW SIMPLIFIED MAPCORE

### New File: `client/src/core/MapCore.tsx`

Simplified implementation:
- Uses custom raster tiles from `/api/tiles/{z}/{x}/{y}`
- MapTiler SDK for rendering
- Byron Bay default: `[153.6020, -28.6474]`, zoom 12
- Clean React lifecycle with proper cleanup
- Error handlers log only (no retry - backend handles fallbacks)

### New File: `client/src/stores/mapStore.ts`

Minimal store:
- `map: MapTilerMap | null`
- `isLoaded: boolean`
- `isInitializing: boolean`
- `error: Error | null`

### Style Configuration:
```typescript
{
  version: 8,
  sources: {
    'tacmap-tiles': {
      type: 'raster',
      tiles: ['/api/tiles/{z}/{x}/{y}'],
      tileSize: 256
    }
  },
  layers: [{
    id: 'base-layer',
    type: 'raster',
    source: 'tacmap-tiles'
  }]
}
```

---

## PHASE 4: MONITORING & HEALTH SYSTEM

### New API Endpoints:

#### `api/health/index.ts` - GET /api/health
Overall system health status

#### `api/health/redis.ts` - GET /api/health/redis
Redis connectivity and latency

#### `api/health/tiles.ts` - GET /api/health/tiles
Tile system test with sample fetch

#### `api/health/metrics.ts` - GET /api/health/metrics
Detailed metrics dashboard

### Alert Thresholds:
| Metric | Warning | Critical |
|--------|---------|----------|
| Static Fallback Rate | >2% | >5% |
| Cache Hit Rate | <80% | <60% |
| Redis Latency | >100ms | >500ms |

---

## PHASE 5: CACHE PRE-WARMING SYSTEM

### Strategic Locations (Australian Focus):

**Priority 1:**
- Byron Bay (default) - `[153.6020, -28.6474]`
- Sydney - `[151.2093, -33.8688]`
- Melbourne - `[144.9631, -37.8136]`
- Brisbane - `[153.0251, -27.4698]`

**Priority 2:**
- Perth, Adelaide, Hobart
- Nimbin, Maleny (alt lifestyle)

**Priority 3:**
- Darwin, Canberra, Blue Mountains

### New Files:

#### `server/lib/cache/strategicLocations.ts`
Location definitions with priority and radius

#### `server/lib/cache/tileUtils.ts`
- `latLonToTile(lat, lon, zoom)` - Convert coordinates
- `getTilesInRadius(center, radius)` - Get surrounding tiles

#### `server/lib/cache/warmLocation.ts`
- `warmCacheForLocation(location)` - Warm single location

#### `server/lib/cache/warmAll.ts`
- `warmAllStrategicLocations()` - Batch warming

#### `server/lib/cache/checkCoverage.ts`
- `checkLocationCacheCoverage(location)` - Check coverage %
- `checkAllCacheCoverage()` - All locations

#### `server/lib/cache/selectLocation.ts`
- `selectInitialMapLocation()` - Smart default based on coverage

### API Endpoints:

#### `api/cache/warm.ts` - POST /api/cache/warm
Manual cache warming trigger

#### `api/cache/coverage.ts` - GET /api/cache/coverage
Coverage report for all locations

#### `api/cron/warm-cache.ts`
Vercel cron job (every 6 hours)

### Vercel Cron Config:
```json
{
  "crons": [
    { "path": "/api/cron/warm-cache", "schedule": "0 */6 * * *" }
  ]
}
```

---

## PHASE 6: TEST AND DEPLOY

### Pre-Deployment Checklist:

- [ ] All files deleted from Phase 0
- [ ] Redis cache infrastructure working
- [ ] Tile API returning tiles from all fallback levels
- [ ] MapCore rendering with custom tiles
- [ ] Health endpoints responding
- [ ] Cache pre-warming functional
- [ ] Type check passes: `pnpm type-check`
- [ ] Build succeeds: `pnpm build`

### Deployment Steps:

1. Push to main branch
2. Verify Vercel build succeeds
3. Test /api/health endpoints
4. Test map loads at /map
5. Trigger manual cache warm: POST /api/cache/warm
6. Monitor for 24 hours

### Critical Tests:

- [ ] Map loads with fresh browser (no cache)
- [ ] Disconnect Redis → Map still loads (MapTiler fallback)
- [ ] Invalid API key → Map loads (AWS Terrain fallback)
- [ ] All external down → Static fallback tile shown
- [ ] Pan/zoom → Smooth tile loading
- [ ] Cache hit rate >95% after warm-up

---

## FILE STRUCTURE SUMMARY

```
NEW FILES TO CREATE:
├── api/
│   ├── tiles/[z]/[x]/[y].ts      # Fortress tile endpoint
│   ├── health/
│   │   ├── index.ts               # Overall health
│   │   ├── redis.ts               # Redis health
│   │   ├── tiles.ts               # Tile system health
│   │   └── metrics.ts             # Metrics dashboard
│   ├── cache/
│   │   ├── warm.ts                # Manual warming
│   │   └── coverage.ts            # Coverage report
│   └── cron/
│       └── warm-cache.ts          # Scheduled warming
├── server/lib/cache/
│   ├── client.ts                  # Redis client
│   ├── tileCache.ts               # Get/set operations
│   ├── tileQueue.ts               # Race prevention
│   ├── metrics.ts                 # Metrics tracking
│   ├── strategicLocations.ts      # AU locations
│   ├── tileUtils.ts               # Coordinate helpers
│   ├── warmLocation.ts            # Single location warm
│   ├── warmAll.ts                 # Batch warming
│   ├── checkCoverage.ts           # Coverage checks
│   └── selectLocation.ts          # Smart defaults
├── client/src/
│   ├── core/
│   │   └── MapCore.tsx            # New simplified map
│   └── stores/
│       └── mapStore.ts            # Minimal store
└── public/
    └── fallback-tile.png          # Static fallback
```

---

## ENVIRONMENT VARIABLES TO ADD

Add these to Vercel:

```
VITE_DEFAULT_LAT=-28.6474
VITE_DEFAULT_LON=153.6020
VITE_DEFAULT_ZOOM=12
CRON_SECRET=(generate random 32 char)
```

---

## APPROVAL REQUIRED

Please review this plan and confirm:

1. **Delete 48 files** - OK to proceed?
2. **Byron Bay default** - Correct location?
3. **No Vercel KV** - Redis only, correct?
4. **Environment variables** - Will you add the new ones?

Once approved, I will swarm the implementation with parallel agents.
