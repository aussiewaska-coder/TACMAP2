## Mission-Critical Context

**THIS IS LIFE-SAFETY CRITICAL INFRASTRUCTURE**

People depend on this system with their lives. Failure is not an option. A blank screen could mean:
- Emergency responders unable to locate an incident
- Tactical operations losing situational awareness
- Lives lost due to navigation failure

**ZERO TOLERANCE FOR BLANK SCREENS**

There is NO excuse for serving a blank screen. EVER. Under ANY circumstances. This system must be more reliable than commercial mapping services because lives depend on it.

## Executive Summary

This document provides comprehensive requirements and implementation specifications for **COMPLETE REBUILD** of the TacMap mapping system (https://tacmap-2.vercel.app/map) as **critical life-safety infrastructure** with military-grade reliability.

**CRITICAL: This is a full system rebuild from scratch. ALL existing map-related code must be removed and replaced.**

The rebuild implements a fortress-grade, multi-tiered fallback architecture that GUARANTEES map rendering under ALL conditions including complete network outages, API failures, and infrastructure collapse.

## Critical Requirements

### Non-Negotiable Constraints - LIFE SAFETY REQUIREMENTS

1. **ABSOLUTE ZERO BLANK SCREENS**: The map MUST render under ALL circumstances. This is not a performance goal - it is an absolute requirement. No exceptions. No excuses. Lives depend on it.

2. **COMPLETE CODE REPLACEMENT**: Delete ALL existing map rendering code. Start from scratch. The current implementation is fundamentally broken and cannot be salvaged.

3. **FORTRESS-GRADE FALLBACK ARCHITECTURE**: 
   - Redis cache (PRIMARY - fastest response)
   - MapTiler API (SECONDARY - high quality)
   - OpenStreetMap (TERTIARY - always available)
   - Static fallback tile (QUATERNARY - guaranteed success)
   - **ALL sources must have valid, tested tile coverage**

4. **INTELLIGENT CACHE PRE-WARMING**: 
   - Pre-seed Redis with tiles for MULTIPLE strategic locations
   - Rotate between different geographic areas
   - NEVER rely on a single location having cache coverage
   - Initial map load MUST use a location with confirmed Redis coverage

5. **WRITE-THROUGH CACHE VERIFICATION**: 
   - EVERY successful MapTiler/OSM fetch MUST write to Redis
   - Verify write succeeded before returning tile
   - Log cache write failures for monitoring
   - Build up cache coverage organically through usage

6. **RACE CONDITION ELIMINATION**: All race conditions in tile loading must be completely eliminated through proper promise handling and state management

7. **CONTINUOUS AVAILABILITY TESTING**: System must pass automated tests that verify map renders under every failure scenario

## CRITICAL: Complete Code Removal Required

### Step 0: Delete Existing Implementation

**BEFORE starting the rebuild, completely remove:**

1. **All Map Component Files**
   - Any React components related to map rendering
   - Map initialization code
   - Map utility functions
   - Map-related hooks or contexts

2. **All Tile Loading Logic**
   - Existing tile fetch functions
   - Any tile caching attempts
   - Tile source configuration files
   - Map provider integration code

3. **All Map-Related API Routes**
   - `/api/tiles/*` endpoints
   - Any proxy routes for map tiles
   - Map configuration endpoints

4. **All Map Dependencies** (if not used elsewhere)
   - Remove unused map libraries from package.json
   - Clean up map-related types/interfaces
   - Delete map-related utility files

5. **Race Condition Sources**
   - Any asynchronous tile loading without proper promise handling
   - Parallel requests without concurrency control
   - State updates without proper synchronization
   - Event listeners without cleanup

**Verification Checklist:**
- [ ] Search codebase for "map" and verify all map-rendering code is removed
- [ ] Search for "tile" and remove all tile-loading logic
- [ ] Check for any imports of map libraries (mapbox-gl, leaflet, etc.)
- [ ] Verify no leftover API routes for tiles
- [ ] Confirm no race conditions remain in async code
- [ ] Run build to ensure no broken imports remain

**Only after complete removal should you proceed with the new implementation.**

---

## System Architecture

### Tile Source Priority Hierarchy - AUSTRALIA-FIRST + PLUGIN ARCHITECTURE

**CRITICAL: This is an AUSTRALIAN application with support for MULTIPLE custom map feeds via plugin system.**

The system implements a fortress-grade waterfall pattern with **extensible plugin architecture**:

```
Level 0 (PLUGIN FEEDS):  Custom Map URLs - User-configured tile sources (if available)
    ↓ (if no plugins OR plugin failure)
Level 1 (PRIMARY):       Redis Cache - PERMANENT STORAGE, never purged
    ↓ (on cache miss ONLY)
Level 2 (SECONDARY):     MapTiler API - Writes PERMANENTLY to Redis
    ↓ (on API failure OR 403 forbidden)
Level 3 (TERTIARY):      AWS Terrain Tiles (Open Data on AWS) - Free, reliable, writes to Redis
    ↓ (on AWS failure OR timeout)
Level 4 (QUATERNARY):    Static Fallback Tile - GUARANTEED SUCCESS, local file
```

**PLUGIN MAP FEEDS (Level 0):**

The system supports multiple custom tile source URLs that can be configured and prioritized:

```javascript
// Plugin map feed configuration
const PLUGIN_MAP_FEEDS = [
  {
    id: 'custom-feed-1',
    name: 'Custom Topographic Maps',
    enabled: true,
    priority: 1, // Lower number = higher priority
    urlPattern: 'https://custom-tiles.example.com/{z}/{x}/{y}.png',
    headers: {
      'User-Agent': 'TacMap/1.0',
      // Add API key if required
      // 'Authorization': 'Bearer YOUR_TOKEN'
    },
    requiresAuth: false,
    timeout: 5000,
    writesToCache: true // Write successful fetches to Redis permanently
  },
  {
    id: 'custom-feed-2',
    name: 'Satellite Imagery Feed',
    enabled: true,
    priority: 2,
    urlPattern: 'https://satellite.example.com/tiles/{z}/{x}/{y}.jpg',
    headers: {
      'User-Agent': 'TacMap/1.0'
    },
    requiresAuth: false,
    timeout: 5000,
    writesToCache: true
  },
  // Add more custom feeds as needed
];

// Environment variable based plugin configuration
// Supports comma-separated list of tile URL patterns
function loadPluginFeedsFromEnv() {
  const pluginUrls = process.env.VITE_PLUGIN_MAP_FEEDS?.split(',') || [];
  
  return pluginUrls.map((url, index) => ({
    id: `env-plugin-${index}`,
    name: `Plugin Feed ${index + 1}`,
    enabled: true,
    priority: index + 1,
    urlPattern: url.trim(),
    headers: {
      'User-Agent': 'TacMap/1.0 Critical Infrastructure Australia'
    },
    requiresAuth: false,
    timeout: 5000,
    writesToCache: true
  }));
}

// Merge hardcoded and environment-based plugins
const ALL_PLUGIN_FEEDS = [
  ...PLUGIN_MAP_FEEDS,
  ...loadPluginFeedsFromEnv()
].sort((a, b) => a.priority - b.priority);
```

**CRITICAL CHANGES FROM STANDARD ARCHITECTURE:**

1. **Plugin feeds checked FIRST** - Before even checking Redis, try configured plugin sources
2. **Redis tiles are PERMANENT** - Once cached, NEVER deleted, NEVER expire
3. **NO OpenStreetMap** - Use AWS Terrain Tiles instead (shown in your screenshot)
4. **AWS Terrain Tiles** are the free fallback: `s3://elevation-tiles-prod` (public, no auth required)
5. **Australia-centric** - All defaults and strategic locations are Australian
6. **Multiple map feeds** - Support unlimited custom tile sources via configuration

**AWS Terrain Tiles Integration:**
- **Public S3 Bucket**: `arn:aws:s3:::elevation-tiles-prod`
- **No authentication required** - Public open data
- **Tile URL Pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Alternative**: `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png`
- **Maintained by**: Mapzen (Linux Foundation project)
- **License**: Public domain terrain data

**CRITICAL GUARANTEES:**

1. **Level 4 can NEVER fail** - It's a local file that requires no network, no database, no external dependency
2. **Plugin feeds tried FIRST** - Custom map sources get priority before standard sources
3. **Every success writes PERMANENTLY to Redis** - NO TTL, tiles cached forever (plugins, MapTiler, AWS)
4. **Cache writes are verified** - Failed writes are logged but don't block tile delivery
5. **No retry loops** - Each level tries once, then immediately falls through
6. **Total response time cap** - 10 seconds maximum before returning static tile
7. **Redis maxmemory-policy: noeviction** - NEVER purge cached tiles, grow memory as needed
8. **Unlimited plugin feeds** - Add as many custom tile sources as needed

### Cache-Aside Pattern Implementation - VERIFIED WRITE-THROUGH + PLUGIN SUPPORT

Based on critical infrastructure caching patterns with MANDATORY write verification and **plugin map feed support**:

```
1. Application requests tile (z, x, y)

2. TRY PLUGIN MAP FEEDS FIRST (if any configured and enabled):
   a. Iterate through enabled plugin feeds in priority order
   b. For each plugin feed:
      - Construct URL from plugin's urlPattern
      - Fetch with plugin's timeout and headers
      - IF successful:
         * Write to Redis PERMANENTLY (no TTL)
         * VERIFY write succeeded
         * Return tile → SUCCESS PATH
      - IF failed: Try next plugin feed
   c. If all plugins fail: Continue to Level 1

3. LEVEL 1: Check Redis cache with key: `tile:{z}:{x}:{y}`
   IF cache hit → return tile immediately (sub-10ms response) → SUCCESS PATH

4. IF cache miss:
   a. Request from MapTiler/Mapbox API (5 second timeout)
   b. IF API success:
      - Write to Redis PERMANENTLY (no TTL)
      - VERIFY write succeeded (check return value)
      - Log write failure if verification fails
      - Return tile to application → SUCCESS PATH
   c. IF API failure OR timeout:
      - Proceed to AWS Terrain fallback immediately

5. IF API failed:
   a. Request from AWS Terrain Tiles (5 second timeout)
   b. IF AWS success:
      - Write to Redis PERMANENTLY (no TTL)
      - VERIFY write succeeded
      - Log write failure if verification fails
      - Return tile to application → SUCCESS PATH
   c. IF AWS failure OR timeout:
      - Proceed to static fallback immediately

6. IF all external sources failed:
   a. Return static placeholder tile from memory
   b. Log CRITICAL error for monitoring (this should be rare)
   c. Return tile to application → GUARANTEED SUCCESS PATH

TOTAL TIME: Never exceed 10 seconds before returning static tile
```

**Write-Through Verification Code Pattern:**

```javascript
async function cacheVerifiedWrite(key, value, ttl) {
  try {
    const result = await redisClient.set(key, value, { EX: ttl });
    if (result !== 'OK') {
      logCriticalError('Redis write verification failed', { key, result });
      // Don't throw - tile delivery continues
    } else {
      logCacheWrite('success', key, ttl);
    }
  } catch (error) {
    logCriticalError('Redis write exception', { key, error });
    // Don't throw - tile delivery continues
  }
}
```

## Technical Implementation Specifications

### 1. Redis Cache Layer

**IMPORTANT: Use existing infrastructure. Your Redis connection is already configured.**

#### Using Your Existing Redis Setup
The environment already has these variables configured (DO NOT recreate them):
- `REDIS_URL` - Your Redis connection string (already configured)
- Other database and service URLs are already set up

**Your Redis connection code should use the existing `REDIS_URL` environment variable:**

```javascript
import { createClient } from 'redis';

// Use the existing REDIS_URL from your environment
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis: Connected successfully'));

await redisClient.connect();

// CRITICAL: Configure Redis to NEVER evict tiles
// Run this command on your Redis instance:
// CONFIG SET maxmemory-policy noeviction
// This ensures tiles are NEVER purged - cache grows indefinitely
```

#### Configuration Requirements - PERMANENT CACHE (NO EVICTION)
- **TTL Strategy**: NONE - Tiles stored in Redis are PERMANENT, never expire
- **Memory Allocation**: Configure maxmemory-policy as `noeviction` - Redis NEVER purges tiles
- **Key Structure**: `tile:{provider}:{z}:{x}:{y}`
- **Data Format**: Store tiles as binary data (Buffer)
- **Connection Resilience**: Implement connection pooling with automatic reconnection
- **Cache Philosophy**: Redis is the GOLD STANDARD - tiles cached once are preserved forever
- **Memory Scaling**: Plan for Redis memory to grow indefinitely - tiles are permanent assets

#### Cache Performance Targets
- **Cache Hit Ratio**: Target >95% for frequently viewed areas
- **Response Time**: <10ms for cache hits
- **Prefetch Buffer**: Load tiles 1-2 zoom levels adjacent to viewport
- **Initial Seed Area**: Pre-populate tiles for default map location (see section below)

#### Implementation Pattern (Race-Condition Free + Verified Writes)
```javascript
// Tile request queue to prevent race conditions
const tileRequestQueue = new Map();

// Pre-load static fallback tile at startup (NEVER fails)
let STATIC_FALLBACK_TILE_BUFFER;
async function initializeStaticFallback() {
  try {
    const response = await fetch('/fallback-tile.png');
    const arrayBuffer = await response.arrayBuffer();
    STATIC_FALLBACK_TILE_BUFFER = Buffer.from(arrayBuffer);
    console.log('Static fallback tile loaded successfully');
  } catch (error) {
    // CRITICAL: If we can't load static tile, create one in memory
    console.error('Failed to load static fallback, generating in memory');
    STATIC_FALLBACK_TILE_BUFFER = generateEmergencyTile();
  }
}

async function getTile(z, x, y) {
  const cacheKey = `tile:${z}:${x}:${y}`;
  const requestKey = `${z}-${x}-${y}`;
  const startTime = Date.now();
  
  // Check if this tile is already being fetched (prevents race conditions)
  if (tileRequestQueue.has(requestKey)) {
    console.debug(`Tile ${requestKey} already in flight, waiting...`);
    return tileRequestQueue.get(requestKey);
  }
  
  // Create promise for this tile request
  const tilePromise = (async () => {
    try {
      // === LEVEL 1: REDIS CACHE (PRIMARY) ===
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const elapsed = Date.now() - startTime;
          logMetric('tile_source', 'redis_hit', { z, x, y, elapsed });
          return Buffer.from(cached, 'base64');
        }
        logMetric('tile_source', 'redis_miss', { z, x, y });
      } catch (redisError) {
        logError('Redis read failed', { error: redisError, z, x, y });
        // Continue to API - DO NOT THROW
      }
      
      // === LEVEL 2: MAPTILER API (SECONDARY) ===
      try {
        const apiKey = process.env.VITE_MAPTILER_API_KEY;
        const style = process.env.VITE_MAPTILER_STYLE || 'basic-v2';
        const url = `https://api.maptiler.com/maps/${style}/256/${z}/${x}/${y}.png?key=${apiKey}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: { 'User-Agent': 'TacMap/1.0 Critical Infrastructure' }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // VERIFIED WRITE TO REDIS - PERMANENT STORAGE (NO TTL)
          try {
            const writeResult = await redisClient.set(
              cacheKey, 
              buffer.toString('base64')
              // NO TTL - tiles are permanent
            );
            
            if (writeResult === 'OK') {
              logMetric('cache_write', 'success', { source: 'maptiler', z, x, y, permanent: true });
            } else {
              logCriticalError('Redis write verification failed', { 
                source: 'maptiler', 
                result: writeResult, 
                z, x, y 
              });
            }
          } catch (cacheError) {
            logCriticalError('Redis write exception', { 
              source: 'maptiler', 
              error: cacheError, 
              z, x, y 
            });
          }
          
          const elapsed = Date.now() - startTime;
          logMetric('tile_source', 'maptiler_success', { z, x, y, elapsed });
          return buffer;
        } else {
          throw new Error(`MapTiler HTTP ${response.status}`);
        }
      } catch (apiError) {
        logError('MapTiler API failed', { error: apiError, z, x, y });
        // Continue to OSM - DO NOT THROW
      }
      
      // === LEVEL 3: AWS TERRAIN TILES (TERTIARY) ===
      try {
        // AWS Open Data terrain tiles - public, no auth required
        const awsUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(awsUrl, { 
          signal: controller.signal,
          headers: { 
            'User-Agent': 'TacMap/1.0 Critical Infrastructure Australia'
          }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // VERIFIED WRITE TO REDIS - PERMANENT STORAGE (NO TTL)
          try {
            const writeResult = await redisClient.set(
              cacheKey, 
              buffer.toString('base64')
              // NO TTL - tiles are permanent
            );
            
            if (writeResult === 'OK') {
              logMetric('cache_write', 'success', { source: 'aws_terrain', z, x, y, permanent: true });
            } else {
              logCriticalError('Redis write verification failed', { 
                source: 'aws_terrain', 
                result: writeResult, 
                z, x, y 
              });
            }
          } catch (cacheError) {
            logCriticalError('Redis write exception', { 
              source: 'aws_terrain', 
              error: cacheError, 
              z, x, y 
            });
          }
          
          const elapsed = Date.now() - startTime;
          logMetric('tile_source', 'aws_terrain_success', { z, x, y, elapsed });
          return buffer;
        } else {
          throw new Error(`AWS Terrain HTTP ${response.status}`);
        }
      } catch (awsError) {
        logError('AWS Terrain fallback failed', { error: awsError, z, x, y });
        // Continue to static - DO NOT THROW
      }
      
      // === LEVEL 4: STATIC FALLBACK (QUATERNARY - GUARANTEED SUCCESS) ===
      const elapsed = Date.now() - startTime;
      logCriticalError('ALL TILE SOURCES FAILED - Using static fallback', { 
        z, x, y, 
        elapsed,
        message: 'This indicates severe infrastructure issues'
      });
      logMetric('tile_source', 'static_fallback', { z, x, y, elapsed });
      
      // This CANNOT fail - it's a pre-loaded buffer in memory
      return STATIC_FALLBACK_TILE_BUFFER;
      
    } catch (unexpectedError) {
      // THIS SHOULD NEVER HAPPEN - but if it does, we still return something
      logCriticalError('CATASTROPHIC: Unexpected error in tile pipeline', { 
        error: unexpectedError, 
        z, x, y 
      });
      return STATIC_FALLBACK_TILE_BUFFER;
    }
  })();
  
  // Store promise in queue
  tileRequestQueue.set(requestKey, tilePromise);
  
  try {
    const result = await tilePromise;
    return result;
  } finally {
    // Remove from queue after completion (prevents memory leak)
    setTimeout(() => tileRequestQueue.delete(requestKey), 100);
  }
}

// Emergency tile generator (if static file fails to load)
function generateEmergencyTile() {
  // Generate a simple PNG in memory - 256x256 gray tile
  // This is the absolute last resort if even the static file fails
  // Implementation would use a PNG generation library or base64 encoded constant
  return Buffer.from(EMERGENCY_TILE_BASE64, 'base64');
}

// Initialize at application startup
initializeStaticFallback();
```

**NOTE: OSM rate limiting code REMOVED - not using OpenStreetMap, using AWS Terrain Tiles instead (public, no rate limits)**

### 2. Tile Source Configuration

#### Primary Source: MapTiler (Your Existing Setup)
Your environment already has these configured:
- `VITE_MAPTILER_API_KEY` - Your MapTiler API key
- `VITE_MAPTILER_STYLE` - Your map style preference

**Use these existing variables. Do not create new ones.**

```javascript
const mapTilerConfig = {
  apiKey: import.meta.env.VITE_MAPTILER_API_KEY,
  style: import.meta.env.VITE_MAPTILER_STYLE || 'basic-v2',
  baseUrl: 'https://api.maptiler.com/maps'
};

function getMapTilerTileUrl(z, x, y) {
  return `${mapTilerConfig.baseUrl}/${mapTilerConfig.style}/256/${z}/${x}/${y}.png?key=${mapTilerConfig.apiKey}`;
}
```

- **Timeout**: 5 seconds maximum per tile request
- **Retry Strategy**: 2 retries with exponential backoff (200ms, 500ms)
- **Error Handling**: Never throw - always fall through to next tier

#### Secondary Source: OpenStreetMap
- **Endpoint**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Attribution**: MUST include "© OpenStreetMap contributors"
- **Usage Policy**: Respect OSM tile usage policy (set proper User-Agent: "TacMap/1.0 (your@email.com)")
- **Rate Limiting**: Max 2 tiles per second per client (CRITICAL to avoid being blocked)
- **Tile Size**: Standard 256x256 pixels
- **Error Handling**: Never throw - always fall through to static tile

#### Fallback Tile (Ultimate Safety Net)
- **Format**: PNG, 256x256 pixels
- **Content**: Neutral gray (#CCCCCC) with center text "Loading..."
- **Storage**: Store as static asset in `/public/fallback-tile.png`
- **Loading**: Load once at application startup into memory
- **Purpose**: Ensure visual feedback even in complete failure scenarios
- **Guarantee**: This MUST always succeed - it's a local file that never requires network

### 3. Map SDK Integration (Race-Condition Free Implementation)

#### Recommended: Mapbox GL JS v3.x

**Critical: All asynchronous operations must be properly synchronized to prevent race conditions.**

**Implementation Pattern:**
```javascript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize map with custom tile source that routes through your cache API
const map = new mapboxgl.Map({
  container: 'map-container',
  style: {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['/api/tiles/{z}/{x}/{y}'], // Routes through your Redis-first cache
        tileSize: 256,
        maxzoom: 18,
        minzoom: 0
      }
    },
    layers: [{
      id: 'simple-tiles',
      type: 'raster',
      source: 'raster-tiles',
      paint: {}
    }]
  },
  center: [parseFloat(import.meta.env.VITE_DEFAULT_LON), parseFloat(import.meta.env.VITE_DEFAULT_LAT)],
  zoom: parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 12,
  attributionControl: true
});

// Add proper attributions
map.on('load', () => {
  map.addControl(new mapboxgl.AttributionControl({
    customAttribution: '© OpenStreetMap contributors'
  }));
});

// Track tile loading states to prevent race conditions
const tileLoadingState = new Map();

// Error handling - CRITICAL for preventing race conditions
map.on('error', (e) => {
  if (e.error && e.error.message && e.error.message.includes('tiles')) {
    console.error('Tile loading error:', e);
    // Error is handled by backend fallback chain
    // Do not retry here - that creates race conditions
  }
});

// Monitor tile requests for debugging
map.on('dataloading', (e) => {
  if (e.sourceId === 'raster-tiles' && e.tile) {
    const tileKey = `${e.tile.tileID.canonical.z}-${e.tile.tileID.canonical.x}-${e.tile.tileID.canonical.y}`;
    
    // Only log if not already loading (prevents race condition logging spam)
    if (!tileLoadingState.has(tileKey)) {
      tileLoadingState.set(tileKey, Date.now());
      console.debug('Tile requested:', tileKey);
    }
  }
});

map.on('data', (e) => {
  if (e.sourceId === 'raster-tiles' && e.tile && e.dataType === 'source') {
    const tileKey = `${e.tile.tileID.canonical.z}-${e.tile.tileID.canonical.x}-${e.tile.tileID.canonical.y}`;
    
    // Clear loading state
    const startTime = tileLoadingState.get(tileKey);
    if (startTime) {
      const loadTime = Date.now() - startTime;
      console.debug(`Tile loaded: ${tileKey} in ${loadTime}ms`);
      tileLoadingState.delete(tileKey);
    }
  }
});

// Cleanup on unmount (prevents memory leaks and race conditions)
export function cleanupMap() {
  tileLoadingState.clear();
  if (map) {
    map.remove();
  }
}
```

**React Integration (Properly Synchronized):**
```jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export function MapComponent() {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  
  useEffect(() => {
    // Prevent double initialization
    if (mapInstance.current) return;
    
    // Initialize map
    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['/api/tiles/{z}/{x}/{y}'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles'
        }]
      },
      center: [
        parseFloat(import.meta.env.VITE_DEFAULT_LON || '151.2093'),
        parseFloat(import.meta.env.VITE_DEFAULT_LAT || '-33.8688')
      ],
      zoom: parseInt(import.meta.env.VITE_DEFAULT_ZOOM || '12')
    });
    
    // Cleanup function - CRITICAL for preventing memory leaks
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Empty dependency array - only run once
  
  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
```

### 4. Initial Map Location & Strategic Cache Pre-Warming

**CRITICAL: Never rely on a single location. Implement intelligent multi-location strategy.**

#### Strategic Location Pool Configuration

```javascript
// Define strategic locations with operational priority
const STRATEGIC_LOCATIONS = [
  // Priority 1: Primary operational areas
  { 
    id: 'sydney', 
    name: 'Sydney, Australia', 
    lat: -33.8688, 
    lon: 151.2093, 
    priority: 1,
    radius: 3 // tiles in each direction
  },
  
  // Priority 2: Major metropolitan centers
  { 
    id: 'newyork', 
    name: 'New York, USA', 
    lat: 40.7128, 
    lon: -74.0060, 
    priority: 2,
    radius: 3
  },
  { 
    id: 'london', 
    name: 'London, UK', 
    lat: 51.5074, 
    lon: -0.1278, 
    priority: 2,
    radius: 3
  },
  { 
    id: 'tokyo', 
    name: 'Tokyo, Japan', 
    lat: 35.6762, 
    lon: 139.6503, 
    priority: 2,
    radius: 3
  },
  
  // Priority 3: Strategic global coverage
  { 
    id: 'dubai', 
    name: 'Dubai, UAE', 
    lat: 25.2048, 
    lon: 55.2708, 
    priority: 3,
    radius: 2
  },
  { 
    id: 'singapore', 
    name: 'Singapore', 
    lat: 1.3521, 
    lon: 103.8198, 
    priority: 3,
    radius: 2
  },
  { 
    id: 'losangeles', 
    name: 'Los Angeles, USA', 
    lat: 34.0522, 
    lon: -118.2437, 
    priority: 3,
    radius: 2
  },
  { 
    id: 'berlin', 
    name: 'Berlin, Germany', 
    lat: 52.5200, 
    lon: 13.4050, 
    priority: 3,
    radius: 2
  },
  { 
    id: 'mumbai', 
    name: 'Mumbai, India', 
    lat: 19.0760, 
    lon: 72.8777, 
    priority: 3,
    radius: 2
  },
  { 
    id: 'saopaulo', 
    name: 'São Paulo, Brazil', 
    lat: -23.5505, 
    lon: -46.6333, 
    priority: 3,
    radius: 2
  }
];
```

#### Comprehensive Cache Pre-Warming

```javascript
// Pre-warm cache for ALL strategic locations
async function warmAllStrategicLocations() {
  console.log('Starting comprehensive cache pre-warming...');
  
  const results = [];
  
  for (const location of STRATEGIC_LOCATIONS) {
    console.log(`Pre-warming ${location.name}...`);
    
    const result = await warmCacheForLocation(
      location.lat, 
      location.lon, 
      12, // zoom level
      location.radius
    );
    
    results.push({
      ...location,
      tilesCached: result.tilesCached,
      successRate: result.successRate,
      duration: result.duration
    });
    
    console.log(`${location.name}: ${result.tilesCached} tiles cached (${result.successRate}%)`);
  }
  
  // Summary report
  const totalTiles = results.reduce((sum, r) => sum + r.tilesCached, 0);
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  CACHE PRE-WARMING COMPLETE                               ║
╠═══════════════════════════════════════════════════════════╣
║  Total Locations:  ${STRATEGIC_LOCATIONS.length.toString().padEnd(40)}║
║  Total Tiles Cached: ${totalTiles.toString().padEnd(38)}║
║  Global Coverage:  OPERATIONAL                            ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  return results;
}

async function warmCacheForLocation(centerLat, centerLon, zoom, radius) {
  const startTime = Date.now();
  const centerTile = latLonToTile(centerLat, centerLon, zoom);
  const tilesToCache = [];
  
  // Generate tile coordinates for viewport + buffer
  for (let x = centerTile.x - radius; x <= centerTile.x + radius; x++) {
    for (let y = centerTile.y - radius; y <= centerTile.y + radius; y++) {
      tilesToCache.push({ z: zoom, x, y });
    }
  }
  
  console.log(`  Caching ${tilesToCache.length} tiles...`);
  
  // Fetch tiles with concurrency control (max 10 concurrent)
  const results = [];
  for (let i = 0; i < tilesToCache.length; i += 10) {
    const batch = tilesToCache.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(tile => getTile(tile.z, tile.x, tile.y))
    );
    results.push(...batchResults);
    
    // Progress update
    const progress = Math.min(100, Math.round(((i + 10) / tilesToCache.length) * 100));
    process.stdout.write(`\r  Progress: ${progress}%`);
  }
  process.stdout.write('\n');
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const successRate = Math.round((successful / results.length) * 100);
  const duration = Date.now() - startTime;
  
  return {
    tilesCached: successful,
    totalTiles: results.length,
    successRate,
    duration
  };
}

// Helper: Convert lat/lon to tile coordinates
function latLonToTile(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}
```

#### Intelligent Initial Location Selection

```javascript
// Select best initial location based on cache coverage
async function selectInitialMapLocation() {
  console.log('Determining best initial map location...');
  
  const coverageResults = await Promise.all(
    STRATEGIC_LOCATIONS.map(async (loc) => {
      const coverage = await checkLocationCacheCoverage(loc.lat, loc.lon, 12);
      return {
        ...loc,
        cacheCoverage: coverage.percentage,
        cachedTiles: coverage.cachedCount,
        totalTiles: coverage.totalTiles
      };
    })
  );
  
  // Sort by: cache coverage first, then priority
  const sorted = coverageResults.sort((a, b) => {
    if (Math.abs(a.cacheCoverage - b.cacheCoverage) < 10) {
      // Similar coverage, use priority
      return a.priority - b.priority;
    }
    // Different coverage, prefer better coverage
    return b.cacheCoverage - a.cacheCoverage;
  });
  
  const selected = sorted[0];
  
  console.log(`
Selected initial location: ${selected.name}
  Cache Coverage: ${selected.cacheCoverage}%
  Cached Tiles: ${selected.cachedTiles}/${selected.totalTiles}
  Priority Level: ${selected.priority}
  `);
  
  return {
    lat: selected.lat,
    lon: selected.lon,
    zoom: 12,
    name: selected.name
  };
}

async function checkLocationCacheCoverage(lat, lon, zoom) {
  const centerTile = latLonToTile(lat, lon, zoom);
  const testRadius = 2;
  const testTiles = [];
  
  for (let x = centerTile.x - testRadius; x <= centerTile.x + testRadius; x++) {
    for (let y = centerTile.y - testRadius; y <= centerTile.y + testRadius; y++) {
      testTiles.push({ z: zoom, x, y });
    }
  }
  
  const results = await Promise.all(
    testTiles.map(async (tile) => {
      const key = `tile:${tile.z}:${tile.x}:${tile.y}`;
      try {
        const exists = await redisClient.exists(key);
        return exists === 1;
      } catch (error) {
        return false;
      }
    })
  );
  
  const cachedCount = results.filter(Boolean).length;
  const percentage = Math.round((cachedCount / testTiles.length) * 100);
  
  return {
    cachedCount,
    totalTiles: testTiles.length,
    percentage
  };
}
```

#### Continuous Background Cache Maintenance

```javascript
// Run periodically to maintain cache coverage
async function maintainCacheAcrossLocations() {
  console.log('Starting cache maintenance cycle...');
  
  for (const location of STRATEGIC_LOCATIONS) {
    const coverage = await checkLocationCacheCoverage(location.lat, location.lon, 12);
    
    if (coverage.percentage < 80) {
      console.log(`${location.name} coverage low (${coverage.percentage}%), refreshing...`);
      await warmCacheForLocation(location.lat, location.lon, 12, location.radius);
    } else {
      console.log(`${location.name} coverage good (${coverage.percentage}%)`);
    }
  }
  
  console.log('Cache maintenance cycle complete');
}

// Schedule maintenance every 6 hours
setInterval(maintainCacheAcrossLocations, 6 * 60 * 60 * 1000);
```

### 5. Error Handling & Monitoring - MISSION CRITICAL

#### Comprehensive Logging with Severity Levels

```javascript
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

function logMetric(category, event, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    category,
    event,
    ...data
  };
  
  // Send to monitoring system (Datadog, New Relic, etc.)
  sendToMonitoring(logEntry);
  
  // Also log to console for debugging
  console.log(`[${category}] ${event}:`, data);
}

function logError(message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    message,
    ...data
  };
  
  console.error(`[ERROR] ${message}:`, data);
  sendToMonitoring(logEntry);
}

function logCriticalError(message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.CRITICAL,
    message,
    ...data
  };
  
  // CRITICAL errors should trigger alerts
  console.error(`[CRITICAL] ${message}:`, data);
  sendToMonitoring(logEntry);
  triggerAlert('CRITICAL_ERROR', { message, ...data });
}

// Real-time tile metrics tracking
const tileMetrics = {
  redisHits: 0,
  redisMisses: 0,
  pluginSuccess: 0,
  pluginFailures: 0,
  mapTilerSuccess: 0,
  mapTilerFailures: 0,
  awsTerrainSuccess: 0,
  awsTerrainFailures: 0,
  staticFallbacks: 0,
  totalRequests: 0,
  cacheWriteSuccesses: 0,
  cacheWriteFailures: 0,
  permanentTilesCached: 0  // Tiles stored forever in Redis
};

function updateMetrics(source, success) {
  tileMetrics.totalRequests++;
  
  switch(source) {
    case 'redis_hit':
      tileMetrics.redisHits++;
      break;
    case 'redis_miss':
      tileMetrics.redisMisses++;
      break;
    case 'plugin_success':
      tileMetrics.pluginSuccess++;
      tileMetrics.permanentTilesCached++;
      break;
    case 'plugin_failure':
      tileMetrics.pluginFailures++;
      break;
    case 'maptiler_success':
      tileMetrics.mapTilerSuccess++;
      tileMetrics.permanentTilesCached++;
      break;
    case 'maptiler_failure':
      tileMetrics.mapTilerFailures++;
      break;
    case 'aws_terrain_success':
      tileMetrics.awsTerrainSuccess++;
      tileMetrics.permanentTilesCached++;
      break;
    case 'aws_terrain_failure':
      tileMetrics.awsTerrainFailures++;
      break;
    case 'static_fallback':
      tileMetrics.staticFallbacks++;
      break;
  }
  
  // Report metrics every 100 requests
  if (tileMetrics.totalRequests % 100 === 0) {
    reportMetrics();
  }
}

function reportMetrics() {
  const cacheHitRate = (tileMetrics.redisHits / tileMetrics.totalRequests * 100).toFixed(2);
  const pluginSuccessRate = tileMetrics.pluginSuccess + tileMetrics.mapTilerSuccess + tileMetrics.awsTerrainSuccess;
  const staticFallbackRate = (tileMetrics.staticFallbacks / tileMetrics.totalRequests * 100).toFixed(2);
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  TILE SYSTEM METRICS (Last ${tileMetrics.totalRequests} requests)              ║
╠═══════════════════════════════════════════════════════════╣
║  Redis Hit Rate:       ${cacheHitRate}%                              ║
║  Redis Hits:           ${tileMetrics.redisHits.toString().padEnd(35)}║
║  Redis Misses:         ${tileMetrics.redisMisses.toString().padEnd(35)}║
║                                                           ║
║  Plugin Feed Success:  ${tileMetrics.pluginSuccess.toString().padEnd(35)}║
║  Plugin Feed Failures: ${tileMetrics.pluginFailures.toString().padEnd(35)}║
║                                                           ║
║  MapTiler Success:     ${tileMetrics.mapTilerSuccess.toString().padEnd(35)}║
║  MapTiler Failures:    ${tileMetrics.mapTilerFailures.toString().padEnd(35)}║
║                                                           ║
║  AWS Terrain Success:  ${tileMetrics.awsTerrainSuccess.toString().padEnd(35)}║
║  AWS Terrain Failures: ${tileMetrics.awsTerrainFailures.toString().padEnd(35)}║
║                                                           ║
║  Static Fallbacks:     ${tileMetrics.staticFallbacks.toString().padEnd(35)}║
║  Static Fallback Rate: ${staticFallbackRate}%                            ║
║                                                           ║
║  Permanent Tiles:      ${tileMetrics.permanentTilesCached.toString().padEnd(35)}║
║  (NEVER expire)                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Send to monitoring dashboard
  sendToMonitoring({
    type: 'metrics_summary',
    timestamp: new Date().toISOString(),
    ...tileMetrics,
    cacheHitRate: parseFloat(cacheHitRate),
    staticFallbackRate: parseFloat(staticFallbackRate)
  });
}
```

#### Health Checks - LIFE SAFETY CRITICAL

```javascript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TacMap Critical Infrastructure'
  });
});

app.get('/health/redis', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({
      status: 'healthy',
      connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      connected: false,
      error: error.message,
      impact: 'System will fallback to API and OSM',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/tiles', async (req, res) => {
  const testTile = { z: 12, x: 2048, y: 1024 }; // Sydney area
  const startTime = Date.now();
  
  try {
    await getTile(testTile.z, testTile.x, testTile.y);
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      test: 'passed',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      test: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/metrics', (req, res) => {
  const cacheHitRate = tileMetrics.totalRequests > 0
    ? (tileMetrics.redisHits / tileMetrics.totalRequests * 100).toFixed(2)
    : 0;
  
  const staticFallbackRate = tileMetrics.totalRequests > 0
    ? (tileMetrics.staticFallbacks / tileMetrics.totalRequests * 100).toFixed(2)
    : 0;
  
  res.json({
    status: 'ok',
    metrics: {
      ...tileMetrics,
      cacheHitRate: parseFloat(cacheHitRate),
      staticFallbackRate: parseFloat(staticFallbackRate)
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health/cache-coverage', async (req, res) => {
  const coverageResults = await Promise.all(
    STRATEGIC_LOCATIONS.map(async (loc) => {
      const coverage = await checkLocationCacheCoverage(loc.lat, loc.lon, 12);
      return {
        location: loc.name,
        coverage: coverage.percentage,
        cachedTiles: coverage.cachedCount,
        totalTiles: coverage.totalTiles
      };
    })
  );
  
  res.json({
    status: 'ok',
    locations: coverageResults,
    timestamp: new Date().toISOString()
  });
});
```

#### Alert Thresholds - AUTOMATED MONITORING

```javascript
// Monitor metrics and trigger alerts
setInterval(() => {
  const cacheHitRate = tileMetrics.totalRequests > 0
    ? (tileMetrics.redisHits / tileMetrics.totalRequests * 100)
    : 100;
  
  const staticFallbackRate = tileMetrics.totalRequests > 0
    ? (tileMetrics.staticFallbacks / tileMetrics.totalRequests * 100)
    : 0;
  
  const apiFailureRate = tileMetrics.totalRequests > 0
    ? ((tileMetrics.mapTilerFailures + tileMetrics.osmFailures) / tileMetrics.totalRequests * 100)
    : 0;
  
  // CRITICAL: Static fallback being used
  if (staticFallbackRate > 5) {
    triggerAlert('CRITICAL', {
      message: 'Static fallback usage exceeds 5%',
      staticFallbackRate: `${staticFallbackRate.toFixed(2)}%`,
      impact: 'All external tile sources are failing',
      action: 'Investigate Redis, MapTiler, and OSM connectivity immediately'
    });
  }
  
  // WARNING: Cache hit rate low
  if (cacheHitRate < 80) {
    triggerAlert('WARNING', {
      message: 'Cache hit rate below 80%',
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      action: 'Review cache pre-warming strategy and Redis memory'
    });
  }
  
  // WARNING: API failure rate high
  if (apiFailureRate > 10) {
    triggerAlert('WARNING', {
      message: 'API failure rate exceeds 10%',
      apiFailureRate: `${apiFailureRate.toFixed(2)}%`,
      action: 'Check MapTiler API status and quotas'
    });
  }
  
  // INFO: System health check
  if (tileMetrics.totalRequests % 1000 === 0 && tileMetrics.totalRequests > 0) {
    logMetric('health_check', 'system_healthy', {
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      staticFallbackRate: `${staticFallbackRate.toFixed(2)}%`,
      totalRequests: tileMetrics.totalRequests
    });
  }
  
}, 60000); // Check every minute

function triggerAlert(severity, details) {
  const alert = {
    severity,
    timestamp: new Date().toISOString(),
    system: 'TacMap Critical Infrastructure',
    ...details
  };
  
  console.log(`[ALERT ${severity}]`, alert);
  
  // Send to alerting system (PagerDuty, Opsgenie, etc.)
  sendToAlertingSystem(alert);
  
  // For CRITICAL alerts, also send SMS/push notifications
  if (severity === 'CRITICAL') {
    sendEmergencyNotification(alert);
  }
}
```

### 6. Performance Optimization

#### Client-Side Strategies
1. **Tile Prioritization**: Load visible tiles before prefetching
2. **Request Coalescing**: Batch multiple tile requests
3. **Viewport Prediction**: Prefetch tiles in pan direction
4. **Zoom-Level Management**: Cache tiles at multiple zoom levels

#### Server-Side Optimizations
1. **Connection Pooling**: Reuse Redis connections
2. **Parallel Fetching**: Request multiple tiles simultaneously (max 6 concurrent)
3. **Response Compression**: Enable gzip for tile transfers
4. **CDN Integration**: Consider Cloudflare for global tile distribution

#### Memory Management
- **Redis Memory Limit**: Set appropriate maxmemory (e.g., 2GB)
- **Eviction Policy**: Use `allkeys-lru` to automatically remove least-used tiles
- **Monitoring**: Track Redis memory usage and adjust limits as needed

### 7. Testing Requirements

#### Unit Tests
- ✓ Redis cache hit/miss behavior
- ✓ Fallback chain execution
- ✓ Error handling for each tile source
- ✓ Tile coordinate calculations

#### Integration Tests
- ✓ End-to-end tile loading with all sources
- ✓ Redis connection failure recovery
- ✓ API timeout handling
- ✓ Cache pre-warming functionality

#### Load Tests
- ✓ Simulate 100+ concurrent users
- ✓ Measure cache hit ratio under load
- ✓ Verify no blank tiles under stress
- ✓ Test Redis memory management

#### User Acceptance Criteria
1. Map loads within 2 seconds on initial page load
2. No visible blank tiles during normal operation
3. Graceful degradation when services are unavailable
4. Clear visual feedback during tile loading
5. Smooth panning and zooming experience

## Implementation Checklist

### Phase 0: Complete Code Removal (MUST BE DONE FIRST)
- [ ] **Delete all existing map component files**
- [ ] **Delete all tile loading/caching logic**
- [ ] **Remove all map-related API routes**
- [ ] **Search and destroy all race conditions in async code**
- [ ] **Remove unused map dependencies from package.json**
- [ ] **Verify build succeeds with no map-related imports**
- [ ] **Git commit the deletion: "Remove broken map implementation"**

### Phase 1: Core Infrastructure (Redis-First)
- [ ] Set up Redis instance with proper configuration
- [ ] Implement cache-aside pattern for tile retrieval
- [ ] Create fallback waterfall logic
- [ ] Add static fallback tile asset
- [ ] Implement comprehensive error handling

### Phase 2: Map Integration (From Scratch)
- [ ] Install fresh map SDK (Mapbox GL JS v3.x recommended)
- [ ] Create NEW map component with proper cleanup hooks
- [ ] Configure custom tile source pointing to `/api/tiles/{z}/{x}/{y}`
- [ ] Set default center using VITE_DEFAULT_LAT and VITE_DEFAULT_LON
- [ ] Add error event handlers (but don't retry - backend handles it)
- [ ] Implement proper React useEffect with cleanup
- [ ] Verify no race conditions in component lifecycle
- [ ] Test map initialization and rendering

### Phase 3: Monitoring & Optimization
- [ ] Set up logging for all tile requests
- [ ] Create health check endpoints
- [ ] Implement performance metrics collection
- [ ] Configure alerts for critical failures
- [ ] Optimize Redis memory usage

### Phase 4: Testing & Validation - ZERO FAILURE TOLERANCE

#### Mission-Critical Test Suite

**Every test must pass. No exceptions. Lives depend on it.**

```javascript
// Comprehensive test suite
describe('TacMap Critical Infrastructure Tests', () => {
  
  describe('LEVEL 1: Tile Delivery Guarantee', () => {
    test('MUST return a tile under ALL circumstances', async () => {
      // This is THE most important test
      // It must NEVER fail
      const tile = await getTile(12, 2048, 1024);
      expect(tile).toBeDefined();
      expect(tile).toBeInstanceOf(Buffer);
      expect(tile.length).toBeGreaterThan(0);
    });
    
    test('MUST return tile when Redis is down', async () => {
      // Simulate Redis failure
      redisClient.get = jest.fn().mockRejectedValue(new Error('Redis down'));
      
      const tile = await getTile(12, 2048, 1024);
      expect(tile).toBeDefined();
      expect(tile).toBeInstanceOf(Buffer);
    });
    
    test('MUST return tile when MapTiler API fails', async () => {
      // Simulate Redis miss + API failure
      redisClient.get = jest.fn().mockResolvedValue(null);
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 }) // MapTiler fails
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => OSM_TILE_BUFFER }); // OSM succeeds
      
      const tile = await getTile(12, 2048, 1024);
      expect(tile).toBeDefined();
      expect(tile).toBeInstanceOf(Buffer);
    });
    
    test('MUST return tile when both API and OSM fail', async () => {
      // Simulate all external sources failing
      redisClient.get = jest.fn().mockResolvedValue(null);
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 }) // MapTiler fails
        .mockResolvedValueOnce({ ok: false, status: 503 }); // OSM fails
      
      const tile = await getTile(12, 2048, 1024);
      expect(tile).toBeDefined();
      expect(tile).toBeInstanceOf(Buffer);
      expect(tile).toEqual(STATIC_FALLBACK_TILE_BUFFER);
    });
    
    test('MUST return tile when network is completely offline', async () => {
      // Simulate complete network failure
      redisClient.get = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const tile = await getTile(12, 2048, 1024);
      expect(tile).toBeDefined();
      expect(tile).toEqual(STATIC_FALLBACK_TILE_BUFFER);
    });
  });
  
  describe('LEVEL 2: Cache Write Verification', () => {
    test('MUST write to Redis after successful MapTiler fetch', async () => {
      redisClient.get = jest.fn().mockResolvedValue(null);
      redisClient.set = jest.fn().mockResolvedValue('OK');
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => MAPTILER_TILE_BUFFER
      });
      
      await getTile(12, 2048, 1024);
      
      expect(redisClient.set).toHaveBeenCalledWith(
        'tile:12:2048:1024',
        expect.any(String),
        { EX: 86400 }
      );
    });
    
    test('MUST write to Redis after successful OSM fetch', async () => {
      redisClient.get = jest.fn().mockResolvedValue(null);
      redisClient.set = jest.fn().mockResolvedValue('OK');
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 }) // MapTiler fails
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => OSM_TILE_BUFFER }); // OSM succeeds
      
      await getTile(12, 2048, 1024);
      
      expect(redisClient.set).toHaveBeenCalledWith(
        'tile:12:2048:1024',
        expect.any(String),
        { EX: 43200 }
      );
    });
    
    test('MUST log error when cache write fails but still return tile', async () => {
      const logSpy = jest.spyOn(console, 'error');
      redisClient.get = jest.fn().mockResolvedValue(null);
      redisClient.set = jest.fn().mockResolvedValue('ERROR'); // Write fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => MAPTILER_TILE_BUFFER
      });
      
      const tile = await getTile(12, 2048, 1024);
      
      expect(tile).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL]'),
        expect.objectContaining({ source: 'maptiler' })
      );
    });
  });
  
  describe('LEVEL 3: Race Condition Prevention', () => {
    test('MUST NOT make duplicate requests for same tile', async () => {
      redisClient.get = jest.fn().mockResolvedValue(null);
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => MAPTILER_TILE_BUFFER
      });
      global.fetch = fetchSpy;
      
      // Request same tile 10 times simultaneously
      const promises = Array(10).fill().map(() => getTile(12, 2048, 1024));
      await Promise.all(promises);
      
      // Fetch should only be called ONCE
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    
    test('MUST properly cleanup tile request queue', async () => {
      await getTile(12, 2048, 1024);
      
      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(tileRequestQueue.size).toBe(0);
    });
  });
  
  describe('LEVEL 4: Strategic Location Coverage', () => {
    test('ALL strategic locations MUST have cache coverage', async () => {
      for (const location of STRATEGIC_LOCATIONS) {
        const coverage = await checkLocationCacheCoverage(
          location.lat, 
          location.lon, 
          12
        );
        
        expect(coverage.percentage).toBeGreaterThan(0);
        console.log(`${location.name}: ${coverage.percentage}% coverage`);
      }
    });
    
    test('Initial location selection MUST return a cached location', async () => {
      const selected = await selectInitialMapLocation();
      
      expect(selected).toBeDefined();
      expect(selected.lat).toBeDefined();
      expect(selected.lon).toBeDefined();
      
      const coverage = await checkLocationCacheCoverage(
        selected.lat,
        selected.lon,
        12
      );
      
      expect(coverage.percentage).toBeGreaterThan(50);
    });
  });
  
  describe('LEVEL 5: Performance Requirements', () => {
    test('Cache hit MUST respond in under 50ms', async () => {
      redisClient.get = jest.fn().mockResolvedValue(CACHED_TILE_BASE64);
      
      const startTime = Date.now();
      await getTile(12, 2048, 1024);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(50);
    });
    
    test('Static fallback MUST respond in under 10ms', async () => {
      // Simulate all sources failing
      redisClient.get = jest.fn().mockRejectedValue(new Error('Down'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Down'));
      
      const startTime = Date.now();
      await getTile(12, 2048, 1024);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(10);
    });
  });
  
  describe('LEVEL 6: Map Rendering Integration', () => {
    test('Map component MUST render without errors', () => {
      const { container } = render(<MapComponent />);
      expect(container.querySelector('.mapboxgl-canvas')).toBeInTheDocument();
    });
    
    test('Map MUST NOT show blank screen on mount', async () => {
      const { container } = render(<MapComponent />);
      
      await waitFor(() => {
        const canvas = container.querySelector('.mapboxgl-canvas');
        expect(canvas).toBeInTheDocument();
        // Canvas should have dimensions
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      });
    });
    
    test('Map MUST cleanup on unmount (no memory leaks)', () => {
      const { unmount } = render(<MapComponent />);
      
      expect(mapInstance.current).toBeDefined();
      
      unmount();
      
      expect(mapInstance.current).toBeNull();
    });
  });
  
  describe('LEVEL 7: Health Monitoring', () => {
    test('Health endpoint MUST return 200', async () => {
      const response = await fetch('/health');
      expect(response.status).toBe(200);
    });
    
    test('Metrics MUST be tracked correctly', async () => {
      // Reset metrics
      Object.keys(tileMetrics).forEach(key => tileMetrics[key] = 0);
      
      // Make requests
      await getTile(12, 2048, 1024); // Redis hit
      await getTile(12, 2049, 1024); // Redis miss + API
      
      expect(tileMetrics.totalRequests).toBe(2);
      expect(tileMetrics.redisHits + tileMetrics.redisMisses).toBe(2);
    });
  });
});
```

#### Manual Testing Checklist

**EVERY item must be verified before deployment:**

- [ ] Load map with fresh browser (no cache) → Should show cached location
- [ ] Load map with dev tools network tab → Verify tiles loading
- [ ] Disconnect Redis → Map should still load using API
- [ ] Invalidate API key → Map should fallback to OSM
- [ ] Block OSM domain in /etc/hosts → Map should show static tiles
- [ ] Disable network entirely → Map should show cached tiles (if any)
- [ ] Clear Redis cache → Run pre-warming → Verify all locations cached
- [ ] Check metrics endpoint → Verify cache hit rate >95%
- [ ] Pan map around → Verify smooth tile loading
- [ ] Zoom in/out rapidly → Verify no blank tiles
- [ ] Open 10 browser tabs → Verify no race conditions
- [ ] Leave map open for 1 hour → Verify no memory leaks
- [ ] Kill Redis mid-session → Map should continue working
- [ ] Restart application → Cache coverage should persist

### Phase 5: Deployment & Verification
- [ ] Verify Redis is accessible in production environment
- [ ] Deploy tile API routes to production
- [ ] Deploy new map component to production
- [ ] Run cache pre-warming script for default location
- [ ] Enable monitoring and alerting
- [ ] Perform smoke tests: Load map, pan, zoom
- [ ] **Critical Test**: Disconnect network mid-session → Should show cached tiles
- [ ] **Critical Test**: Invalid API key → Should fall back gracefully
- [ ] Monitor logs for first 24 hours
- [ ] Verify ZERO blank screen incidents
- [ ] Document operational procedures

### Phase 6: Performance Optimization (Post-Launch)
- [ ] Analyze cache hit ratio (target >95%)
- [ ] Identify hotspot tiles and pre-warm cache
- [ ] Optimize Redis memory usage
- [ ] Consider CDN for static fallback tile
- [ ] Implement tile prefetching for viewport prediction

## Environment Configuration

**IMPORTANT: Your environment already has these configured. Use the existing variables.**

```env
# === ALREADY CONFIGURED - DO NOT RECREATE ===

# Map Tile Sources (Use ONE of these as primary)
VITE_MAPTILER_API_KEY=<your_existing_key>
VITE_MAPTILER_STYLE=<your_existing_style>
VITE_MAPBOX_ACCESS_TOKEN=<your_existing_token>
VITE_MAPBOX_STYLE_ID=<your_existing_style_id>

# Redis Configuration (CRITICAL - Use this existing URL)
REDIS_URL=<your_existing_redis_url>

# Default Map View - AUSTRALIAN FOCUS (Byron Bay default)
VITE_DEFAULT_LAT=-28.6474    # Byron Bay, NSW
VITE_DEFAULT_LON=153.6020    # Byron Bay, NSW
VITE_DEFAULT_ZOOM=12

# AWS Terrain Tiles (Free fallback - no auth required)
VITE_AWS_TERRAIN_URL=https://s3.amazonaws.com/elevation-tiles-prod/terrarium

# Plugin Map Feeds - Comma-separated list of custom tile URLs
# Supports {z}, {x}, {y} placeholders
# Example: https://custom-tiles.example.com/{z}/{x}/{y}.png,https://satellite.example.com/tiles/{z}/{x}/{y}.jpg
VITE_PLUGIN_MAP_FEEDS=

# Tile Cache Settings - PERMANENT STORAGE
VITE_TILE_CACHE_PERMANENT=true  # Never expire tiles
```

**Example Plugin Feed Configuration:**

```env
# Multiple custom tile sources
VITE_PLUGIN_MAP_FEEDS=https://tiles.custom-provider.com/v1/{z}/{x}/{y}.png,https://imagery.example.com/tiles/{z}/{x}/{y}.jpg,https://topo.maps.com/{z}/{x}/{y}.png

# Or in your code, configure programmatically:
const PLUGIN_MAP_FEEDS = [
  {
    id: 'custom-topo',
    name: 'Custom Topographic',
    enabled: true,
    priority: 1,
    urlPattern: 'https://topo.example.com/{z}/{x}/{y}.png',
    headers: {
      'User-Agent': 'TacMap/1.0',
      'Authorization': 'Bearer YOUR_API_KEY' // If required
    },
    timeout: 5000,
    writesToCache: true
  },
  {
    id: 'satellite-feed',
    name: 'Satellite Imagery',
    enabled: true,
    priority: 2,
    urlPattern: 'https://sat.example.com/tiles/{z}/{x}/{y}.jpg',
    headers: {
      'User-Agent': 'TacMap/1.0'
    },
    timeout: 5000,
    writesToCache: true
  }
];
```

**CRITICAL Redis Configuration:**
Run this command on your Redis instance to ensure tiles are NEVER purged:
```bash
redis-cli CONFIG SET maxmemory-policy noeviction
```

**Configuration Checklist:**
- [ ] Verify REDIS_URL is correctly set and accessible
- [ ] Run `redis-cli CONFIG SET maxmemory-policy noeviction` on Redis instance
- [ ] Verify your chosen tile provider API key (MapTiler OR Mapbox)
- [ ] Set default map coordinates to Byron Bay (or other priority Australian location)
- [ ] Configure VITE_PLUGIN_MAP_FEEDS with your custom tile URLs (comma-separated)
- [ ] Test each plugin feed URL manually to ensure they're accessible
- [ ] Confirm all environment variables are loaded in your build process
- [ ] Verify AWS Terrain Tiles URL accessible (no auth required)

## Success Metrics - LIFE SAFETY STANDARDS

### Absolute Requirements (Non-Negotiable)

1. **ZERO BLANK SCREENS**: Not a single blank screen incident allowed in production
   - Target: 0 incidents per million requests
   - Measurement: Automated monitoring of static fallback usage
   - Action: Any blank screen is a CRITICAL failure requiring immediate investigation

2. **Cache Hit Ratio**: >95% for all strategic locations
   - Target: 95-98% cache hit rate
   - Measurement: Redis hits / total requests
   - Action: <90% triggers cache pre-warming

3. **Tile Delivery Speed**:
   - Redis cache: <10ms per tile (sub-millisecond goal)
   - API fallback: <500ms per tile
   - OSM fallback: <1000ms per tile  
   - Static fallback: <10ms per tile
   - Total maximum: 10 seconds before static fallback

4. **Write-Through Verification**: 100% verification of cache writes
   - Every successful API/OSM fetch MUST attempt Redis write
   - Write failures MUST be logged
   - Target: >99% write success rate

5. **Geographic Coverage**: All 10 strategic locations with >80% cache coverage
   - Verified on every deployment
   - Maintained through background refresh
   - Monitored continuously

6. **Race Conditions**: Zero detected in production
   - Measured through duplicate request detection
   - Verified through load testing
   - Monitored via request queue metrics

7. **System Uptime**: 99.99% availability
   - Maps MUST be accessible even during:
     - Redis outages
     - API provider outages
     - Network disruptions
     - Infrastructure failures

### Quality Assurance Verification - MANDATORY SIGN-OFF

**No deployment without complete sign-off on ALL items:**

#### Code Deletion Verification
- [ ] ALL existing map code has been deleted
- [ ] No legacy tile loading logic remains
- [ ] No old API routes for tiles exist
- [ ] No race conditions from old code remain
- [ ] Clean build with no map-related import errors

#### Infrastructure Verification
- [ ] Redis connection established using REDIS_URL
- [ ] MapTiler API key valid and working
- [ ] OpenStreetMap accessible and responding
- [ ] Static fallback tile loads successfully
- [ ] Emergency tile generator functional

#### Fallback Chain Verification  
- [ ] Redis serves cached tiles correctly
- [ ] Redis miss falls through to MapTiler
- [ ] MapTiler failure falls through to OSM
- [ ] OSM failure falls through to static tile
- [ ] Static tile NEVER fails
- [ ] All fallback transitions logged

#### Cache Write Verification
- [ ] MapTiler fetches write to Redis with 24h TTL
- [ ] OSM fetches write to Redis with 12h TTL
- [ ] Write success is verified (result === 'OK')
- [ ] Write failures are logged but don't block delivery
- [ ] Cache build-up visible in metrics

#### Geographic Coverage Verification
- [ ] All 10 strategic locations pre-warmed
- [ ] Each location has >80% cache coverage
- [ ] Coverage check system functional
- [ ] Initial location selection uses cached data
- [ ] Background maintenance running

#### Performance Verification
- [ ] Cache hits respond in <10ms (99th percentile)
- [ ] API fetches complete in <500ms (99th percentile)
- [ ] Static fallback responds in <10ms (always)
- [ ] No memory leaks after 24 hours
- [ ] Concurrent requests handled properly

#### Testing Verification
- [ ] All unit tests pass (100% coverage)
- [ ] All integration tests pass
- [ ] All failure scenario tests pass
- [ ] Load testing shows >95% cache hit rate
- [ ] Race condition tests pass (zero duplicates)
- [ ] Manual testing checklist complete

#### Monitoring Verification
- [ ] Metrics collection working
- [ ] Health check endpoints responding
- [ ] Alert thresholds configured
- [ ] Critical alerts trigger notifications
- [ ] Log aggregation functional
- [ ] Dashboard shows real-time data

#### Documentation Verification
- [ ] Architecture documented
- [ ] Runbook for failures created
- [ ] Alert response procedures written
- [ ] Team trained on system operation
- [ ] Disaster recovery plan documented

### Post-Deployment Monitoring - FIRST 48 HOURS CRITICAL

**24/7 monitoring required for first 48 hours:**

Hour 1-2: Intensive Monitoring
- [ ] Watch cache hit rate (expect >90% after warm-up)
- [ ] Monitor static fallback usage (should be <0.1%)
- [ ] Check all strategic locations serving tiles
- [ ] Verify write-through working (cache growing)
- [ ] Monitor error logs for anomalies

Hour 3-24: Active Monitoring
- [ ] Cache hit rate stabilizes >95%
- [ ] Static fallback usage remains <0.01%
- [ ] No blank screen reports from users
- [ ] API quota usage within limits
- [ ] Redis memory usage stable

Hour 25-48: Stability Verification
- [ ] All metrics within expected ranges
- [ ] Zero critical incidents
- [ ] Cache maintenance working
- [ ] Background processes stable
- [ ] User feedback positive

### Incident Response Plan

**If any issue detected:**

1. **Blank Screen Reported** (CRITICAL):
   - Immediate investigation by on-call engineer
   - Check all fallback tiers
   - Verify static tile accessible
   - Emergency rollback if necessary
   - Post-mortem required

2. **Static Fallback Usage >1%** (WARNING):
   - Check Redis connectivity
   - Verify API provider status
   - Check OSM availability
   - Trigger cache pre-warming
   - Monitor for improvement

3. **Cache Hit Rate <90%** (WARNING):
   - Review usage patterns
   - Check cache TTL configuration
   - Run cache pre-warming
   - Verify Redis memory sufficient
   - Consider increasing coverage

4. **API Failures >10%** (WARNING):
   - Check API provider status
   - Verify quota not exceeded
   - Review rate limiting
   - Increase OSM fallback if needed
   - Contact API provider if persistent

## Conclusion - MISSION CRITICAL SYSTEM

This specification provides a **military-grade, life-safety critical** mapping infrastructure that GUARANTEES zero blank screens under ANY circumstances.

### Why This System is Different

**Most mapping systems:** "We'll try our best to show tiles, and if it fails, oh well."

**TacMap:** "Lives depend on this. Failure is NOT an option. We WILL deliver a map under ALL circumstances."

### The Fortress Architecture - AUSTRALIA FIRST + PLUGIN EXTENSIBILITY

```
┌─────────────────────────────────────────────────────────────┐
│       TILE REQUEST (Australian focus + Plugin support)       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ LEVEL 0: PLUGIN FEEDS│  Variable - HIGHEST PRIORITY
          │ (Custom Tile URLs)   │  User-configured sources first
          └──────────┬───────────┘
                     │ All plugins failed or none configured
                     ▼
          ┌──────────────────────┐
          │   LEVEL 1: REDIS     │  <10ms - FASTEST
          │   (Permanent Cache)  │  TILES NEVER EXPIRE
          └──────────┬───────────┘
                     │ Cache Miss
                     ▼
          ┌──────────────────────┐
          │  LEVEL 2: MAPTILER   │  <500ms - HIGH QUALITY
          │  (API + Write Cache) │  ✓ Writes to Redis FOREVER
          └──────────┬───────────┘
                     │ API Failure or 403
                     ▼
          ┌──────────────────────┐
          │ LEVEL 3: AWS TERRAIN │  <1000ms - FREE & RELIABLE
          │ (Public S3 + Cache)  │  ✓ Writes to Redis FOREVER
          └──────────┬───────────┘
                     │ AWS Failure
                     ▼
          ┌──────────────────────┐
          │ LEVEL 4: STATIC TILE │  <10ms - GUARANTEED
          │   (Local Memory)     │  ✗ CANNOT FAIL
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   TILE DELIVERED     │  ✓ ALWAYS SUCCEEDS
          └──────────────────────┘
```

### Critical Guarantees - AUSTRALIAN INFRASTRUCTURE + PLUGIN EXTENSIBILITY

1. **ABSOLUTE ZERO BLANK SCREENS**
   - Not a goal - an absolute requirement
   - Lives depend on this system
   - Five layers of redundancy ensure this (plugins + standard fallbacks)

2. **PERMANENT INTELLIGENT CACHE BUILDING**
   - Every plugin/API/AWS success writes to Redis FOREVER (no TTL)
   - Redis configured with `maxmemory-policy noeviction` - tiles NEVER purged
   - System becomes smarter with usage, cache grows indefinitely
   - Multiple Australian strategic locations pre-seeded
   - Cache focuses on Australian regions first, never relies on single area

3. **NO RACE CONDITIONS**
   - Promise queue prevents duplicate requests
   - Proper React lifecycle management
   - Memory leak prevention
   - Production-tested patterns

4. **WRITE-THROUGH VERIFICATION**
   - Every cache write is verified
   - Failures logged but don't block delivery
   - Monitoring shows permanent cache build-up
   - System self-heals and improves through usage

5. **AUSTRALIAN GEOGRAPHIC PRIORITY**
   - 12 strategic locations across Australia
   - Alternative lifestyle hubs prioritized (Byron Bay, Nimbin, Maleny)
   - Regional centers covered (Kalgoorlie, Orange, Mission Beach)
   - Major cities included (Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart)
   - Intelligent initial location selection based on cache coverage
   - Background maintenance of coverage nationwide

6. **UNLIMITED PLUGIN MAP FEEDS**
   - Support for multiple custom tile sources
   - Plugin feeds tried FIRST (before Redis)
   - Environment variable configuration: `VITE_PLUGIN_MAP_FEEDS`
   - Programmatic configuration for advanced use cases
   - Each plugin can have custom headers, auth, timeout
   - Failed plugins don't block fallback chain

### What Makes This Military-Grade

✓ **Redundancy**: 4 tiers of fallback  
✓ **Verification**: Every cache write checked  
✓ **Monitoring**: Real-time metrics and alerts  
✓ **Testing**: Comprehensive test suite with 100% coverage  
✓ **Documentation**: Complete runbooks and procedures  
✓ **Training**: Team understands every failure mode  
✓ **Resilience**: Works during Redis, API, network failures  
✓ **Performance**: Sub-10ms cache hits, guaranteed delivery  
✓ **Intelligence**: Self-improving cache coverage  
✓ **Reliability**: 99.99% uptime target

### The Promise

**When you deploy this system:**

- Users will NEVER see a blank screen
- Maps will load even when infrastructure fails
- Performance will be exceptional (>95% cache hits)
- System will get smarter with every request
- Failures will be caught and handled gracefully
- Monitoring will show exactly what's happening
- Team will be confident in system reliability

### Critical Success Factors

1. **DELETE ALL OLD CODE** - Start from scratch, no compromises
2. **USE EXISTING INFRASTRUCTURE** - Redis URL and API keys already configured
3. **VERIFY EVERY FALLBACK TIER** - Test each failure mode thoroughly
4. **PRE-WARM STRATEGICALLY** - Cover multiple locations, not just one
5. **MONITOR CONTINUOUSLY** - Watch metrics, respond to alerts
6. **NEVER COMPROMISE** - Zero blank screens is non-negotiable

### Final Words

This is not just a mapping system. This is **critical infrastructure that saves lives**.

Build it with the same care you would give to:
- Aircraft navigation systems
- Emergency response systems  
- Medical equipment interfaces
- Military tactical systems

Because that's exactly what this is. People's lives depend on it working, every single time, under every circumstance.

**Zero tolerance for failure. Zero blank screens. Zero excuses.**

---

## Deployment Authorization

This system may only be deployed after:

- [ ] All quality checks pass
- [ ] All tests pass at 100%
- [ ] All strategic locations pre-warmed
- [ ] All monitoring configured
- [ ] Team trained on operations
- [ ] Incident response plan documented
- [ ] Senior engineer sign-off obtained

**Signed:** ________________  
**Date:** ________________  
**System Status:** ☐ CLEARED FOR DEPLOYMENT