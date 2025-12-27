-- Migration: Create Squad Validation Matrix Entries
-- Date: 2025-12-27
-- Purpose: Define role ↔ persona validation rules per checkpoint type
-- Business Rule: Govern which roles validate which personas at which checkpoints

-- Table: sv.squad_validation_matrix_entries
-- Purpose: Store the actual validation rules (role + persona + checkpoint)
-- Responsibility: Define validation requirements for governance
CREATE TABLE IF NOT EXISTS sv.squad_validation_matrix_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES sv.squad_validation_matrix_versions(id) ON DELETE CASCADE,
  squad_role_id UUID NOT NULL REFERENCES sv.squad_roles(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES sv.personas(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL,
  requirement_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Checkpoint types: ISSUE | DECISION | PHASE | MAP
  CONSTRAINT validation_matrix_checkpoint_type_check 
    CHECK (checkpoint_type IN ('ISSUE', 'DECISION', 'PHASE', 'MAP')),
  
  -- Requirement levels: REQUIRED | OPTIONAL
  CONSTRAINT validation_matrix_requirement_level_check 
    CHECK (requirement_level IN ('REQUIRED', 'OPTIONAL')),
  
  -- Prevent duplicate entries within same version
  CONSTRAINT validation_matrix_entries_unique 
    UNIQUE (version_id, squad_role_id, persona_id, checkpoint_type)
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_validation_matrix_entries_version 
  ON sv.squad_validation_matrix_entries(version_id);

CREATE INDEX IF NOT EXISTS idx_validation_matrix_entries_squad_role 
  ON sv.squad_validation_matrix_entries(squad_role_id);

CREATE INDEX IF NOT EXISTS idx_validation_matrix_entries_persona 
  ON sv.squad_validation_matrix_entries(persona_id);

CREATE INDEX IF NOT EXISTS idx_validation_matrix_entries_checkpoint 
  ON sv.squad_validation_matrix_entries(version_id, checkpoint_type);
