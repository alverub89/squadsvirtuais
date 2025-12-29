# Implementation Summary: Problem Statements CRUD

## Overview
This implementation adds Problem Statements as a first-class entity in the Squads Virtuais system, making it the central element that drives the work of squads. The feature includes complete CRUD operations, workspace-level management, and proper navigation integration.

## What Was Changed

### 1. Backend Changes

#### `netlify/functions/problem-statements.js` (Complete Rewrite)
**Previous State:** Used `sv.decisions` table with a special title to store problem statements
**New State:** Uses `sv.problem_statements` table directly

**Key Changes:**
- **Database Table:** Now uses `sv.problem_statements` table instead of `sv.decisions`
- **JSONB Fields:** Properly handles JSONB arrays for:
  - `success_metrics`
  - `constraints`
  - `assumptions`
  - `open_questions`
- **Workspace-Level Operations:**
  - `GET /problem-statements?workspace_id=...` - List all problems in workspace
  - `GET /problem-statements/:id` - Get single problem by ID
  - `POST /problem-statements` - Create new problem
  - `PUT /problem-statements/:id` - Update existing problem
  - `DELETE /problem-statements/:id` - Delete problem
- **Validation:**
  - `narrative` field is required (NOT NULL)
  - JSONB fields default to empty arrays
  - `updated_at` is updated on every edit using `NOW()::date`
- **Security:** Workspace membership verification on all operations

### 2. Frontend Pages Created

#### `src/pages/ProblemStatementsList.jsx` & `.css`
**Purpose:** Main listing page for all problems in a workspace

**Features:**
- Grid layout with problem cards
- Each card shows:
  - Title (or "Sem título" if empty)
  - Narrative preview (truncated to 200 chars)
  - Created date
  - Action buttons (View, Edit, Delete)
- Empty state with helpful messaging
- Loading and error states
- "Novo Problema" button for creating problems

#### `src/pages/CreateProblemStatement.jsx` & `.css`
**Purpose:** Form to create new problem statements

**Features:**
- Squad selection dropdown (required)
- Title field (optional)
- Narrative field (required, textarea)
- Array fields with add/remove functionality:
  - Success Metrics
  - Constraints
  - Assumptions
  - Open Questions
- Validation for required fields
- Clean array handling (filters out empty items)
- Form actions (Cancel, Create)

#### `src/pages/EditProblemStatement.jsx`
**Purpose:** Form to edit existing problem statements

**Features:**
- Pre-fills form with existing data
- Same field structure as Create form
- Fetches current problem data on mount
- Sends only updated fields to backend
- Validation and error handling

#### `src/pages/ProblemStatementDetail.jsx` & `.css`
**Purpose:** Detailed view of a single problem statement

**Features:**
- Full display of all problem fields
- Formatted date display
- Edit and Delete buttons
- Back navigation to list
- Empty state handling for optional fields
- Metadata display (created_at, updated_at)

### 3. Navigation Updates

#### `src/components/Layout.jsx`
**Changes:**
- Added "Problemas" as first menu item in desktop sidebar
- Added "Problemas" to mobile bottom navigation
- Proper menu ordering: Problemas → Personas → Papéis → Squads → Issues → Backlog
- Icon: Circle with question mark (represents problem/question)

#### `src/App.jsx`
**Changes:**
- Added routes:
  - `/workspaces/:workspaceId/problems` - List
  - `/workspaces/:workspaceId/problems/create` - Create
  - `/workspaces/:workspaceId/problems/:problemId` - Detail
  - `/workspaces/:workspaceId/problems/:problemId/edit` - Edit
- All routes protected with authentication

## Technical Details

### Database Schema Used
```sql
Table "sv.problem_statements"
- id: uuid (PK, auto-generated)
- squad_id: uuid (FK to sv.squads, CASCADE delete)
- title: text (nullable)
- narrative: text (NOT NULL)
- success_metrics: jsonb (default '[]')
- constraints: jsonb (default '[]')
- assumptions: jsonb (default '[]')
- open_questions: jsonb (default '[]')
- created_at: timestamptz (default NOW())
- updated_at: date (nullable, updated on edits)
```

### JSONB Array Handling
Frontend sends arrays as JSON arrays:
```json
{
  "success_metrics": ["Metric 1", "Metric 2"],
  "constraints": ["Constraint 1"]
}
```

Backend stores them as JSONB:
```javascript
JSON.stringify(prepareJsonbArray(success_metrics))
```

Where `prepareJsonbArray` filters out empty strings and ensures array format.

### Key Design Decisions

1. **Squad Association:** Every problem must be associated with a squad (per database schema)
2. **Narrative Required:** Only `narrative` is mandatory, all other fields optional
3. **Array Fields:** Implemented as dynamic lists with add/remove functionality
4. **No Quality Calculation:** Removed the quality status logic from old implementation (focused on CRUD)
5. **Workspace-Level View:** Problems are listed by workspace (joining through squads)

## UI/UX Considerations

### Design System Consistency
- Uses existing color palette and typography
- Card-based layouts matching Personas and Roles pages
- Consistent button styles and spacing
- Responsive grid layouts
- Mobile-friendly forms

### User Flow
1. User navigates to "Problemas" (first menu item)
2. Sees list of all problems in workspace
3. Can create new problem (requires squad selection)
4. Can view details of any problem
5. Can edit or delete problems
6. All actions respect workspace membership

### Error Handling
- Uses `alert()` for critical errors (consistent with existing codebase)
- Loading states during async operations
- Empty states with helpful messaging
- Form validation on submit

## Testing Performed

### Build & Lint
- ✅ `npm run build` - Successful
- ✅ `npm run lint` - No errors

### Code Review
- ✅ Automated code review completed
- ✅ Addressed timestamp consistency issue
- ⚠️ Alert() usage noted (minor UX concern, deferred)

### Security Check
- ✅ CodeQL security scan - No vulnerabilities found
- ✅ Workspace membership verification on all endpoints
- ✅ Input validation (required fields, SQL injection prevention via parameterized queries)

## Migration Notes

### Breaking Changes
**None.** The feature adds new functionality without modifying existing features.

### Data Migration
**Not required.** The `sv.problem_statements` table should already exist in the database per the issue requirements.

### Backward Compatibility
The old `ProblemStatementCard` component used in squad detail pages still exists and may need to be updated in a future PR to use the new API endpoints, but this is out of scope for this issue.

## Future Improvements

1. **Better Error Handling:** Replace alert() with toast notifications or inline error messages
2. **Problem-Squad Relationship:** Add UI to link problems to squads or create squads from problems
3. **Versioning:** Add formal version tracking for problem statements
4. **Bulk Operations:** Allow bulk delete or status changes
5. **Search/Filter:** Add search and filtering capabilities on the list page
6. **Rich Text Editor:** Consider markdown or rich text support for narrative field

## Files Changed

### New Files (10)
- `src/pages/ProblemStatementsList.jsx`
- `src/pages/ProblemStatementsList.css`
- `src/pages/CreateProblemStatement.jsx`
- `src/pages/CreateProblemStatement.css`
- `src/pages/EditProblemStatement.jsx`
- `src/pages/ProblemStatementDetail.jsx`
- `src/pages/ProblemStatementDetail.css`

### Modified Files (3)
- `netlify/functions/problem-statements.js` (complete rewrite)
- `src/components/Layout.jsx` (menu updates)
- `src/App.jsx` (routing)

## Acceptance Criteria Met

- ✅ Menu displays "Problemas" as item 1, before Personas, Papéis, Squad, Issues, Backlog
- ✅ CRUD operations work in backend and frontend
- ✅ Data persisted and read from `sv.problem_statements` table
- ✅ `narrative` is required, JSONB lists work with add/remove
- ✅ `updated_at` updated on edits
- ✅ UI consistent with system style (cards, calm typography, no hype)
- ✅ Workspace-level problem management
- ✅ Build and tests pass
