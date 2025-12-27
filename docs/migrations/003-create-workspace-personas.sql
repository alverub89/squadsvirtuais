-- Migration: Update Personas to Workspace Level with Squad Associations
-- Date: 2025-12-27
-- Purpose: Transform personas from squad-specific to workspace-level reusable entities
-- with contextual squad associations via sv.squad_personas

-- IMPORTANT: This migration assumes the old sv.personas table exists but needs to be migrated
-- If you have existing persona data, you should back it up first and migrate it after running this

-- Step 1: Drop the old squad-specific personas table
-- WARNING: This will delete existing persona data. Backup first if needed.
DROP TABLE IF EXISTS sv.personas CASCADE;

-- Step 2: Create new workspace-level personas table
CREATE TABLE IF NOT EXISTS sv.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  goals TEXT,
  pain_points TEXT,
  behaviors TEXT,
  influence_level TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Type constraint: cliente | stakeholder | membro_squad
  CONSTRAINT personas_type_check 
    CHECK (type IN ('cliente', 'stakeholder', 'membro_squad'))
);

CREATE INDEX IF NOT EXISTS idx_personas_workspace 
  ON sv.personas(workspace_id);

CREATE INDEX IF NOT EXISTS idx_personas_active 
  ON sv.personas(workspace_id, active);

-- Step 3: Create squad_personas association table
CREATE TABLE IF NOT EXISTS sv.squad_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES sv.personas(id) ON DELETE CASCADE,
  context_description TEXT,
  focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each persona is associated with a squad only once
  CONSTRAINT squad_personas_unique 
    UNIQUE (squad_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_personas_squad 
  ON sv.squad_personas(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_personas_persona 
  ON sv.squad_personas(persona_id);
