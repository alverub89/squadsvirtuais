-- Migration: Create tables for Squad Detail Screen
-- Date: 2025-12-27
-- Purpose: Support Squad Overview functionality with phases, issues, personas, decisions, and squad members

-- Table: sv.phases
-- Purpose: Track phases/stages of the squad's method
CREATE TABLE IF NOT EXISTS sv.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phases_squad 
  ON sv.phases(squad_id);

CREATE INDEX IF NOT EXISTS idx_phases_order 
  ON sv.phases(squad_id, order_index);

-- Table: sv.issues
-- Purpose: Track issues/tasks within a squad
CREATE TABLE IF NOT EXISTS sv.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_squad 
  ON sv.issues(squad_id);

-- Table: sv.personas
-- Purpose: Store personas defined for the squad
CREATE TABLE IF NOT EXISTS sv.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_squad 
  ON sv.personas(squad_id);

CREATE INDEX IF NOT EXISTS idx_personas_active 
  ON sv.personas(squad_id, active);

-- Table: sv.decisions
-- Purpose: Track key decisions made within the squad
CREATE TABLE IF NOT EXISTS sv.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_by_role TEXT,
  created_by_user_id UUID REFERENCES sv.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_squad 
  ON sv.decisions(squad_id);

CREATE INDEX IF NOT EXISTS idx_decisions_created_at 
  ON sv.decisions(squad_id, created_at DESC);

-- Table: sv.squad_members
-- Purpose: Track members assigned to a squad with their roles
CREATE TABLE IF NOT EXISTS sv.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES sv.users(id) ON DELETE CASCADE,
  role_code TEXT,
  role_label TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squad_members_unique 
    UNIQUE (squad_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_members_squad 
  ON sv.squad_members(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_members_user 
  ON sv.squad_members(user_id);

CREATE INDEX IF NOT EXISTS idx_squad_members_active 
  ON sv.squad_members(squad_id, active);
