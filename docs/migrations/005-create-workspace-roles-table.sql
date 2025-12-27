-- Migration: Create Workspace Roles
-- Date: 2025-12-27
-- Purpose: Allow workspaces to extend/create custom roles without polluting global catalog

-- Table: sv.workspace_roles
-- Purpose: Workspace-specific role extensions
-- Responsibility: Allow custom roles per workspace
CREATE TABLE IF NOT EXISTS sv.workspace_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Code must be unique per workspace
  CONSTRAINT workspace_roles_code_unique 
    UNIQUE (workspace_id, code)
);

-- Create index for workspace lookups
CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace 
  ON sv.workspace_roles(workspace_id);

-- Create index for active roles
CREATE INDEX IF NOT EXISTS idx_workspace_roles_active 
  ON sv.workspace_roles(workspace_id, active) WHERE active = true;
