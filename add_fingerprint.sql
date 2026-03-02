-- Run this in the Supabase SQL Editor

-- 1. Add the fingerprint column
ALTER TABLE billing_records 
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- 2. Populate fingerprint for existing records (optional, but prevents nulls)
-- This is a best effort based on existing data
UPDATE billing_records 
SET fingerprint = LOWER(REPLACE(CONCAT("F.Carga", '_', "Conductor", '_', "Nomb.Cliente", '_', "Euros"), ' ', '_'))
WHERE fingerprint IS NULL;

-- 3. Add a unique constraint to prevent future duplicates at the DB level
-- Note: This might fail if you ALREADY have duplicates. 
-- In that case, you might need to clean the table first or just use the column without the UNIQUE constraint for now.
-- But the 'upsert' in the code REQUIRES a unique constraint or an index on the column.

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_fingerprint ON billing_records (fingerprint);
