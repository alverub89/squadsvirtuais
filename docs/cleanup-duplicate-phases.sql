-- Script to identify and clean up duplicate phases
-- Date: 2025-12-28
-- Purpose: Remove duplicate phases before applying unique constraint

-- Step 1: Identify duplicates
SELECT 
  squad_id, 
  name, 
  COUNT(*) as count,
  STRING_AGG(id::TEXT, ', ') as phase_ids
FROM sv.phases
GROUP BY squad_id, name
HAVING COUNT(*) > 1
ORDER BY squad_id, name;

-- Step 2: Remove duplicates (keeping only the first occurrence by created_at)
-- This query keeps the oldest phase and removes newer duplicates
WITH duplicates AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY squad_id, name ORDER BY created_at ASC) as rn
  FROM sv.phases
)
DELETE FROM sv.phases
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
RETURNING id, squad_id, name, created_at;

-- Step 3: Verify cleanup
-- This should return 0 rows after cleanup
SELECT 
  squad_id, 
  name, 
  COUNT(*) as count
FROM sv.phases
GROUP BY squad_id, name
HAVING COUNT(*) > 1;
