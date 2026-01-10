-- Fix all VARCHAR column sizes to accommodate longer values
ALTER TABLE emergency_registry ALTER COLUMN source_id TYPE VARCHAR(255);
ALTER TABLE emergency_registry ALTER COLUMN category TYPE VARCHAR(255);
ALTER TABLE emergency_registry ALTER COLUMN subcategory TYPE VARCHAR(255);
ALTER TABLE emergency_registry ALTER COLUMN jurisdiction_state TYPE VARCHAR(100);
ALTER TABLE emergency_registry ALTER COLUMN stream_type TYPE VARCHAR(100);
ALTER TABLE emergency_registry ALTER COLUMN format TYPE VARCHAR(100);
ALTER TABLE emergency_registry ALTER COLUMN access_level TYPE VARCHAR(100);
