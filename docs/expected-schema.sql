-- Expected database schema for GitHub integration
-- This file documents the expected structure of the github_connections and repo_connections tables
-- These tables should already exist in the database according to the issue requirements

-- Schema: sv (squads virtuais)
-- All tables must be in the sv schema

---
-- Table: sv.github_connections
---
-- Purpose: Store GitHub OAuth connections for workspaces
-- Note: This is a documentation file, NOT a migration script
-- The table should already exist in the database

-- Expected structure:
/*
CREATE TABLE IF NOT EXISTS sv.github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider_user_id TEXT NOT NULL,
  login TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT github_connections_workspace_provider_unique 
    UNIQUE (workspace_id, provider_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_github_connections_workspace 
  ON sv.github_connections(workspace_id);
*/

---
-- Table: sv.repo_connections
---
-- Purpose: Store GitHub repositories connected to workspaces
-- Note: This is a documentation file, NOT a migration script
-- The table should already exist in the database

-- Expected structure:
/*
CREATE TABLE IF NOT EXISTS sv.repo_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  repo_full_name TEXT NOT NULL,
  default_branch TEXT,
  permissions_level TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT repo_connections_workspace_repo_unique 
    UNIQUE (workspace_id, repo_full_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repo_connections_workspace 
  ON sv.repo_connections(workspace_id);
*/

---
-- Verification Queries
---
-- Use these queries to verify the tables exist and have the correct structure

-- Check if github_connections table exists
/*
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'sv' 
  AND table_name = 'github_connections'
);
*/

-- Check if repo_connections table exists
/*
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'sv' 
  AND table_name = 'repo_connections'
);
*/

-- View github_connections table structure
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'sv' 
AND table_name = 'github_connections'
ORDER BY ordinal_position;
*/

-- View repo_connections table structure
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'sv' 
AND table_name = 'repo_connections'
ORDER BY ordinal_position;
*/

-- View constraints on github_connections
/*
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'sv' 
AND table_name = 'github_connections';
*/

-- View constraints on repo_connections
/*
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'sv' 
AND table_name = 'repo_connections';
*/
