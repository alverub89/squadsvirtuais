-- Migration: Add unique constraint to prevent duplicate phases
-- Date: 2025-12-28
-- Purpose: Ensure phases with the same name cannot be duplicated within a squad
-- Related Issue: Correção - fases do roteiro estão sendo duplicadas

-- Add unique constraint to prevent duplicate phase names within the same squad
-- This ensures that a squad cannot have two phases with the same name
ALTER TABLE sv.phases 
  ADD CONSTRAINT phases_squad_name_unique 
  UNIQUE (squad_id, name);

-- Note: Before running this migration, clean up any existing duplicates:
-- 
-- To identify duplicates:
-- SELECT squad_id, name, COUNT(*) as count
-- FROM sv.phases
-- GROUP BY squad_id, name
-- HAVING COUNT(*) > 1;
--
-- To remove duplicates (keeping only the first occurrence):
-- WITH duplicates AS (
--   SELECT id, 
--          ROW_NUMBER() OVER (PARTITION BY squad_id, name ORDER BY created_at) as rn
--   FROM sv.phases
-- )
-- DELETE FROM sv.phases
-- WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
