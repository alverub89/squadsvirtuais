-- Migration: Make squad_id optional and add workspace_id to problem_statements
-- Date: 2025-12-30
-- Purpose: Allow problems to exist independently without squad association initially

-- Step 1: Add workspace_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sv' 
      AND table_name = 'problem_statements' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE sv.problem_statements 
      ADD COLUMN workspace_id UUID;
  END IF;
END $$;

-- Step 2: Populate workspace_id from squad_id for existing records
UPDATE sv.problem_statements ps
SET workspace_id = s.workspace_id
FROM sv.squads s
WHERE ps.squad_id = s.id
  AND ps.workspace_id IS NULL;

-- Step 3: Make workspace_id NOT NULL after populating
ALTER TABLE sv.problem_statements 
  ALTER COLUMN workspace_id SET NOT NULL;

-- Step 4: Add foreign key constraint for workspace_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'sv' 
      AND table_name = 'problem_statements' 
      AND constraint_name = 'problem_statements_workspace_fk'
  ) THEN
    ALTER TABLE sv.problem_statements 
      ADD CONSTRAINT problem_statements_workspace_fk 
      FOREIGN KEY (workspace_id) REFERENCES sv.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Make squad_id nullable (drop NOT NULL constraint if exists)
ALTER TABLE sv.problem_statements 
  ALTER COLUMN squad_id DROP NOT NULL;

-- Step 6: Add index on workspace_id for performance
CREATE INDEX IF NOT EXISTS idx_problem_statements_workspace 
  ON sv.problem_statements(workspace_id);

-- Add comments to explain the schema
COMMENT ON COLUMN sv.problem_statements.workspace_id IS 'Workspace this problem belongs to - always required';
COMMENT ON COLUMN sv.problem_statements.squad_id IS 'Squad this problem is associated with - optional, can be assigned later';
