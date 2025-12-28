-- Migration: Create tables for AI suggestion approval workflow
-- Date: 2025-12-28
-- Purpose: Track AI suggestions and their approval/rejection by users
-- Ensures no data is persisted without explicit human approval

-- Table: sv.suggestion_proposals
-- Purpose: Store individual AI suggestions pending approval
CREATE TABLE IF NOT EXISTS sv.suggestion_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES sv.ai_structure_proposals(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  
  -- Type of suggestion (decision_context, problem_maturity, persona, governance, etc.)
  suggestion_type TEXT NOT NULL,
  
  -- Suggested data payload (JSON)
  suggestion_payload JSONB NOT NULL,
  
  -- Status: pending, approved, approved_with_edits, rejected
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Order for sequential presentation
  display_order INTEGER NOT NULL,
  
  -- Edited version (if user modified before approval)
  edited_payload JSONB,
  
  -- Decision tracking
  decided_at TIMESTAMPTZ,
  decided_by_user_id UUID REFERENCES sv.users(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT suggestion_proposals_type_check 
    CHECK (suggestion_type IN (
      'decision_context',
      'problem_maturity',
      'persona',
      'governance',
      'squad_structure_role',
      'phase',
      'critical_unknown',
      'execution_model',
      'validation_strategy',
      'readiness_assessment'
    )),
  
  CONSTRAINT suggestion_proposals_status_check 
    CHECK (status IN ('pending', 'approved', 'approved_with_edits', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_suggestion_proposals_proposal 
  ON sv.suggestion_proposals(proposal_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_proposals_squad 
  ON sv.suggestion_proposals(squad_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_proposals_status 
  ON sv.suggestion_proposals(squad_id, status);

CREATE INDEX IF NOT EXISTS idx_suggestion_proposals_type 
  ON sv.suggestion_proposals(squad_id, suggestion_type);

-- Table: sv.suggestion_decisions
-- Purpose: Track approval/rejection history for audit and learning
CREATE TABLE IF NOT EXISTS sv.suggestion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_proposal_id UUID NOT NULL REFERENCES sv.suggestion_proposals(id) ON DELETE CASCADE,
  
  -- Action taken: approved, approved_with_edits, rejected
  action TEXT NOT NULL,
  
  -- User who made the decision
  user_id UUID NOT NULL REFERENCES sv.users(id),
  
  -- Reason for rejection or edits
  reason TEXT,
  
  -- Changes made (diff between original and edited)
  changes_summary JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT suggestion_decisions_action_check 
    CHECK (action IN ('approved', 'approved_with_edits', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_suggestion_decisions_proposal 
  ON sv.suggestion_decisions(suggestion_proposal_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_decisions_user 
  ON sv.suggestion_decisions(user_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_decisions_created_at 
  ON sv.suggestion_decisions(created_at DESC);
