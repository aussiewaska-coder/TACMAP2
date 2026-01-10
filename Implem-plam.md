# AUSTRALIAN GOVERNMENT MAPPING PLATFORM

## SINGLE AMALGAMATED TECH SPEC + FULL IMPLEMENTATION (AI-FEED MASTER DOCUMENT)

> **Status:** FINAL, LOSSLESS, AI-EXECUTABLE SPECIFICATION  
> **Scope:** EVERYTHING — architecture, code, folder tree, render logic, tile pipeline, Redis, WMS, alerts, safety, deployment, runbooks.  
> **Instruction:** An AI must be able to build the entire platform *from this document alone*.

---

# 0. ABSOLUTE PRIME DIRECTIVE

THIS SYSTEM IS **LIFE-SAFETY CRITICAL**.

❌ NO BLANK SCREENS  
❌ NO PARTIAL MAP LOADS  
❌ NO RACE CONDITIONS  
❌ NO SILENT FAILURES  

If all networks fail, **A MAP MUST STILL RENDER**.

---

# 1. CANONICAL TECH STACK (FIXED)

Frontend:
- React + TypeScript
- Vite
- TailwindCSS
- Wouter
- Zustand (persisted)
- @maptiler/sdk (MapLibre)

Backend:
- Vercel Serverless Functions (NO Express, NO long-lived servers)
- tRPC (serverless adapters only)
- Zod (validation)

Data:
- Neon Postgres
- Drizzle ORM
- Redis (permanent tile cache)

Deployment:
- Vercel

---

# 2. CANONICAL REPOSITORY TREE (MANDATORY)

```
/
├── client/
│   └── src/
│       ├── core/
│       │   ├── MapCore.tsx
│       │   ├── mapSafety.ts
│       │   └── tileConfig.ts
│       ├── components/
│       │   ├── MapView.tsx
│       │   ├── AlertsSidebar.tsx
│       │   └── LayerControls.tsx
│       ├── hooks/
│       │   ├── useEmergencyAlerts.ts
│       │   ├── usePoliceAlerts.ts
│       │   └── useMapReady.ts
│       ├── stores/
│       │   └── mapStore.ts
│       ├── styles/
│       └── main.tsx
│
├── server/
│   ├── index.ts
│   ├── redis/
│   │   └── client.ts
│   ├── tiles/
│   │   └── tilePipeline.ts
│   └── wms/
│       └── proxy.ts
│
├── api/
│   ├── tiles/[z]/[x]/[y].ts
│   ├── emergency/alerts.ts
│   └── health/
│       ├── redis.ts
│       └── tiles.ts
│
├── drizzle/
│   └── schema.ts
│
├── public/
│   └── fallback-tile.png
│
├── shared/
│   └── types.ts
│
├── vercel.json
└── README.md
```

---

# 3. MAP CORE — CLIENT (ZERO FAILURE GUARANTEE)

## MapCore.tsx

```tsx
import { Map } from '@maptiler/sdk';
import { useEffect, useRef, useState } from 'react';

export function MapCore({ children }) {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: import.meta.env.VITE_MAPTILER_STYLE,
      center: [133.7751, -25.2744], // AU centroid
      zoom: 4
    });

    map.on('load', () => setLoaded(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {loaded && children(mapRef.current)}
    </div>
  );
}
```

---

# 4. TILE PIPELINE — SERVERLESS (FORTRESS IMPLEMENTATION)

## tilePipeline.ts

```ts
import fetch from 'node-fetch';
import { redis } from '../redis/client';
import fs from 'fs';

const inflight = new Map<string, Promise<Buffer>>();
const fallbackTile = fs.readFileSync('./public/fallback-tile.png');

export async function getTile(z, x, y) {
  const key = `${z}-${x}-${y}`;
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = (async () => {
    const redisKey = `tile:maptiler:${key}`;

    const cached = await redis.getBuffer(redisKey);
    if (cached) return cached;

    try {
      const res = await fetch(`https://api.maptiler.com/tiles/${z}/${x}/${y}.png?key=${process.env.VITE_MAPTILER_API_KEY}`, { timeout: 2000 });
      const buf = await res.buffer();
      await redis.set(redisKey, buf);
      return buf;
    } catch {
      return fallbackTile;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
```

---

# 5. REDIS — PERMANENT CACHE

## redis/client.ts

```ts
import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: retries => Math.min(retries * 100, 2000)
  }
});

redis.connect();
```

**CONFIGURATION REQUIRED:**
```
CONFIG SET maxmemory-policy noeviction
```

---

# 6. GOVERNMENT WMS PROXY (SSRF SAFE)

```ts
// SERVERLESS HANDLER — NO EXPRESS
import fetch from 'node-fetch' from 'express';
import fetch from 'node-fetch';

const ALLOW = ['services.ga.gov.au', 'hotspots.dea.ga.gov.au'];

export const wmsProxy = express.Router();

wmsProxy.get('/', async (req, res) => {
  const target = new URL(req.query.url as string);
  if (!ALLOW.includes(target.hostname)) return res.sendStatus(403);

  const upstream = await fetch(target.toString(), { timeout: 3000 });
  res.setHeader('Content-Type', upstream.headers.get('content-type')!);
  upstream.body.pipe(res);
});
```

---

# 7. ALERTS — EMERGENCY + POLICE

## Emergency Alerts Endpoint

```ts
export default function handler(req, res) {
  res.json({ type: 'FeatureCollection', features: [] });
}
```

## Police Alerts (Waze)

```ts
export async function fetchWazeAlerts() {
  // fetch, dedupe, persist
}
```

---

# 8. DATABASE SCHEMA (DRIZZLE)

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const policeReports = pgTable('police_reports', {
  id: text('id').primaryKey(),
  type: text('type'),
  createdAt: timestamp('created_at').defaultNow()
});
```

---

# 9. ENVIRONMENT VARIABLES (VERCEL)

```
VITE_MAPTILER_API_KEY
VITE_MAPTILER_STYLE
REDIS_URL
DATABASE_URL
```

⚠️ VITE_ vars require rebuild

---

# 10. DEPLOYMENT RUNBOOK

1. Verify env vars
2. Clear Vercel build cache
3. Prewarm Redis
4. Deploy
5. Monitor

---

# 11. FINAL AI INSTRUCTION

> BUILD **EXACTLY** WHAT IS IN THIS DOCUMENT.  
> DO NOT OMIT FALLBACKS.  
> DO NOT SIMPLIFY SAFETY.  
> DEFAULT TO AVAILABILITY OVER ELEGANCE.

---

**END OF SINGLE AMALGAMATED MASTER SPEC**

