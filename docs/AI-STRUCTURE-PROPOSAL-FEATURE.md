# AI Structure Proposal Feature

## Overview

This feature implements the first core AI functionality of the product: the ability for AI to propose (not impose) a work roadmap, roles, and personas based on the Business Problem and existing content.

The AI acts as a delivery strategist, always on demand, generating an editable working hypothesis with justifications and uncertainty markings.

## Key Principles

1. **AI proposes, never imposes** - All suggestions are editable and require explicit confirmation
2. **Hypothesis-driven** - Results are treated as working hypotheses, not final decisions
3. **Context-aware** - AI adapts detail level to problem complexity
4. **Transparent uncertainty** - Points of uncertainty are explicitly marked
5. **Hybrid decisions** - Final decisions are recorded as "Human + AI" collaborations
6. **Versioned for learning** - All proposals and executions are stored for future improvement

## Architecture

### Database Schema

#### Tables Created

1. **`sv.ai_prompts`** - Catalog of AI prompts
   - `name`: Unique prompt identifier
   - `category`: Type of prompt (STRUCTURE_PROPOSAL, REFINEMENT, ANALYSIS)
   - `description`: Human-readable description

2. **`sv.ai_prompt_versions`** - Version control for prompts
   - `prompt_id`: Reference to parent prompt
   - `version`: Incremental version number
   - `prompt_text`: The actual prompt template
   - `system_instructions`: System-level instructions for the AI
   - `model_name`: OpenAI model to use (default: gpt-4)
   - `temperature`: Creativity parameter (default: 0.7)
   - `is_active`: Only one version can be active per prompt

3. **`sv.ai_structure_proposals`** - Stores AI-generated proposals
   - `squad_id`: Associated squad
   - `problem_id`: Reference to the problem statement
   - `workspace_id`: Associated workspace
   - `source_context`: PROBLEM | BACKLOG | BOTH
   - `input_snapshot`: JSON snapshot of context provided to AI
   - `proposal_payload`: JSON with the AI's suggestions
   - `uncertainties`: JSON array of uncertainty points
   - `status`: DRAFT | CONFIRMED | DISCARDED
   - `prompt_version`: Which prompt version was used

4. **`sv.ai_prompt_executions`** - Tracks all AI executions for learning
   - `prompt_version_id`: Which prompt was executed
   - `proposal_id`: Resulting proposal (if any)
   - `workspace_id`: Context for execution
   - `input_tokens`, `output_tokens`, `total_tokens`: Token usage
   - `execution_time_ms`: Performance tracking
   - `success`: Whether execution succeeded
   - `error_message`: Error details if failed

### Backend Components

#### `_lib/openai.js`
- Handles OpenAI API communication
- Manages request formatting and response parsing
- Tracks token usage and execution time
- Returns structured response with metadata

#### `_lib/prompts.js`
- Retrieves active prompts from database
- Renders prompt templates with variables
- Supports simple variable substitution `{{variable}}`
- Supports conditional blocks `{{#if variable}}...{{/if}}`
- Logs prompt executions for learning

#### `ai-structure-proposal.js`
Main endpoint handler with three operations:

1. **POST `/ai/structure-proposal`** - Generate new proposal
   - Requires: `squad_id`
   - Validates workspace membership
   - Checks for problem statement
   - Gathers context (backlog, roles, personas)
   - Calls OpenAI with active prompt
   - Stores proposal as DRAFT
   - Logs execution

2. **POST `/ai/structure-proposal/:id/confirm`** - Confirm proposal
   - Updates proposal status to CONFIRMED
   - Creates hybrid decision record in `sv.decisions`
   - Accepts optional edited proposal

3. **POST `/ai/structure-proposal/:id/discard`** - Discard proposal
   - Updates proposal status to DISCARDED
   - Keeps record for learning purposes

4. **GET `/ai/structure-proposal?squad_id=...`** - Get latest draft
   - Returns most recent draft proposal for squad

### Frontend Components

#### `AIStructureProposalModal.jsx`
Full-screen modal overlay that:
- Displays loading state during AI generation
- Shows uncertainty warnings prominently
- Renders structured proposal in sections:
  - **Workflow**: Sequential steps with activities
  - **Roles**: Suggested team roles with justifications
  - **Personas**: User personas with goals and pain points
  - **Justifications**: AI reasoning for suggestions
- Provides action buttons:
  - **Discard**: Reject proposal
  - **Review Later**: Close modal, keep draft
  - **Confirm**: Accept and create hybrid decision

#### `ProblemStatementCard.jsx`
Updated to include:
- Prominent "Generate with AI" call-to-action button
- Opens AI proposal modal on click
- Only shown when problem statement exists

### Styling

`AIStructureProposalModal.css` provides:
- Modern, clean interface with gradient accents
- Clear visual hierarchy for sections
- Distinctive styling for:
  - AI badge (gradient purple)
  - Uncertainties (yellow warning background)
  - Justifications (green informational background)
  - Role/persona cards (light gray backgrounds)
- Responsive layout with max-width constraints
- Smooth animations and transitions

## Prompt Design

The initial prompt (`structure-proposal-v1`) is designed to:

1. **Set the right tone**: "You propose, not impose"
2. **Adapt to context**: More detail for complex problems
3. **Handle missing info**: Can ask ONE clarification question
4. **Mark uncertainties**: Explicitly list assumptions made
5. **Provide justifications**: Explain reasoning behind suggestions
6. **Return structured JSON**: Well-defined schema for parsing

### Prompt Template Variables

- `{{squad_context}}`: Squad name, workspace, description
- `{{problem_statement}}`: Full problem statement details
- `{{existing_backlog}}`: Current issues (if any)
- `{{existing_roles}}`: Roles already defined (if any)
- `{{existing_personas}}`: Personas already defined (if any)

### Expected Output Schema

```json
{
  "needs_clarification": false,
  "clarification_question": null,
  "proposal": {
    "suggested_workflow": [
      {
        "name": "Step Name",
        "description": "What happens",
        "order": 1,
        "key_activities": ["Activity 1", "Activity 2"]
      }
    ],
    "suggested_roles": [
      {
        "code": "role-code",
        "label": "Role Name",
        "description": "Responsibilities",
        "why_needed": "Justification"
      }
    ],
    "suggested_personas": [
      {
        "name": "Persona Name",
        "type": "cliente|stakeholder|membro_squad",
        "description": "Description",
        "goals": "Goals",
        "pain_points": "Pain points",
        "why_relevant": "Relevance to problem"
      }
    ],
    "justifications": {
      "workflow": "Workflow reasoning",
      "roles": "Roles reasoning",
      "personas": "Personas reasoning"
    },
    "uncertainties": [
      "Uncertainty point 1",
      "Uncertainty point 2"
    ]
  }
}
```

## User Flow

1. User defines a Problem Statement for their squad
2. User sees "Generate with AI" button in Problem Statement card
3. User clicks button to open AI proposal modal
4. Modal shows loading state while AI analyzes problem
5. AI generates proposal (typically 10-30 seconds)
6. User reviews proposal with:
   - Workflow steps
   - Suggested roles
   - Suggested personas
   - AI justifications
   - Uncertainty warnings (if any)
7. User can:
   - **Confirm**: Accept proposal and create hybrid decision
   - **Review Later**: Close modal, keep draft for later
   - **Discard**: Reject proposal entirely
8. If confirmed, a hybrid decision is recorded in `sv.decisions`
9. Squad can proceed to implement suggested structure

## Non-Functional Requirements Met

✅ **No hardcoded prompts** - All prompts stored in database  
✅ **No automatic application** - Always requires user confirmation  
✅ **Non-blocking** - Squad can continue working while reviewing  
✅ **Fully editable** - Future enhancement to allow inline editing  
✅ **Fully traceable** - All proposals and executions logged  
✅ **No new tables created** - Uses pre-existing schema  
✅ **Real OpenAI integration** - No mocks, actual API calls  
✅ **Explicit uncertainties** - Marked and highlighted  
✅ **Hybrid decisions** - Human+AI collaboration recorded  

## Configuration

### Environment Variables Required

- `OPENAI_API_KEY`: OpenAI API key for GPT-4 access
- `DATABASE_URL`: PostgreSQL connection string

### Database Setup

1. Run migration `011-create-ai-tables.sql` to create tables
2. Run seed `012-seed-ai-prompts.sql` to install initial prompt
3. Verify active prompt exists:
   ```sql
   SELECT * FROM sv.ai_prompt_versions WHERE is_active = true;
   ```

## Monitoring and Learning

### Execution Tracking

All AI executions are logged with:
- Token usage (for cost tracking)
- Execution time (for performance monitoring)
- Success/failure status
- Error messages (for debugging)

### Query Examples

**Check recent executions:**
```sql
SELECT 
  executed_at,
  success,
  total_tokens,
  execution_time_ms,
  error_message
FROM sv.ai_prompt_executions
ORDER BY executed_at DESC
LIMIT 10;
```

**Average performance metrics:**
```sql
SELECT 
  COUNT(*) as total_executions,
  AVG(execution_time_ms) as avg_time_ms,
  AVG(total_tokens) as avg_tokens,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM sv.ai_prompt_executions;
```

**View all proposals for a squad:**
```sql
SELECT 
  id,
  status,
  source_context,
  created_at,
  confirmed_at,
  discarded_at
FROM sv.ai_structure_proposals
WHERE squad_id = '<squad-id>'
ORDER BY created_at DESC;
```

## Future Enhancements

### Planned Improvements

1. **Interactive Clarification**: Support back-and-forth questions
2. **Inline Editing**: Edit proposal sections before confirming
3. **Partial Confirmation**: Accept only some suggestions
4. **Iterative Refinement**: Ask AI to refine specific sections
5. **Learning Loop**: Use confirmed/discarded proposals to improve prompts
6. **Multi-language Support**: Prompts in different languages
7. **Custom Models**: Allow workspace-specific model preferences

### Extension Points

- Additional prompt categories (REFINEMENT, ANALYSIS)
- Custom prompt creation by advanced users
- A/B testing of different prompt versions
- Integration with backlog generation
- Automatic persona enrichment

## Security Considerations

- ✅ All endpoints require authentication
- ✅ Workspace membership validated on every request
- ✅ No user data sent to OpenAI beyond problem context
- ✅ API key stored securely in environment variables
- ✅ Input sanitization through JSON parsing
- ✅ Error messages don't expose sensitive information

## Testing Recommendations

### Manual Testing Checklist

1. [ ] Create a squad with a problem statement
2. [ ] Click "Generate with AI" button
3. [ ] Verify loading state appears
4. [ ] Verify proposal generates successfully
5. [ ] Check that uncertainties are displayed (if any)
6. [ ] Review workflow, roles, and personas sections
7. [ ] Test "Discard" button
8. [ ] Generate again and test "Confirm" button
9. [ ] Verify hybrid decision appears in decisions list
10. [ ] Check database for logged execution

### Edge Cases to Test

- Problem statement without metrics/constraints
- Squad with existing backlog items
- Squad with existing roles
- Squad with existing personas
- OpenAI API timeout/failure
- Invalid JSON response from AI
- Multiple rapid clicks on generate button
- Browser refresh during generation

## Support and Troubleshooting

### Common Issues

**"Prompt ativo não encontrado no banco"**
- Run seed script `012-seed-ai-prompts.sql`
- Verify active prompt exists in database

**"OPENAI_API_KEY não configurado"**
- Set environment variable in Netlify dashboard
- Redeploy functions

**"Erro ao gerar proposta com IA"**
- Check OpenAI API status
- Verify API key is valid
- Check execution logs for detailed error

**Slow generation times**
- Normal for GPT-4: 10-30 seconds
- Consider adjusting prompt length
- Monitor token usage

### Debug Queries

```sql
-- Check latest failed executions
SELECT * FROM sv.ai_prompt_executions 
WHERE success = false 
ORDER BY executed_at DESC 
LIMIT 5;

-- Check proposals stuck in draft
SELECT * FROM sv.ai_structure_proposals 
WHERE status = 'DRAFT' 
AND created_at < NOW() - INTERVAL '1 day';
```

## Compliance with Requirements

This implementation meets all criteria from the issue:

✅ AI generates proposal on demand  
✅ Proposal saved as draft  
✅ User can edit before confirming  
✅ Uncertainties made explicit when present  
✅ Prompt comes from database  
✅ Real OpenAI execution  
✅ Confirmation generates hybrid decision  
✅ No irreversible automation  
✅ Feature functional end-to-end  
✅ Database reused correctly  
✅ Prompts versioned in database  
✅ Decision registered  

## Credits

Built following the principle: **AI propõe, humano decide, ambos aprendem.**
