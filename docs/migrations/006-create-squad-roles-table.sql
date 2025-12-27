-- Migration: Create Squad Roles (Incremental)
-- Date: 2025-12-27
-- Purpose: Define which roles (global or workspace) are active in a squad
-- IMPORTANT: This table may already exist in some environments - use incremental approach

-- Step 1: Create table if it doesn't exist (with minimal schema)
CREATE TABLE IF NOT EXISTS sv.squad_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add columns incrementally (only if they don't exist)
-- These ALTER TABLE statements are idempotent with IF NOT EXISTS
DO $$ 
BEGIN
  -- Add role_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'role_id'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN role_id UUID REFERENCES sv.roles(id) ON DELETE CASCADE;
  END IF;

  -- Add workspace_role_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'workspace_role_id'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN workspace_role_id UUID REFERENCES sv.workspace_roles(id) ON DELETE CASCADE;
  END IF;

  -- Add active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'active'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'squad_roles' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE sv.squad_roles 
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 3: Add check constraint (must reference either role_id OR workspace_role_id)
-- Drop existing constraint if it exists to avoid conflicts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'sv' 
      AND constraint_name = 'squad_roles_role_reference_check'
  ) THEN
    ALTER TABLE sv.squad_roles DROP CONSTRAINT squad_roles_role_reference_check;
  END IF;
END $$;

-- Add the check constraint
ALTER TABLE sv.squad_roles
  ADD CONSTRAINT squad_roles_role_reference_check
  CHECK (
    (role_id IS NOT NULL AND workspace_role_id IS NULL) OR
    (role_id IS NULL AND workspace_role_id IS NOT NULL)
  );

-- Step 4: Add unique constraint to prevent duplicate active roles per squad
-- This ensures no duplicate role activation in a squad
DO $$ 
BEGIN
  -- Drop existing index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'sv' 
      AND indexname = 'idx_squad_roles_unique_active'
  ) THEN
    DROP INDEX sv.idx_squad_roles_unique_active;
  END IF;
END $$;

-- Create unique partial index for active roles
-- Prevents same role from being active multiple times in same squad
CREATE UNIQUE INDEX idx_squad_roles_unique_active 
  ON sv.squad_roles(squad_id, role_id) 
  WHERE active = true AND role_id IS NOT NULL;

CREATE UNIQUE INDEX idx_squad_roles_unique_active_workspace 
  ON sv.squad_roles(squad_id, workspace_role_id) 
  WHERE active = true AND workspace_role_id IS NOT NULL;

-- Step 5: Create lookup indexes
CREATE INDEX IF NOT EXISTS idx_squad_roles_squad 
  ON sv.squad_roles(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_roles_role 
  ON sv.squad_roles(role_id) WHERE role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_squad_roles_workspace_role 
  ON sv.squad_roles(workspace_role_id) WHERE workspace_role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_squad_roles_active 
  ON sv.squad_roles(squad_id, active) WHERE active = true;
