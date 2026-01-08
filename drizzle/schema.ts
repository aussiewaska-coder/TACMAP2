import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Map settings table - stores user-specific map preferences
 */
export const mapSettings = mysqlTable("map_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Map center latitude */
  centerLat: varchar("centerLat", { length: 50 }).default("-25.2744").notNull(),
  /** Map center longitude */
  centerLng: varchar("centerLng", { length: 50 }).default("133.7751").notNull(),
  /** Default zoom level */
  zoom: int("zoom").default(4).notNull(),
  /** Map pitch (tilt) in degrees */
  pitch: int("pitch").default(0).notNull(),
  /** Map bearing (rotation) in degrees */
  bearing: int("bearing").default(0).notNull(),
  /** Active map style ID */
  activeStyleId: varchar("activeStyleId", { length: 100 }).default("streets").notNull(),
  /** JSON object storing layer visibility states */
  layerVisibility: json("layerVisibility").$type<Record<string, boolean>>(),
  /** JSON object storing layer opacity values */
  layerOpacity: json("layerOpacity").$type<Record<string, number>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapSettings = typeof mapSettings.$inferSelect;
export type InsertMapSettings = typeof mapSettings.$inferInsert;

/**
 * Map features table - admin-controlled feature toggles
 */
export const mapFeatures = mysqlTable("map_features", {
  id: int("id").autoincrement().primaryKey(),
  /** Feature identifier (e.g., 'draw', 'geocoder', 'export') */
  featureKey: varchar("featureKey", { length: 100 }).notNull().unique(),
  /** Human-readable feature name */
  featureName: varchar("featureName", { length: 200 }).notNull(),
  /** Feature description */
  description: text("description"),
  /** Whether the feature is enabled globally */
  enabled: boolean("enabled").default(true).notNull(),
  /** Feature category (plugin, control, layer, etc.) */
  category: mysqlEnum("category", ["plugin", "control", "layer", "example"]).notNull(),
  /** Configuration JSON for the feature */
  config: json("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapFeature = typeof mapFeatures.$inferSelect;
export type InsertMapFeature = typeof mapFeatures.$inferInsert;

/**
 * Map styles table - basemap style configurations
 */
export const mapStyles = mysqlTable("map_styles", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique style identifier */
  styleId: varchar("styleId", { length: 100 }).notNull().unique(),
  /** Human-readable style name */
  styleName: varchar("styleName", { length: 200 }).notNull(),
  /** Style description */
  description: text("description"),
  /** MapLibre style JSON URL or inline JSON */
  styleUrl: text("styleUrl").notNull(),
  /** Thumbnail URL for style preview */
  thumbnailUrl: text("thumbnailUrl"),
  /** Whether this style is active/available */
  enabled: boolean("enabled").default(true).notNull(),
  /** Display order */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapStyle = typeof mapStyles.$inferSelect;
export type InsertMapStyle = typeof mapStyles.$inferInsert;

/**
 * Custom layers table - placeholder for user's future data layers
 */
export const customLayers = mysqlTable("custom_layers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Layer identifier */
  layerId: varchar("layerId", { length: 100 }).notNull(),
  /** Human-readable layer name */
  layerName: varchar("layerName", { length: 200 }).notNull(),
  /** Layer description */
  description: text("description"),
  /** Layer type (geojson, raster, vector, etc.) */
  layerType: mysqlEnum("layerType", ["geojson", "raster", "vector", "heatmap", "cluster"]).notNull(),
  /** Data source URL or configuration */
  dataSource: text("dataSource"),
  /** Layer styling configuration JSON */
  styleConfig: json("styleConfig").$type<Record<string, unknown>>(),
  /** Whether the layer is visible by default */
  visible: boolean("visible").default(true).notNull(),
  /** Layer opacity (0-1) */
  opacity: int("opacity").default(100).notNull(),
  /** Display order (z-index) */
  zIndex: int("zIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomLayer = typeof customLayers.$inferSelect;
export type InsertCustomLayer = typeof customLayers.$inferInsert;
