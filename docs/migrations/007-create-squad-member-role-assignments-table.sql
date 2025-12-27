-- Migration: Create Squad Member Role Assignments
-- Date: 2025-12-27
-- Purpose: Associate human users with role specialties in squads
-- Business Rule: One user can have only 1 active role per squad

-- Table: sv.squad_member_role_assignments
-- Purpose: Track which role each squad member has
-- Responsibility: Manage role assignments with full history
CREATE TABLE IF NOT EXISTS sv.squad_member_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_member_id UUID NOT NULL REFERENCES sv.squad_members(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  squad_role_id UUID NOT NULL REFERENCES sv.squad_roles(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to enforce: one user can have only 1 active role per squad
-- This is the key business rule
CREATE UNIQUE INDEX idx_squad_member_role_unique_active 
  ON sv.squad_member_role_assignments(squad_member_id, squad_id) 
  WHERE active = true;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_squad_member_role_member 
  ON sv.squad_member_role_assignments(squad_member_id);

CREATE INDEX IF NOT EXISTS idx_squad_member_role_squad 
  ON sv.squad_member_role_assignments(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_member_role_squad_role 
  ON sv.squad_member_role_assignments(squad_role_id);

CREATE INDEX IF NOT EXISTS idx_squad_member_role_active 
  ON sv.squad_member_role_assignments(squad_id, active) WHERE active = true;
