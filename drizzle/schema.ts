import { boolean, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

/**
 * PostgreSQL version of the schema for Neon
 */

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const layerTypeEnum = pgEnum("layer_type", ["geojson", "raster", "vector", "heatmap", "cluster"]);
export const categoryEnum = pgEnum("feature_category", ["plugin", "control", "layer", "example"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const mapSettings = pgTable("map_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  centerLat: varchar("center_lat", { length: 50 }).default("-25.2744").notNull(),
  centerLng: varchar("center_lng", { length: 50 }).default("133.7751").notNull(),
  zoom: integer("zoom").default(4).notNull(),
  pitch: integer("pitch").default(0).notNull(),
  bearing: integer("bearing").default(0).notNull(),
  activeStyleId: varchar("active_style_id", { length: 100 }).default("streets").notNull(),
  layerVisibility: jsonb("layer_visibility").$type<Record<string, boolean>>(),
  layerOpacity: jsonb("layer_opacity").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MapSettings = typeof mapSettings.$inferSelect;
export type InsertMapSettings = typeof mapSettings.$inferInsert;

export const mapFeatures = pgTable("map_features", {
  id: serial("id").primaryKey(),
  featureKey: varchar("feature_key", { length: 100 }).notNull().unique(),
  featureName: varchar("feature_name", { length: 200 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  category: categoryEnum("category").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MapFeature = typeof mapFeatures.$inferSelect;
export type InsertMapFeature = typeof mapFeatures.$inferInsert;

export const mapStyles = pgTable("map_styles", {
  id: serial("id").primaryKey(),
  styleId: varchar("style_id", { length: 100 }).notNull().unique(),
  styleName: varchar("style_name", { length: 200 }).notNull(),
  description: text("description"),
  styleUrl: text("style_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MapStyle = typeof mapStyles.$inferSelect;
export type InsertMapStyle = typeof mapStyles.$inferInsert;

export const customLayers = pgTable("custom_layers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  layerId: varchar("layer_id", { length: 100 }).notNull(),
  layerName: varchar("layer_name", { length: 200 }).notNull(),
  description: text("description"),
  layerType: layerTypeEnum("layer_type").notNull(),
  dataSource: text("data_source"),
  styleConfig: jsonb("style_config").$type<Record<string, unknown>>(),
  visible: boolean("visible").default(true).notNull(),
  opacity: integer("opacity").default(100).notNull(),
  zIndex: integer("z_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CustomLayer = typeof customLayers.$inferSelect;
export type InsertCustomLayer = typeof customLayers.$inferInsert;
