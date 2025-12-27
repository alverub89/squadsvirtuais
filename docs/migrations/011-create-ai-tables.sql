-- Migration: Create AI-related tables
-- Date: 2025-12-27
-- Purpose: Support AI structure proposals, prompt management, and execution tracking

-- Table: sv.ai_prompts
-- Purpose: Catalog of AI prompts
CREATE TABLE IF NOT EXISTS sv.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ai_prompts_category_check 
    CHECK (category IN ('STRUCTURE_PROPOSAL', 'REFINEMENT', 'ANALYSIS'))
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_category 
  ON sv.ai_prompts(category);

-- Table: sv.ai_prompt_versions
-- Purpose: Version control for prompts
CREATE TABLE IF NOT EXISTS sv.ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES sv.ai_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  system_instructions TEXT,
  model_name TEXT DEFAULT 'gpt-4',
  temperature DECIMAL(2,1) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES sv.users(id),
  
  CONSTRAINT ai_prompt_versions_unique 
    UNIQUE (prompt_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt 
  ON sv.ai_prompt_versions(prompt_id);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_active 
  ON sv.ai_prompt_versions(prompt_id, is_active) 
  WHERE is_active = true;

-- Table: sv.ai_structure_proposals
-- Purpose: Store AI-generated structure proposals for squads
CREATE TABLE IF NOT EXISTS sv.ai_structure_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES sv.decisions(id),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  source_context TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  proposal_payload JSONB NOT NULL,
  uncertainties JSONB,
  model_name TEXT,
  prompt_version UUID REFERENCES sv.ai_prompt_versions(id),
  created_by_user_id UUID REFERENCES sv.users(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  confirmed_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ai_proposals_source_context_check 
    CHECK (source_context IN ('PROBLEM', 'BACKLOG', 'BOTH')),
  
  CONSTRAINT ai_proposals_status_check 
    CHECK (status IN ('DRAFT', 'CONFIRMED', 'DISCARDED'))
);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_squad 
  ON sv.ai_structure_proposals(squad_id);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_workspace 
  ON sv.ai_structure_proposals(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_status 
  ON sv.ai_structure_proposals(squad_id, status);

-- Table: sv.ai_prompt_executions
-- Purpose: Track all AI prompt executions for learning and debugging
CREATE TABLE IF NOT EXISTS sv.ai_prompt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID REFERENCES sv.ai_prompt_versions(id),
  proposal_id UUID REFERENCES sv.ai_structure_proposals(id),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by_user_id UUID REFERENCES sv.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_executions_proposal 
  ON sv.ai_prompt_executions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_ai_executions_workspace 
  ON sv.ai_prompt_executions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ai_executions_executed_at 
  ON sv.ai_prompt_executions(executed_at DESC);
