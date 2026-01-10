-- Manual migration to create emergency_registry table
-- Run this directly on Neon database

CREATE TABLE IF NOT EXISTS emergency_registry (
  id SERIAL PRIMARY KEY,
  source_id VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(200),
  tags JSONB DEFAULT '[]'::jsonb,
  jurisdiction_state VARCHAR(10),
  endpoint_url TEXT NOT NULL,
  stream_type VARCHAR(50),
  format VARCHAR(50),
  access_level VARCHAR(50),
  certainly_open BOOLEAN DEFAULT FALSE,
  machine_readable BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_registry_category ON emergency_registry(category);
CREATE INDEX IF NOT EXISTS idx_emergency_registry_state ON emergency_registry(jurisdiction_state);
CREATE INDEX IF NOT EXISTS idx_emergency_registry_machine_readable ON emergency_registry(machine_readable);
