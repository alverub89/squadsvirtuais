-- Migration: Create squads table
-- Purpose: Create the central squad entity that belongs to workspaces
-- Date: 2025-12-27

-- Create squads table
CREATE TABLE IF NOT EXISTS sv.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure status is one of the allowed values
  CONSTRAINT squads_status_check 
    CHECK (status IN ('rascunho', 'ativa', 'aguardando_execucao', 'em_revisao', 'concluida', 'pausada'))
);

-- Create index for workspace lookups (frequent query pattern)
CREATE INDEX IF NOT EXISTS idx_squads_workspace 
  ON sv.squads(workspace_id);

-- Verification query (uncomment to test)
/*
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'sv' 
  AND table_name = 'squads'
ORDER BY ordinal_position;
*/
