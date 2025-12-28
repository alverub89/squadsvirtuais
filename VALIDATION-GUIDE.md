# Validation Guide: AI Proposal JSON Fixes

## Overview
This document describes the changes made to fix AI proposal generation and validation issues, and provides guidance on how to validate the fixes.

## Problems Fixed

### 1. ✅ JSON Contract Inconsistency
**Problem:** Backend expected `{ proposal: {...} }` but AI could return direct JSON `{ suggested_workflow, suggested_roles, suggested_personas }`

**Solution:** Modified validation to accept both formats:
- Format A (wrapped): `{ proposal: {...}, uncertainties?: [...] }`  
- Format B (direct): `{ suggested_workflow, suggested_roles, suggested_personas, ... }`

**Code Change:** `ai-structure-proposal.js` line ~234
```javascript
const proposalPayload = parsedResponse.proposal ?? parsedResponse;
```

### 2. ✅ Overly Rigid Validation
**Problem:** Code rejected valid responses that weren't wrapped in `proposal` field

**Solution:** Flexible validation checks for minimum required fields in either format
```javascript
const hasMinimumFields = 
  proposalPayload &&
  typeof proposalPayload === 'object' &&
  (
    // Check for expected structure from the prompt
    (Array.isArray(proposalPayload.suggested_workflow) && 
     Array.isArray(proposalPayload.suggested_roles) && 
     Array.isArray(proposalPayload.suggested_personas)) ||
    // Or check for alternative structure mentioned in issue  
    (proposalPayload.decision_context && 
     proposalPayload.squad_structure && 
     Array.isArray(proposalPayload.personas))
  );
```

### 3. ✅ Token Limit Not Applied
**Problem:** `max_tokens` configured in database but not passed to OpenAI API

**Solution:** 
- Added `maxTokens` parameter to `callOpenAI()` function
- Modified `getActivePrompt()` to detect and return `max_tokens` from database if column exists
- Pass token limit from prompt version to OpenAI call

**Code Changes:**
- `openai.js` - Added maxTokens parameter and applies it to API request
- `prompts.js` - Dynamically detects max_tokens column and includes in query
- `ai-structure-proposal.js` - Passes maxTokens from prompt version

### 4. ✅ Unsafe Parse in Confirmation Flow
**Problem:** Code assumed `proposal_payload` is always a string, but PostgreSQL jsonb returns objects

**Solution:** Defensive parsing in all endpoints
```javascript
const storedPayload = proposal.proposal_payload;
const storedProposal = typeof storedPayload === "string" 
  ? JSON.parse(storedPayload) 
  : storedPayload;
```

Applied in:
- `confirmProposal()` function
- `getLatestProposal()` function

## Files Modified

1. **netlify/functions/_lib/openai.js** (14 lines changed)
   - Added maxTokens parameter
   - Apply max_tokens to OpenAI API when provided

2. **netlify/functions/_lib/prompts.js** (25 lines changed)
   - Dynamic column detection for max_tokens
   - Backward compatible query building

3. **netlify/functions/ai-structure-proposal.js** (45 lines changed)
   - Flexible JSON format validation
   - Normalized payload storage
   - Defensive parsing in all read operations
   - Token limit application

## Validation Steps

### Manual Testing (Requires Live Environment)

1. **Test Direct JSON Format**
   ```bash
   POST /ai/structure-proposal
   {
     "squad_id": "<uuid>"
   }
   ```
   - Should accept AI response in direct format
   - Should persist proposal as DRAFT
   - Should extract uncertainties correctly

2. **Test Wrapped JSON Format**
   - Should still work with existing format
   - Backward compatible with old responses

3. **Test Token Limits**
   - Add `max_tokens` or `max_output_tokens` column to `sv.ai_prompt_versions` table
   - Set value (e.g., 4000) for active prompt version
   - Verify OpenAI receives the token limit (check logs: "[openai] Applying max_tokens limit: 4000")

4. **Test Confirmation Flow**
   ```bash
   POST /ai/structure-proposal/:id/confirm
   {
     "edited_proposal": { ... }
   }
   ```
   - Should work regardless of whether proposal_payload is string or object in DB

5. **Test Retrieval**
   ```bash
   GET /ai/structure-proposal?squad_id=<uuid>
   ```
   - Should return parsed JSON regardless of storage format

### Automated Validation

```bash
# Syntax check (already passed)
node -c netlify/functions/_lib/openai.js
node -c netlify/functions/_lib/prompts.js
node -c netlify/functions/ai-structure-proposal.js
```

## Expected Behavior After Fix

✅ Valid AI responses are persisted as DRAFT  
✅ Both JSON formats (wrapped and direct) are accepted  
✅ Token limits are applied when configured in database  
✅ Confirmation endpoint works with any DB type (string/jsonb)  
✅ Clear error messages distinguish AI failures from validation failures  
✅ Uncertainties are extracted from either location (root or nested)

## Database Schema Recommendations

To fully enable token limits, add this column to `sv.ai_prompt_versions`:

```sql
ALTER TABLE sv.ai_prompt_versions 
ADD COLUMN IF NOT EXISTS max_tokens INTEGER;

-- Or if you prefer the OpenAI API terminology:
ALTER TABLE sv.ai_prompt_versions 
ADD COLUMN IF NOT EXISTS max_output_tokens INTEGER;
```

Update the active prompt version:
```sql
UPDATE sv.ai_prompt_versions 
SET max_tokens = 4000 
WHERE id IN (
  SELECT id FROM sv.ai_prompt_versions 
  WHERE is_active = true 
  AND prompt_id IN (
    SELECT id FROM sv.ai_prompts WHERE name = 'structure-proposal-v1'
  )
);
```

## Backward Compatibility

✅ Works without max_tokens column in database  
✅ Works with existing jsonb data  
✅ Works with both old and new JSON formats  
✅ No breaking changes to API contracts  

## Logging Improvements

New log messages added for debugging:
- `[openai] Applying max_tokens limit: <value>` - When token limit is applied
- `[ai-structure-proposal] Applying max_tokens from prompt version: <value>` - When passing to OpenAI
- Enhanced validation error messages with expected field names

## Next Steps for Product Team

1. **Verify in Staging:** Test the endpoint with real AI calls
2. **Monitor Logs:** Check that proposals are being persisted successfully
3. **Add Token Column:** If desired, add max_tokens to database schema
4. **Update Documentation:** Update API docs if needed
5. **Consider Frontend:** Update UI to handle both response formats if needed
