-- Migration: Create Global Roles Catalog
-- Date: 2025-12-27
-- Purpose: Create catalog of global role specialties that can be used across the product

-- Table: sv.roles
-- Purpose: Global catalog of role specialties
-- Responsibility: Represent global specialties and serve as AI learning base
CREATE TABLE IF NOT EXISTS sv.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  default_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for code lookups (frequent query pattern)
CREATE INDEX IF NOT EXISTS idx_roles_code 
  ON sv.roles(code);

-- Create index for default active roles
CREATE INDEX IF NOT EXISTS idx_roles_default_active 
  ON sv.roles(default_active) WHERE default_active = true;
