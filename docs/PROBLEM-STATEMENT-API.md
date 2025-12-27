# Problem Statement API

## Overview

The Problem Statement API allows squads to define and manage the business problem they exist to solve. This feature uses the existing `sv.decisions` table to store problem statements without requiring database migrations.

## Key Design Decisions

### Storage Strategy

**No new tables required** - Problem statements are stored as special decision records in `sv.decisions`:
- Main problem statement: `title = 'Problem Statement'`
- History entries: `title = 'Problem Statement atualizado'`

This approach provides:
- Zero database migrations
- Built-in history tracking via decision logs
- Reuse of existing authorization logic
- Audit trail for AI and compliance

### Quality Assessment

Quality is calculated dynamically (not persisted) based on:
- **Title**: Minimum 10 characters
- **Narrative**: Minimum 280 characters (like a detailed tweet)
- **Success Metrics**: Required for measurable outcomes
- **Constraints**: Optional but recommended
- **Assumptions**: Optional but recommended
- **Open Questions**: Optional but recommended

Quality alerts are **neutral and non-blocking** - they guide but never prevent action.

## Endpoints

### POST /problem-statements

Create a new problem statement for a squad.

**Request:**
```json
POST /.netlify/functions/problem-statements
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "squad_id": "uuid",
  "title": "string (required)",
  "narrative": "string (required)",
  "success_metrics": "string (optional)",
  "constraints": "string (optional)",
  "assumptions": "string (optional)",
  "open_questions": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "ok": true,
  "problem_statement": {
    "id": "uuid",
    "squad_id": "uuid",
    "title": "string",
    "narrative": "string",
    "success_metrics": "string",
    "constraints": "string",
    "assumptions": "string",
    "open_questions": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "quality": {
      "status": "needs_improvement" | "good",
      "message": "string",
      "issues": ["string"],
      "suggestions": ["string"]
    }
  }
}
```

**Error Responses:**
- `400` - Missing required fields or squad already has a problem statement
- `401` - Not authenticated
- `403` - User not member of workspace
- `404` - Squad not found

**Business Rules:**
- Only one active problem statement per squad
- User must be a workspace member
- Title and narrative are required

### GET /problem-statements?squad_id={uuid}

Get the current problem statement for a squad.

**Request:**
```
GET /.netlify/functions/problem-statements?squad_id={uuid}
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "problem_statement": {
    "id": "uuid",
    "squad_id": "uuid",
    "title": "string",
    "narrative": "string",
    "success_metrics": "string",
    "constraints": "string",
    "assumptions": "string",
    "open_questions": "string",
    "updated_at": "ISO8601",
    "quality": {
      "status": "needs_improvement" | "good",
      "message": "string",
      "issues": ["string"],
      "suggestions": ["string"]
    }
  }
}
```

**Response (200 OK - No problem statement):**
```json
{
  "problem_statement": null
}
```

**Error Responses:**
- `400` - Missing squad_id parameter
- `401` - Not authenticated
- `403` - User not member of workspace
- `404` - Squad not found

### PUT /problem-statements/{id}

Update an existing problem statement. Creates a history entry before updating.

**Request:**
```json
PUT /.netlify/functions/problem-statements/{id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "string (optional)",
  "narrative": "string (optional)",
  "success_metrics": "string (optional)",
  "constraints": "string (optional)",
  "assumptions": "string (optional)",
  "open_questions": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "problem_statement": {
    "id": "uuid",
    "squad_id": "uuid",
    "title": "string",
    "narrative": "string",
    "success_metrics": "string",
    "constraints": "string",
    "assumptions": "string",
    "open_questions": "string",
    "updated_at": "ISO8601",
    "quality": {
      "status": "needs_improvement" | "good",
      "message": "string",
      "issues": ["string"],
      "suggestions": ["string"]
    }
  }
}
```

**Error Responses:**
- `400` - Invalid JSON
- `401` - Not authenticated
- `403` - User not member of workspace
- `404` - Problem statement not found

**Business Rules:**
- Automatically creates history entry in `sv.decisions` with before/after snapshot
- Only provided fields are updated (partial updates supported)
- User must be a workspace member

### GET /decisions?squad_id={uuid}&filter=problem_statement

List decision history for problem statements.

**Request:**
```
GET /.netlify/functions/decisions?squad_id={uuid}&filter=problem_statement
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "decisions": [
    {
      "id": "uuid",
      "title": "Problem Statement atualizado",
      "decision": {
        "before": { /* old problem statement */ },
        "after": { /* new problem statement */ },
        "changed_at": "ISO8601"
      },
      "created_by_role": "User",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "count": 5
}
```

**Error Responses:**
- `400` - Missing squad_id parameter
- `401` - Not authenticated
- `403` - User not member of workspace
- `404` - Squad not found

## Quality Calculation

Quality is assessed based on completeness and detail:

### Issues (needs_improvement)

Triggers when critical fields are weak:
- Title < 10 characters
- Narrative < 280 characters
- Success metrics empty

### Suggestions (good status)

Optional improvements:
- Add constraints
- Add assumptions
- Add open questions

### Quality Status Values

- `needs_improvement` - Critical fields need attention
- `good` - All critical fields present, optional fields suggested

### UI Presentation

- Yellow background for `needs_improvement`
- Green background for `good`
- Non-blocking message (never prevents action)
- Bullet list of specific issues/suggestions

## Frontend Integration

### Component: ProblemStatementCard

**Location:** `/src/components/ProblemStatementCard.jsx`

**Props:**
- `squadId` (string, required) - Squad UUID
- `onUpdate` (function, optional) - Callback after create/update

**States:**
1. **Loading** - Fetching data
2. **Empty** - No problem statement (shows CTA "Definir problema")
3. **Display** - Shows problem statement with quality alert
4. **Editing** - Form to create/edit problem statement

**Features:**
- Inline form (no modal)
- Real-time quality feedback
- History toggle
- Relative time display ("Há 2 dias")
- Auto-reload after save

### Integration in Squad Detail

```jsx
import ProblemStatementCard from '../components/ProblemStatementCard'

// In SquadDetail.jsx
<ProblemStatementCard 
  squadId={squadId} 
  onUpdate={loadSquadOverview}
/>
```

Place after indicator cards, before main content grid.

## Database Schema (No Changes)

Uses existing `sv.decisions` table:

```sql
-- Main problem statement record
INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id)
VALUES ($1, 'Problem Statement', $2, $3)

-- History entry on update
INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id)
VALUES ($1, 'Problem Statement atualizado', $2, $3)
```

**decision field contains JSON:**
```json
{
  "title": "string",
  "narrative": "string",
  "success_metrics": "string",
  "constraints": "string",
  "assumptions": "string",
  "open_questions": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Authorization

All endpoints verify:
1. User is authenticated (valid JWT)
2. Squad exists
3. User is member of squad's workspace

Uses existing `sv.workspace_members` table for authorization.

## Timeline Integration

The squad overview timeline now checks for problem statement:

```javascript
// Before: state = "done" (always)
// After: state = hasProblemStatement ? "done" : "next"
```

"Análise do Problema" step shows:
- **Done** (green) - Problem statement exists
- **Current** (blue) - No problem but other steps started
- **Next** (gray) - First step to complete

## Testing Checklist

### Backend
- [ ] Create problem statement with all fields
- [ ] Create problem statement with minimum fields
- [ ] Get problem statement (exists)
- [ ] Get problem statement (doesn't exist)
- [ ] Update problem statement (partial update)
- [ ] Update problem statement (full update)
- [ ] List history entries
- [ ] Authorization: non-member cannot access
- [ ] Authorization: invalid token rejected
- [ ] Cannot create duplicate problem statement

### Frontend
- [ ] Empty state displays correctly
- [ ] Form validation works
- [ ] Create problem statement successful
- [ ] Display problem statement with all fields
- [ ] Display problem statement with partial fields
- [ ] Edit problem statement successful
- [ ] Cancel edit restores original
- [ ] Quality alerts display correctly
- [ ] History toggle works
- [ ] History displays entries
- [ ] Relative time updates
- [ ] Timeline reflects problem statement state

### Integration
- [ ] Problem statement persists after page reload
- [ ] Timeline updates when problem statement created
- [ ] Overview callback triggered after save
- [ ] Multiple squads maintain separate problem statements

## Examples

### Example 1: Create Problem Statement

```javascript
const response = await fetch('/.netlify/functions/problem-statements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    squad_id: 'abc-123',
    title: 'Usuários não conseguem encontrar produtos rapidamente',
    narrative: 'Nossa plataforma de e-commerce possui mais de 10.000 produtos, mas a busca atual leva em média 8 segundos para retornar resultados. Dados de analytics mostram que 45% dos usuários abandonam a busca após 5 segundos. Isso impacta diretamente nossa taxa de conversão e receita. O problema é crítico para o Q4 onde esperamos aumento de 200% no tráfego.',
    success_metrics: 'Tempo médio de busca < 3s, Taxa de abandono < 15%, Aumento de 30% na conversão',
    constraints: 'Budget de $50k, Infraestrutura AWS existente, Não podemos migrar banco de dados durante Q4',
    assumptions: 'Usuários querem busca rápida mais que busca precisa, Mobile representa 70% do tráfego',
    open_questions: 'Qual engine de busca usar? Elasticsearch vs Algolia vs TypeSense?'
  })
})
```

### Example 2: Update Problem Statement

```javascript
const response = await fetch('/.netlify/functions/problem-statements/ps-456', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    success_metrics: 'Tempo médio de busca < 2s (melhoramos de 3s), Taxa de abandono < 10%, Aumento de 40% na conversão'
  })
})
```

## Best Practices

### Writing Problem Statements

**Title:**
- Be specific and measurable
- Focus on the problem, not the solution
- Keep it concise (1 sentence)

**Narrative:**
- Start with context (what's happening now)
- Explain the impact (why it matters)
- Include data/evidence when possible
- Describe who is affected
- Aim for 280+ characters for quality status

**Success Metrics:**
- Use quantifiable measures
- Include baseline and target
- Focus on outcomes, not outputs

**Constraints:**
- Budget limitations
- Technical constraints
- Timeline restrictions
- Regulatory requirements

**Assumptions:**
- What you believe is true but haven't validated
- User behavior assumptions
- Market assumptions

**Open Questions:**
- What you need to learn
- Decisions to be made
- Areas of uncertainty

### Updating Problem Statements

Problem statements should evolve as you learn:
- Update when assumptions are validated/invalidated
- Refine when you discover new constraints
- Adjust success metrics based on data
- Add questions as new uncertainties emerge

History is preserved automatically - embrace iteration!

## Troubleshooting

### Problem statement not appearing

Check:
1. Squad ID is correct
2. User is workspace member
3. JWT token is valid
4. Network request succeeded

### Cannot create duplicate

Error: "Esta squad já possui um Problem Statement"
- Use PUT to update instead of POST
- Check if problem statement already exists with GET

### Quality always shows issues

Review:
- Title length (min 10 chars)
- Narrative length (min 280 chars)
- Success metrics not empty

### History not showing

Verify:
1. At least one update has been made
2. Filter parameter is correct
3. Decision records exist with "atualizado" in title
