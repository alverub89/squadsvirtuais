# Database Schema

This document describes the database schema for Squads Virtuais.

## Schema: `sv` (squads virtuais)

All tables are in the `sv` schema.

## Tables

### sv.users
User accounts in the system.

```sql
CREATE TABLE IF NOT EXISTS sv.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

### sv.user_identities
OAuth identities linked to users (Google, GitHub).

```sql
CREATE TABLE IF NOT EXISTS sv.user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sv.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_identities_provider_unique 
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user 
  ON sv.user_identities(user_id);
```

### sv.workspaces
Workspaces organize squads and teams.

```sql
CREATE TABLE IF NOT EXISTS sv.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  owner_user_id UUID NOT NULL REFERENCES sv.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner 
  ON sv.workspaces(owner_user_id);
```

### sv.workspace_members
Members of workspaces.

```sql
CREATE TABLE IF NOT EXISTS sv.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES sv.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT workspace_members_unique 
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace 
  ON sv.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user 
  ON sv.workspace_members(user_id);
```

### sv.squads
Squads are the central unit of work within a workspace.

A squad always belongs to a workspace and organizes the entire method: business problem, personas, phases, backlog, and repository integration.

**Status values:**
- `rascunho` - Initial draft state (default)
- `ativa` - Active squad
- `aguardando_execucao` - Waiting for execution
- `em_revisao` - Under review
- `concluida` - Completed
- `pausada` - Paused

```sql
CREATE TABLE IF NOT EXISTS sv.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squads_status_check 
    CHECK (status IN ('rascunho', 'ativa', 'aguardando_execucao', 'em_revisao', 'concluida', 'pausada'))
);

CREATE INDEX IF NOT EXISTS idx_squads_workspace 
  ON sv.squads(workspace_id);
```

### sv.phases
Phases/stages of the squad's method.

```sql
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
```

### sv.issues
Issues/tasks within a squad.

```sql
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
```

### sv.personas
Personas defined at the workspace level. Personas represent customers, stakeholders, or squad members and can be associated with multiple squads with different contexts.

**Type values:**
- `cliente` - Customer persona
- `stakeholder` - Stakeholder persona
- `membro_squad` - Squad member persona

```sql
CREATE TABLE IF NOT EXISTS sv.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  goals TEXT,
  pain_points TEXT,
  behaviors TEXT,
  influence_level TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT personas_type_check 
    CHECK (type IN ('cliente', 'stakeholder', 'membro_squad'))
);

CREATE INDEX IF NOT EXISTS idx_personas_workspace 
  ON sv.personas(workspace_id);

CREATE INDEX IF NOT EXISTS idx_personas_active 
  ON sv.personas(workspace_id, active);
```

### sv.squad_personas
Association table linking personas to squads with contextual information.

```sql
CREATE TABLE IF NOT EXISTS sv.squad_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES sv.personas(id) ON DELETE CASCADE,
  context_description TEXT,
  focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squad_personas_unique 
    UNIQUE (squad_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_personas_squad 
  ON sv.squad_personas(squad_id);

CREATE INDEX IF NOT EXISTS idx_squad_personas_persona 
  ON sv.squad_personas(persona_id);
```

### sv.decisions
Key decisions made within the squad.

```sql
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
```

### sv.squad_members
Members assigned to a squad with their roles.

```sql
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
```

### sv.github_connections
GitHub OAuth connections for workspaces.

```sql
CREATE TABLE IF NOT EXISTS sv.github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider_user_id TEXT NOT NULL,
  login TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT github_connections_workspace_provider_unique 
    UNIQUE (workspace_id, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_connections_workspace 
  ON sv.github_connections(workspace_id);
```

### sv.repo_connections
GitHub repositories connected to workspaces.

```sql
CREATE TABLE IF NOT EXISTS sv.repo_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  repo_full_name TEXT NOT NULL,
  default_branch TEXT,
  permissions_level TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT repo_connections_workspace_repo_unique 
    UNIQUE (workspace_id, repo_full_name)
);

CREATE INDEX IF NOT EXISTS idx_repo_connections_workspace 
  ON sv.repo_connections(workspace_id);
```

### sv.roles
Global catalog of role specialties. Represents global specialties and serves as AI learning base.

```sql
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

CREATE INDEX IF NOT EXISTS idx_roles_code 
  ON sv.roles(code);
```

### sv.workspace_roles
Workspace-specific role extensions. Allows custom roles per workspace without polluting global catalog.

```sql
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
  
  CONSTRAINT workspace_roles_code_unique 
    UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace 
  ON sv.workspace_roles(workspace_id);
```

### sv.squad_roles
Defines which roles (global or workspace) are active in a squad. A role entry must reference either `role_id` OR `workspace_role_id`, not both.

```sql
CREATE TABLE IF NOT EXISTS sv.squad_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  role_id UUID REFERENCES sv.roles(id) ON DELETE CASCADE,
  workspace_role_id UUID REFERENCES sv.workspace_roles(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squad_roles_role_reference_check
    CHECK (
      (role_id IS NOT NULL AND workspace_role_id IS NULL) OR
      (role_id IS NULL AND workspace_role_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_squad_roles_squad 
  ON sv.squad_roles(squad_id);
```

### sv.squad_member_role_assignments
Associates human users with role specialties in squads. **Business Rule**: One user can have only 1 active role per squad.

```sql
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

CREATE UNIQUE INDEX idx_squad_member_role_unique_active 
  ON sv.squad_member_role_assignments(squad_member_id, squad_id) 
  WHERE active = true;
```

### sv.squad_validation_matrix_versions
Version control for validation matrix configurations. **Never edit old versions**, always create new ones.

```sql
CREATE TABLE IF NOT EXISTS sv.squad_validation_matrix_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  description TEXT,
  created_by_user_id UUID REFERENCES sv.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squad_validation_matrix_versions_unique 
    UNIQUE (squad_id, version)
);

CREATE INDEX IF NOT EXISTS idx_validation_matrix_versions_squad 
  ON sv.squad_validation_matrix_versions(squad_id);
```

### sv.squad_validation_matrix_entries
Defines role ↔ persona validation rules per checkpoint type. Governs which roles validate which personas at which checkpoints.

**Checkpoint types**: `ISSUE`, `DECISION`, `PHASE`, `MAP`  
**Requirement levels**: `REQUIRED`, `OPTIONAL`

```sql
CREATE TABLE IF NOT EXISTS sv.squad_validation_matrix_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES sv.squad_validation_matrix_versions(id) ON DELETE CASCADE,
  squad_role_id UUID NOT NULL REFERENCES sv.squad_roles(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES sv.personas(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL,
  requirement_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT validation_matrix_checkpoint_type_check 
    CHECK (checkpoint_type IN ('ISSUE', 'DECISION', 'PHASE', 'MAP')),
  
  CONSTRAINT validation_matrix_requirement_level_check 
    CHECK (requirement_level IN ('REQUIRED', 'OPTIONAL')),
  
  CONSTRAINT validation_matrix_entries_unique 
    UNIQUE (version_id, squad_role_id, persona_id, checkpoint_type)
);

CREATE INDEX IF NOT EXISTS idx_validation_matrix_entries_version 
  ON sv.squad_validation_matrix_entries(version_id);
```

### sv.ai_prompts
Catalog of AI prompts for various use cases.

```sql
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
```

### sv.ai_prompt_versions
Version control for AI prompts. Each prompt can have multiple versions, but only one active at a time.

```sql
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
```

### sv.ai_structure_proposals
Stores AI-generated structure proposals for squads. Proposals include suggested workflow, roles, and personas.

**Status values:**
- `DRAFT` - Newly generated proposal, not yet confirmed
- `CONFIRMED` - User confirmed the proposal
- `DISCARDED` - User rejected the proposal

**Source context values:**
- `PROBLEM` - Based only on problem statement
- `BACKLOG` - Based on existing backlog
- `BOTH` - Based on problem and backlog

```sql
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
```

### sv.ai_prompt_executions
Tracks all AI prompt executions for cost monitoring, performance analysis, and learning.

```sql
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
```

## Relationships

```
users (1) ─────< (N) user_identities
  │
  │ owner
  └──> (N) workspaces
         │
         │ members
         ├─< (N) workspace_members >─┐
         │                            │
         │ squads                     │
         ├─< (N) squads               │
         │       │                    │
         │       ├─< (N) phases       │
         │       ├─< (N) issues       │
         │       ├─< (N) decisions    │
         │       ├─< (N) squad_members >───< (N) squad_member_role_assignments
         │       │                       │                   │
         │       ├─< (N) squad_roles ──────────────────────┘
         │       │       │
         │       ├─< (N) squad_validation_matrix_versions
         │       │           │
         │       │           └─< (N) squad_validation_matrix_entries
         │       │                       │
         │       └─< (N) squad_personas  │
         │                   │           │
         │ personas                      │
         ├─< (N) personas ───────────────┴───────────────────┘
         │
         │ roles
         ├─< (N) workspace_roles ───> squad_roles
         │                   
         │ connections                
         ├─< (N) github_connections   
         └─< (N) repo_connections     
                                      
roles (global) ──────────────────────> squad_roles
                                      
users (N) ──────────────────────────────┘
```

## Key Constraints

1. **No orphan squads**: Every squad must have a valid `workspace_id`
2. **User membership**: Users can only create/access squads in workspaces where they are members
3. **Unique identities**: Each OAuth identity can only be linked to one user
4. **Workspace membership**: Each user can only be a member once per workspace
5. **Squad status**: Status must be one of the predefined values
6. **Role reference**: A squad_role must reference either a global role OR a workspace role, not both
7. **One role per member**: A user can have only 1 active role per squad
8. **No duplicate roles**: A role cannot be active multiple times in the same squad
9. **Matrix versioning**: Validation matrix versions are incremental per squad and never edited
10. **Unique matrix entries**: No duplicate role-persona-checkpoint combinations within a version

## Verification Queries

Check if all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'sv'
ORDER BY table_name;
```

View table structure:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'sv' AND table_name = 'squads'
ORDER BY ordinal_position;
```

View constraints:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'sv' AND table_name = 'squads';
```

## AI-Related Tables

The schema also includes tables for AI-powered features:

- **`sv.ai_prompts`**: Catalog of AI prompts by category
- **`sv.ai_prompt_versions`**: Versioned prompts with parameters
- **`sv.ai_structure_proposals`**: AI-generated structure proposals for squads
- **`sv.ai_prompt_executions`**: Execution logs for learning and monitoring

Additional constraints for AI tables:
- **One active prompt version**: Only one version of each prompt can be active at a time
- **AI proposal status**: Proposals must be in DRAFT, CONFIRMED, or DISCARDED state
- **Source context**: Proposals must specify PROBLEM, BACKLOG, or BOTH as context

For detailed information about the AI Structure Proposal feature, see [AI-STRUCTURE-PROPOSAL-FEATURE.md](./AI-STRUCTURE-PROPOSAL-FEATURE.md).
