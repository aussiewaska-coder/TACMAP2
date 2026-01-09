-- Fix jurisdiction_state column size
ALTER TABLE emergency_registry ALTER COLUMN jurisdiction_state TYPE VARCHAR(50);
