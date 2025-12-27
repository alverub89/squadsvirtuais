# Personas Feature - Implementation Documentation

## Overview

This document describes the implementation of workspace-level personas with squad associations in the Squads Virtuais application.

## Concept

Personas in Squads Virtuais are not fictional or decorative. They represent customers, stakeholders, or squad members and can act in multiple squads with different focuses depending on the problem.

### Key Principles

1. **Workspace-Level**: Personas exist at the workspace level and are reusable across multiple squads
2. **Contextual Association**: The same persona can be associated with different squads with specific contexts
3. **No Duplication**: Personas are never duplicated per squad, maintaining a single source of truth
4. **Influence-Driven**: Each persona has an influence level that's visible across all their associations

## Database Schema

### sv.personas (Workspace-Level)

Personas are defined at the workspace level with the following fields:

```sql
CREATE TABLE sv.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                    -- cliente | stakeholder | membro_squad
  subtype TEXT,                          -- Free text (e.g., "jurídico", "PF", "product")
  goals TEXT,                            -- What they want to achieve
  pain_points TEXT,                      -- Their problems/frustrations
  behaviors TEXT,                        -- How they behave
  influence_level TEXT,                  -- Their level of influence
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT personas_type_check 
    CHECK (type IN ('cliente', 'stakeholder', 'membro_squad'))
);
```

**Important Notes:**
- `influence_level` is global to the persona, not per squad
- `type` must be one of three predefined values
- `subtype` is free text for additional categorization

### sv.squad_personas (Association Table)

Links personas to squads with contextual information:

```sql
CREATE TABLE sv.squad_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES sv.squads(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES sv.personas(id) ON DELETE CASCADE,
  context_description TEXT,              -- How this persona acts in this specific problem
  focus TEXT,                            -- Focus for this squad (e.g., "risk", "experience")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squad_personas_unique 
    UNIQUE (squad_id, persona_id)
);
```

**Important Notes:**
- `UNIQUE` constraint prevents duplicate associations
- Both tables cascade on delete to maintain referential integrity

## API Endpoints

### Personas Management

#### POST /personas
Create a new persona at workspace level.

**Request Body:**
```json
{
  "workspace_id": "uuid",
  "name": "string",
  "type": "cliente|stakeholder|membro_squad",
  "subtype": "string (optional)",
  "goals": "string (optional)",
  "pain_points": "string (optional)",
  "behaviors": "string (optional)",
  "influence_level": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "persona": {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "string",
    "type": "string",
    ...
  }
}
```

#### GET /personas?workspace_id={uuid}
List all personas in a workspace.

**Response:**
```json
{
  "personas": [
    {
      "id": "uuid",
      "name": "string",
      "type": "string",
      "squad_count": 3,
      ...
    }
  ]
}
```

#### GET /personas/{id}
Get a specific persona with all squad associations.

**Response:**
```json
{
  "persona": { /* persona fields */ },
  "squad_associations": [
    {
      "squad_id": "uuid",
      "squad_name": "string",
      "problem_statement": "string",
      "context_description": "string",
      "focus": "string"
    }
  ]
}
```

#### PUT /personas/{id}
Update a persona's information.

**Request Body:** (all fields optional)
```json
{
  "name": "string",
  "type": "string",
  "subtype": "string",
  "goals": "string",
  "pain_points": "string",
  "behaviors": "string",
  "influence_level": "string",
  "active": boolean
}
```

### Squad-Persona Associations

#### POST /squad-personas
Associate a persona with a squad.

**Request Body:**
```json
{
  "squad_id": "uuid",
  "persona_id": "uuid",
  "context_description": "string (optional)",
  "focus": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "association": {
    "id": "uuid",
    "squad_id": "uuid",
    "persona_id": "uuid",
    "context_description": "string",
    "focus": "string"
  }
}
```

**Error Cases:**
- 400: Persona already associated with this squad
- 400: Persona not found in workspace
- 404: Squad not found

#### GET /squad-personas?squad_id={uuid}
Get all personas associated with a squad.

**Response:**
```json
{
  "personas": [
    {
      "association_id": "uuid",
      "persona_id": "uuid",
      "name": "string",
      "type": "string",
      "context_description": "string",
      "focus": "string",
      ...
    }
  ]
}
```

#### PUT /squad-personas/{id}
Update the context of a squad-persona association.

**Request Body:** (all fields optional)
```json
{
  "context_description": "string",
  "focus": "string"
}
```

#### DELETE /squad-personas/{id}
Remove a persona from a squad.

**Important:** This only removes the association, the persona continues to exist in the workspace.

## Frontend Components

### PersonaCard Component

Located: `src/components/PersonaCard.jsx`

**Props:**
- `squadId`: UUID of the squad
- `workspaceId`: UUID of the workspace
- `onUpdate`: Callback function when personas change

**Features:**
1. Displays all personas associated with the squad
2. Shows persona details: type, subtype, influence, goals, pain points, behaviors
3. Shows contextual information: focus and context description
4. Allows adding existing workspace personas to the squad
5. Allows removing personas from the squad

**Usage:**
```jsx
<PersonaCard 
  squadId={squadId}
  workspaceId={workspaceId}
  onUpdate={loadSquadOverview}
/>
```

### Integration in SquadDetail

The PersonaCard is displayed in the SquadDetail page, positioned between the ProblemStatementCard and the main content grid. This placement emphasizes that personas validate decisions related to the business problem.

## UI/UX Design

### Design Principles

Following the "ambiente de raciocínio" (thinking environment) style:
- **Calm and Professional**: No gamification, no playful icons
- **Long-Form Reading**: Designed for thoughtful reading and reflection
- **Clear Hierarchy**: Visual hierarchy emphasizes important information
- **Discrete Actions**: Secondary actions are present but not intrusive

### Visual Elements

- **Type Badges**: Color-coded badges for persona types (cliente, stakeholder, membro_squad)
- **Influence Display**: Clearly visible influence level
- **Context Highlighting**: Context description has a left border accent
- **Expandable Details**: Goals, pain points, and behaviors are shown in detail

### Color Scheme

Uses CSS custom properties from the main theme:
- `--bg-primary`: Card backgrounds
- `--bg-secondary`: Item backgrounds
- `--accent-color`: Type badges and accents
- `--text-primary`, `--text-secondary`, `--text-tertiary`: Text hierarchy

## Security Considerations

### Authentication & Authorization

All endpoints:
1. Require authentication via JWT token
2. Validate workspace membership before any operation
3. Never expose data from other workspaces

### Data Validation

- Type validation on persona type (must be one of three values)
- Unique constraint prevents duplicate squad-persona associations
- Cascade deletes maintain referential integrity
- All text inputs are trimmed and sanitized

### SQL Injection Protection

All database queries use parameterized statements via the `query()` function from `_lib/db.js`.

## Migration Path

### From Old Schema

The migration `003-create-workspace-personas.sql` performs these steps:

1. **Drops** the old squad-specific personas table (WARNING: data loss)
2. **Creates** new workspace-level personas table
3. **Creates** squad_personas association table

**Important:** If you have existing persona data, back it up first and create a custom migration script to:
1. Extract personas from old table
2. Deduplicate by name/workspace
3. Create associations for each old persona-squad relationship

### Running the Migration

```sql
-- Connect to your database
psql $DATABASE_URL

-- Run the migration
\i docs/migrations/003-create-workspace-personas.sql
```

## Testing Checklist

### Backend Tests

- [ ] Create persona with all fields
- [ ] Create persona with only required fields
- [ ] List personas in workspace
- [ ] Update persona
- [ ] Get persona with associations
- [ ] Associate persona with squad
- [ ] Associate same persona with multiple squads
- [ ] Try to associate same persona twice (should fail)
- [ ] Remove persona from squad
- [ ] Delete persona (should cascade to associations)
- [ ] Try to access persona from different workspace (should fail)

### Frontend Tests

- [ ] PersonaCard displays on squad detail page
- [ ] Add persona form appears when clicking "Adicionar Persona"
- [ ] Dropdown shows only available personas (not already in squad)
- [ ] Adding persona with context works
- [ ] Removing persona from squad works
- [ ] Persona details display correctly
- [ ] Type badges show correct colors
- [ ] Influence level is visible
- [ ] Context description has proper styling

## Future Enhancements

### Planned Features (from issue)

1. **AI Validation**: Use personas to validate decisions and backlog items
2. **Decision Log**: Link decisions to persona validation
3. **Backlog Quality**: Validate backlog items against persona needs
4. **Persona Detail Page**: Full view of persona with all squads and validations

### Technical Improvements

1. **Persona Templates**: Pre-defined persona templates for common types
2. **Bulk Operations**: Add multiple personas to a squad at once
3. **Search/Filter**: Search personas by name, type, or attributes
4. **Analytics**: Track which personas are most active across squads
5. **Persona Relationships**: Model relationships between personas

## Troubleshooting

### Common Issues

**Issue**: Persona not appearing in dropdown
- **Cause**: Persona might already be associated with the squad
- **Solution**: Check the personas list, remove the association if needed

**Issue**: Cannot delete persona
- **Cause**: Persona is associated with squads
- **Solution**: Remove all squad associations first, or use CASCADE delete

**Issue**: Duplicate persona error
- **Cause**: Trying to associate same persona twice
- **Solution**: Check existing associations, update context instead

**Issue**: Access denied error
- **Cause**: User not member of workspace
- **Solution**: Verify workspace membership

## References

- Database Schema: `docs/database-schema.md`
- Migration: `docs/migrations/003-create-workspace-personas.sql`
- Backend Code: `netlify/functions/personas.js`, `netlify/functions/squad-personas.js`
- Frontend Code: `src/components/PersonaCard.jsx`
- Original Issue: See problem statement for full requirements
