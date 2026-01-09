-- Complete Migration SQL for Magic Link Authentication
-- Run this directly against your Neon PostgreSQL database

-- 1. Create role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "role" AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create users table (the authentication table)
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "open_id" VARCHAR(64) UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320) UNIQUE,
  "login_method" VARCHAR(64),
  "role" "role" DEFAULT 'user' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "last_signed_in" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create other missing tables if they don't exist

-- Map settings table
CREATE TABLE IF NOT EXISTS "map_settings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "center_lat" VARCHAR(50) DEFAULT '-25.2744' NOT NULL,
  "center_lng" VARCHAR(50) DEFAULT '133.7751' NOT NULL,
  "zoom" INTEGER DEFAULT 4 NOT NULL,
  "pitch" INTEGER DEFAULT 0 NOT NULL,
  "bearing" INTEGER DEFAULT 0 NOT NULL,
  "active_style_id" VARCHAR(100) DEFAULT 'streets' NOT NULL,
  "layer_visibility" JSONB,
  "layer_opacity" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Feature category enum
DO $$ BEGIN
  CREATE TYPE "feature_category" AS ENUM ('plugin', 'control', 'layer', 'example');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Map features table
CREATE TABLE IF NOT EXISTS "map_features" (
  "id" SERIAL PRIMARY KEY,
  "feature_key" VARCHAR(100) NOT NULL UNIQUE,
  "feature_name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN DEFAULT true NOT NULL,
  "category" "feature_category" NOT NULL,
  "config" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Map styles table
CREATE TABLE IF NOT EXISTS "map_styles" (
  "id" SERIAL PRIMARY KEY,
  "style_id" VARCHAR(100) NOT NULL UNIQUE,
  "style_name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "style_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "enabled" BOOLEAN DEFAULT true NOT NULL,
  "sort_order" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Layer type enum
DO $$ BEGIN
  CREATE TYPE "layer_type" AS ENUM ('geojson', 'raster', 'vector', 'heatmap', 'cluster');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Custom layers table
CREATE TABLE IF NOT EXISTS "custom_layers" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "layer_id" VARCHAR(100) NOT NULL,
  "layer_name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "layer_type" "layer_type" NOT NULL,
  "data_source" TEXT,
  "style_config" JSONB,
  "visible" BOOLEAN DEFAULT true NOT NULL,
  "opacity" INTEGER DEFAULT 100 NOT NULL,
  "z_index" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_magic_link_tokens_token" ON "magic_link_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_magic_link_tokens_email" ON "magic_link_tokens" ("email");
CREATE INDEX IF NOT EXISTS "idx_magic_link_tokens_expires_at" ON "magic_link_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_users_open_id" ON "users" ("open_id");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

-- Migration complete
-- The magic_link_tokens table was already created earlier
