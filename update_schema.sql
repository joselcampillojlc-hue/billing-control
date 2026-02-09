-- Run this in the Supabase SQL Editor to add the 'department' column

-- 1. Add the column if it doesn't exist
ALTER TABLE billing_records 
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Intermodal';

-- 2. Update existing records to have a default department (optional, but good for consistency)
UPDATE billing_records 
SET department = 'Intermodal' 
WHERE department IS NULL;

-- 3. Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'billing_records' AND column_name = 'department';
