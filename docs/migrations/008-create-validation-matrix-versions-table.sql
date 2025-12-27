-- Migration: Create Squad Validation Matrix Versions
-- Date: 2025-12-27
-- Purpose: Version control for validation matrix configurations
-- Business Rule: Never edit old versions, always create new ones

-- Table: sv.squad_validation_matrix_versions
-- Purpose: Track versions of validation matrix per squad
-- Responsibility: Maintain historical record of matrix changes
CREATE TABLE IF NOT EXISTS sv.squad_validation_matrix_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  description TEXT,
  created_by_user_id UUID REFERENCES sv.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure version numbers are unique per squad
  CONSTRAINT squad_validation_matrix_versions_unique 
    UNIQUE (squad_id, version)
);

-- Create index for squad lookups
CREATE INDEX IF NOT EXISTS idx_validation_matrix_versions_squad 
  ON sv.squad_validation_matrix_versions(squad_id);

-- Create index for getting latest version (ORDER BY version DESC)
CREATE INDEX IF NOT EXISTS idx_validation_matrix_versions_latest 
  ON sv.squad_validation_matrix_versions(squad_id, version DESC);
