import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, gt, desc, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import {
  InsertUser,
  users,
  mapSettings,
  MapSettings,
  InsertMapSettings,
  mapFeatures,
  MapFeature,
  InsertMapFeature,
  mapStyles,
  MapStyle,
  InsertMapStyle,
  customLayers,
  CustomLayer,
  InsertCustomLayer,
  policeReports,
  PoliceReport,
  magicLinkTokens
} from "../drizzle/schema.js";
import { ENV } from './_core/env.js';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql, { schema });
      // Only log once
      if (process.env.NODE_ENV === 'development') {
        console.log("[Database] Connected to Neon PostgreSQL");
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// REMOVED: Broken db wrapper that returned Promises instead of builders

export async function upsertUser(user: InsertUser): Promise<void> {
  // Support both openId (OAuth) and email (magic link) based auth
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email ? user.email.toLowerCase().trim() : undefined,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    // Handle email separately with normalization
    if (user.email !== undefined) {
      const normalized = user.email ? user.email.toLowerCase().trim() : null;
      values.email = normalized;
      updateSet.email = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || user.email === ENV.ownerEmail) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Postgres upsert (onConflictDoUpdate) - use email if openId not available
    const conflictTarget = user.openId ? users.openId : users.email;
    await db.insert(users).values(values).onConflictDoUpdate({
      target: conflictTarget,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithEmail(email: string, name?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    await db.insert(users).values({
      email: normalizedEmail,
      name: name || null,
      loginMethod: 'magic_link',
      lastSignedIn: new Date(),
    });
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    throw error;
  }
}

export async function updateUserLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// Map Settings Queries
export async function getMapSettingsByUserId(userId: number): Promise<MapSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(mapSettings).where(eq(mapSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMapSettings(settings: InsertMapSettings): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // We need to handle this manually since we don't have a unique constraint on userId in the schema definition yet,
  // OR we can assume userId is unique for map settings if likely.
  // Ideally, add a unique key to schema.pg.ts for (userId), but for now, let's use check-then-insert/update or rely on ID if we had it.
  // Actually, standard pattern for settings is usually 0 or 1 row per user.
  // Let's assume we want to match on ID if present, or userId.
  // Since we don't have a unique index on 'userId' in the schema definition, 'onConflictDoUpdate' might fail if targeting userId.
  // Let's do a meaningful check.

  const existing = await getMapSettingsByUserId(settings.userId);
  if (existing) {
    await db.update(mapSettings).set({
      centerLat: settings.centerLat,
      centerLng: settings.centerLng,
      zoom: settings.zoom,
      pitch: settings.pitch,
      bearing: settings.bearing,
      activeStyleId: settings.activeStyleId,
      layerVisibility: settings.layerVisibility,
      layerOpacity: settings.layerOpacity,
      updatedAt: new Date(),
    }).where(eq(mapSettings.userId, settings.userId));
  } else {
    await db.insert(mapSettings).values(settings);
  }
}

// Map Features Queries
export async function getAllMapFeatures(): Promise<MapFeature[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mapFeatures);
}

export async function getMapFeatureByKey(featureKey: string): Promise<MapFeature | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(mapFeatures).where(eq(mapFeatures.featureKey, featureKey)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMapFeature(feature: InsertMapFeature): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(mapFeatures).values(feature).onConflictDoUpdate({
    target: mapFeatures.featureKey,
    set: {
      featureName: feature.featureName,
      description: feature.description,
      enabled: feature.enabled,
      category: feature.category,
      config: feature.config,
      updatedAt: new Date(),
    },
  });
}

export async function updateMapFeatureEnabled(featureKey: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(mapFeatures).set({ enabled }).where(eq(mapFeatures.featureKey, featureKey));
}

// Map Styles Queries
export async function getAllMapStyles(): Promise<MapStyle[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mapStyles);
}

export async function getMapStyleById(styleId: string): Promise<MapStyle | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(mapStyles).where(eq(mapStyles.styleId, styleId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMapStyle(style: InsertMapStyle): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(mapStyles).values(style).onConflictDoUpdate({
    target: mapStyles.styleId,
    set: {
      styleName: style.styleName,
      description: style.description,
      styleUrl: style.styleUrl,
      thumbnailUrl: style.thumbnailUrl,
      enabled: style.enabled,
      sortOrder: style.sortOrder,
      updatedAt: new Date(),
    },
  });
}

// Custom Layers Queries
export async function getCustomLayersByUserId(userId: number): Promise<CustomLayer[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(customLayers).where(eq(customLayers.userId, userId));
}

export async function upsertCustomLayer(layer: InsertCustomLayer): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Custom layers usually rely on the auto-increment ID for updates.
  // If we have an ID, update it. If not, insert.
  if (layer.id) {
    await db.update(customLayers).set(layer).where(eq(customLayers.id, layer.id));
  } else {
    await db.insert(customLayers).values(layer);
  }
}


export async function getCustomLayerById(id: number): Promise<CustomLayer | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customLayers).where(eq(customLayers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteCustomLayer(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(customLayers).where(eq(customLayers.id, id));
}

// Police Reports Queries
export async function getPoliceReports(minTimestamp?: Date): Promise<PoliceReport[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(policeReports);

  if (minTimestamp) {
    // @ts-ignore - drizzle type inference can be tricky with optional where clauses in builder pattern sometimes, but let's try standard way
    query = query.where(gt(policeReports.publishDatetimeUtc, minTimestamp));
  }

  // default sort by latest
  return await query.orderBy(desc(policeReports.publishDatetimeUtc)).limit(15000); // hard limit to prevent explosion
}

export async function insertPoliceReports(reports: (typeof policeReports.$inferInsert)[]): Promise<void> {
  const db = await getDb();
  if (!db || reports.length === 0) return;

  await db.insert(policeReports).values(reports).onConflictDoUpdate({
    target: policeReports.alertId,
    set: {
      alertReliability: sql`excluded.alert_reliability`,
      subtype: sql`excluded.subtype`,
      // policeReports schema does not have updatedAt, so we only update fields that might change
    }
  });
}
