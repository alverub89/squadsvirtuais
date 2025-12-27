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
Personas defined for the squad.

```sql
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
         │       ├─< (N) personas     │
         │       ├─< (N) decisions    │
         │       └─< (N) squad_members >─┐
         │                            │   │
         │ connections                │   │
         ├─< (N) github_connections   │   │
         └─< (N) repo_connections     │   │
                                      │   │
users (N) ────────────────────────────┴───┘
```

## Key Constraints

1. **No orphan squads**: Every squad must have a valid `workspace_id`
2. **User membership**: Users can only create/access squads in workspaces where they are members
3. **Unique identities**: Each OAuth identity can only be linked to one user
4. **Workspace membership**: Each user can only be a member once per workspace
5. **Squad status**: Status must be one of the predefined values

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
