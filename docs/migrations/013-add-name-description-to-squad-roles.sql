-- Migration: Add name and description columns to squad_roles
-- Date: 2025-12-27
-- Purpose: Allow squad_roles to have custom name and description that override role references

-- Add name column to squad_roles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'name'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN name TEXT;
  END IF;
END $$;

-- Add description column to squad_roles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'description'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN sv.squad_roles.name IS 'Custom name for this role in the squad, overrides role_id/workspace_role_id label';
COMMENT ON COLUMN sv.squad_roles.description IS 'Custom description for this role in the squad, overrides role_id/workspace_role_id description';
