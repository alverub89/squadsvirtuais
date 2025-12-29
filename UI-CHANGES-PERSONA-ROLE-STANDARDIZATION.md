# UI Changes: Persona and Role Card Standardization

## Overview

This document describes the UI changes made to standardize the interactions in Personas and Roles cards on the Squad Detail page.

## Changes Implemented

### 1. PersonaCard Header Actions

**Before:**
- Only had "+ Adicionar" button

**After:**
- `+ Adicionar` - Add existing persona to squad
- `Criar` - Navigate to create new persona page
- `Gerenciar` - Navigate to workspace personas management page

### 2. RolesCard Header Actions

**Before:**
- Had "+ Adicionar" and "Gerenciar" buttons

**After:**
- `+ Adicionar` - Add existing role to squad
- `Criar` - Open modal to create new workspace role
- `Gerenciar` - Navigate to workspace roles management page

### 3. Clickable Persona Items

**New Feature:**
- Persona items in the card are now clickable
- Clicking opens a detail modal with full persona information
- Modal behavior depends on persona source:
  - **Workspace Persona**: Opens in edit mode with form fields
  - **Global Persona**: Opens in read-only mode with view-only fields

### 4. Clickable Role Items

**New Feature:**
- Role items in the card are now clickable
- Clicking opens a detail modal with full role information
- Modal behavior depends on role source:
  - **Workspace Role**: Opens in edit mode with form fields
  - **Global Role**: Opens in read-only mode with view-only fields

### 5. Duplicate and Replace Functionality

**New Feature for Global Items:**

When viewing a global persona or role in read-only mode, a new action button appears:
- **"Duplicar para Workspace e Substituir"**

**Flow:**
1. User clicks the duplicate button
2. System creates a workspace copy of the global item with all properties
3. System removes the squad's association with the global item
4. System adds new association with the workspace copy
5. Modal automatically switches to edit mode for immediate editing
6. User can now customize the duplicated item

**Benefits:**
- Seamless workflow for customizing global items
- Automatic squad association update
- Immediate editing capability

## User Experience Flow

### Editing a Workspace Persona/Role
1. Click on the persona/role item in the card
2. Modal opens in edit mode
3. Make changes in the form fields
4. Click "Salvar" to save changes
5. Changes are immediately reflected in the squad

### Viewing and Duplicating a Global Persona/Role
1. Click on the global persona/role item in the card
2. Modal opens in read-only mode
3. Review the item details
4. Click "Duplicar para Workspace e Substituir" button
5. System creates workspace copy and updates squad association
6. Modal switches to edit mode automatically
7. Make customizations to the duplicated item
8. Click "Salvar" to save changes

### Creating New Items
**Persona:**
1. Click "Criar" button in PersonaCard header
2. Navigate to create persona page
3. Fill in persona details
4. Save the new persona

**Role:**
1. Click "Criar" button in RolesCard header
2. Modal opens with create form
3. Fill in role details (code, label, description, responsibilities)
4. Click "Criar Papel" to save
5. New role is created and can be added to squads

## Visual Design

### Button Styles
All header action buttons use consistent styling:
- Blue link style (#3b82f6)
- Hover effect with darker blue (#2563eb)
- Even spacing between buttons

### Modal Design
- Clean, modern modal with backdrop blur
- Header with title and close button
- Scrollable body for long content
- Footer with action buttons

### Edit Mode
- Form fields with clear labels
- Input fields with focus states
- Textarea for longer content
- "Salvar" and "Cancelar" buttons

### Read-Only Mode
- Structured detail view with sections
- Icon and title header
- Source badge (Global/Workspace)
- Information box explaining global items
- "Duplicar para Workspace e Substituir" button for global items

### Clickable Items
- Visual hover effect (darker background)
- Cursor pointer indication
- Smooth transition

## Technical Implementation

### Components Modified
1. `src/components/PersonaCard.jsx` - Enhanced with new modals and logic
2. `src/components/PersonaCard.css` - Added styles for new features
3. `src/components/RolesCard.jsx` - Enhanced with new modals and logic
4. `src/components/RolesCard.css` - Added styles for new features

### New State Management
- `showDetailModal` - Controls detail modal visibility
- `selectedPersona/selectedRole` - Current item being viewed/edited
- `editMode` - Toggles between edit and read-only mode
- `editForm` - Form data for editing
- `saving` - Saving state indicator
- `duplicating` - Duplication in progress indicator

### API Integration
- `PUT /personas/:id` - Update persona
- `PUT /workspace-roles/:id` - Update role
- `POST /personas` - Create workspace persona (for duplication)
- `POST /workspace-roles` - Create workspace role (for creation and duplication)
- `DELETE /squad-personas/:id` - Remove persona association
- `DELETE /squad-roles/:id` - Remove role association
- `POST /squad-personas` - Add persona association
- `POST /squad-roles` - Add role association

## Consistency Improvements

### Standardized Features
Both PersonaCard and RolesCard now have:
- Same header button structure (+ Adicionar, Criar, Gerenciar)
- Clickable items with hover effects
- Detail modals with consistent behavior
- Edit/view mode switching based on source
- Duplicate and replace functionality for global items
- Consistent error handling and loading states

### Smooth Transitions
- Loading indicators during operations
- Disabled states prevent double-clicks
- Smooth modal animations
- Immediate UI updates after saves

## Benefits

1. **User Empowerment**: Users can now easily customize global items for their specific needs
2. **Consistent Experience**: Both personas and roles work the same way
3. **Efficient Workflow**: No need to navigate away from squad detail page for basic operations
4. **Clear Visibility**: Easy to see which items are global vs workspace
5. **Immediate Editing**: Duplicate and edit in one smooth flow

## Testing Checklist

- [x] PersonaCard shows all three buttons (+ Adicionar, Criar, Gerenciar)
- [x] RolesCard shows all three buttons (+ Adicionar, Criar, Gerenciar)
- [x] Persona items are clickable and open detail modal
- [x] Role items are clickable and open detail modal
- [x] Workspace items open in edit mode with working forms
- [x] Global items open in read-only mode with duplicate button
- [x] Duplicate and replace creates workspace copy and updates squad
- [x] Duplicated items open in edit mode immediately
- [x] Create role modal works from RolesCard header
- [x] Criar button navigates to create persona page
- [x] Gerenciar button navigates to management pages
- [x] Consistent styling between both cards
- [x] Error handling works properly
- [x] Loading states show during operations
