# UI Changes: Problem Statements CRUD

## Overview
This document describes the user interface changes introduced by the Problem Statements CRUD feature.

## Navigation Changes

### Desktop Sidebar (Left Navigation)
**Before:**
```
- Squads
- Personas
- Papéis
- Backlog (disabled)
- Issues (disabled)
```

**After:**
```
- Problemas ⭐ NEW
- Personas
- Papéis
- Squads
- Issues (disabled)
- Backlog (disabled)
```

**Icon:** Circle with question mark (◯❓)
**Position:** First item (top of menu)
**State:** Active/clickable

### Mobile Bottom Navigation
**Before:**
```
[Squads] [Personas] [Papéis] [Backlog] [Issues]
```

**After:**
```
[Problemas] [Personas] [Papéis] [Squads] [Issues]
```

**Note:** Order changed to match desktop sidebar, "Backlog" removed from mobile view

## New Pages

### 1. Problem Statements List (`/workspaces/:workspaceId/problems`)

**Layout:**
- Page header with title "Problemas"
- Subtitle explaining the purpose
- Primary action button "Novo Problema" (top right)
- Grid of problem cards (3 columns on desktop, 1 on mobile)

**Problem Card Components:**
- Title (bold, 18px) or "Sem título" in gray
- Narrative preview (truncated to 200 characters)
- Created date (bottom, small gray text)
- Action buttons (View, Edit, Delete) in card header

**Empty State:**
- Large emoji icon 🎯
- "Nenhum problema definido ainda"
- Explanatory text
- "Criar Primeiro Problema" button

**Visual Style:**
- White cards with subtle border
- Hover effect: shadow and border color change
- Generous margins and padding
- Clean, minimal design

### 2. Create Problem Statement (`/workspaces/:workspaceId/problems/create`)

**Layout:**
- Page header "Novo Problema"
- Subtitle explaining purpose
- Form sections in white cards with borders

**Form Sections:**

**Section 1: Basic Information**
- Squad dropdown (required, pre-selected to first squad)
- Title field (optional, single line)
- Narrative field (required, multi-line textarea, 6 rows)

**Section 2-5: Array Fields**
Each section contains:
- Section header (18px, bold)
- Section description (gray, 14px)
- List of input fields with remove buttons (×)
- "Add" button (dashed border, gray) at bottom

Array field sections:
1. Métricas de Sucesso
2. Restrições
3. Premissas
4. Perguntas em Aberto

**Form Actions:**
- Cancel button (left, gray)
- Create/Save button (right, blue)

**Responsive Behavior:**
- Form sections stack vertically
- Full-width on mobile
- Array items stack

### 3. Problem Statement Detail (`/workspaces/:workspaceId/problems/:problemId`)

**Layout:**
- Back button with arrow icon
- Large title (32px)
- Action buttons (Edit, Delete) in header
- Content sections in white cards

**Content Display:**
- Narrative (large text, pre-wrapped)
- Success Metrics (bulleted list)
- Constraints (bulleted list)
- Assumptions (bulleted list)
- Open Questions (bulleted list)
- Metadata footer (created date, updated date)

**Empty Field Handling:**
- Optional sections hidden if empty
- "Nenhum item definido" shown for empty arrays

### 4. Edit Problem Statement (`/workspaces/:workspaceId/problems/:problemId/edit`)

**Layout:**
- Same as Create form
- Pre-filled with existing data
- Header says "Editar Problema"
- Submit button says "Salvar Alterações"

## Visual Design System

### Colors Used
- **Primary Blue:** #3b82f6 (buttons, active states)
- **Dark Gray:** #0f172a (headings, main text)
- **Medium Gray:** #475569 (body text)
- **Light Gray:** #64748b (hints, labels)
- **Very Light Gray:** #94a3b8 (metadata, disabled)
- **Border Gray:** #e5e7eb (card borders)
- **Background Gray:** #f8fafc (section backgrounds)
- **Red/Danger:** #dc2626 (delete buttons)
- **Red Light:** #fef2f2 (delete button backgrounds)

### Typography
- **Page Titles:** 28-32px, bold (700)
- **Section Headers:** 18px, semi-bold (600)
- **Body Text:** 14-15px, normal
- **Hints/Help:** 13-14px, light gray
- **Buttons:** 14px, semi-bold (600)

### Spacing
- **Page Padding:** 20px
- **Section Gaps:** 24-32px
- **Card Padding:** 20-24px
- **Form Field Gaps:** 20px
- **Button Gaps:** 12px

### Interactive Elements

**Buttons:**
- Primary: Blue background, white text
- Secondary: Light gray background, dark text
- Danger: Light red background, dark red text
- Icon: Transparent, gray icon, hover gray background

**Cards:**
- Border radius: 12px
- Hover: Subtle shadow, border color darkens
- Transition: 0.2s all

**Form Inputs:**
- Border radius: 8px
- Border: 1px solid light gray
- Focus: Blue border, light blue shadow
- Padding: 10-14px

### Icons
All icons are 18-20px from Feather Icons set:
- **Problemas:** Circle with question mark
- **View:** Eye icon
- **Edit:** Pencil icon
- **Delete:** Trash icon
- **Add:** Plus icon
- **Back:** Arrow left

## Responsive Breakpoints

### Desktop (> 768px)
- Grid: 3 columns
- Sidebar: Visible
- Bottom nav: Hidden
- Form: Single column, max-width 900px

### Mobile (≤ 768px)
- Grid: 1 column
- Sidebar: Hidden
- Bottom nav: Visible
- Form: Full width, stacked buttons
- Reduced padding (16px)

## User Flow

1. **Starting Point:** User in workspace
2. **Navigation:** Clicks "Problemas" (first menu item)
3. **List View:** Sees all problems or empty state
4. **Create:** Clicks "Novo Problema" → Form
5. **Fill Form:** Enters data, adds array items
6. **Submit:** Creates problem → Redirects to list
7. **View:** Clicks problem card → Detail view
8. **Edit:** Clicks edit button → Edit form
9. **Update:** Saves changes → Redirects to detail
10. **Delete:** Clicks delete, confirms → Returns to list

## Loading States

**List Page:**
- Centered spinner with text "Carregando problemas..."

**Create/Edit Forms:**
- "Carregando..." text while fetching squads
- Button disabled and text changes during submit

**Detail Page:**
- Centered "Carregando..." text

## Error States

**List Page:**
- Red box with error message
- Maintains header and navigation

**Forms:**
- Alert popup for errors (to be improved)
- Form stays filled (doesn't reset)

**Detail Page:**
- Error box with message
- "Voltar para Problemas" button

## Accessibility Notes

- All buttons have clear labels
- Form fields have associated labels
- Required fields marked with *
- Error messages are descriptive
- Focus states visible on all interactive elements
- Color contrast meets WCAG standards

## Animation/Transitions

**Minimal approach to match product style:**
- Button hover: 0.2s color transition
- Card hover: 0.2s shadow/border transition
- No page transitions
- No loading animations (except spinner)
- No success animations

## Comparison with Existing Pages

**Matches Personas Page:**
- Same grid layout
- Similar card design
- Consistent header structure
- Same empty state pattern

**Matches Roles Page:**
- Similar form structure
- Same section layout
- Consistent button styles

**Overall Consistency:**
✅ Typography matches
✅ Colors match
✅ Spacing matches
✅ Button styles match
✅ Card styles match
✅ Form patterns match

## Known UI Limitations

1. **Alert Dialogs:** Uses browser `alert()` instead of custom modal
2. **No Toast Notifications:** Errors shown via alert
3. **Limited Rich Text:** Narrative is plain text (no markdown)
4. **No Inline Validation:** Validation only on submit
5. **No Confirmation Modal:** Delete confirmation uses browser `confirm()`

These are acceptable for MVP and consistent with other parts of the application.
