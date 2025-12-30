# UI Changes: Problem Statement Card Standardization

## Overview
This document describes the UI changes made to the Problem Statement card to match the pattern established by Personas and Roles cards.

## Before and After Comparison

### Empty State

#### BEFORE (Old Implementation)
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                        🎯                           │
│                                                     │
│         Problema de Negócio não definido           │
│                                                     │
│    Defina o problema que esta squad existe para    │
│    resolver. Um problema bem definido orienta      │
│    todas as decisões e melhora a qualidade das     │
│    sugestões.                                       │
│                                                     │
│              ┌───────────────────┐                  │
│              │ Definir Problema  │                  │
│              └───────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Issues:**
- Only one action button
- No way to see existing problems
- No way to manage problems
- Doesn't follow Personas/Roles pattern

#### AFTER (New Implementation)
```
┌─────────────────────────────────────────────────────┐
│ Problema de Negócio    [+ Adicionar] [Criar] [Gerenciar] │
│ Tudo que essa squad faz existe para resolver...    │
│─────────────────────────────────────────────────────│
│                                                     │
│         Nenhum problema associado                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Improvements:**
✅ Three action buttons matching pattern
✅ Consistent header layout
✅ Clear empty state message
✅ Multiple interaction options

---

### With Existing Problem

#### BEFORE (Old Implementation)
```
┌─────────────────────────────────────────────────────┐
│ Problema de Negócio                          [✏️]  │
│ Tudo que essa squad faz existe para resolver...    │
│─────────────────────────────────────────────────────│
│                                                     │
│ TÍTULO                                              │
│ Usuários não conseguem encontrar produtos...       │
│                                                     │
│ NARRATIVA                                           │
│ Atualmente, os usuários precisam navegar por...    │
│                                                     │
│ [More fields...]                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Issues:**
- Only edit button available
- Can't easily switch problems
- Can't see other options

#### AFTER (New Implementation)
```
┌─────────────────────────────────────────────────────┐
│ Problema de Negócio    [+ Adicionar] [Criar] [Gerenciar] [✏️] │
│ Tudo que essa squad faz existe para resolver...    │
│─────────────────────────────────────────────────────│
│                                                     │
│ TÍTULO                                              │
│ Usuários não conseguem encontrar produtos...       │
│                                                     │
│ NARRATIVA                                           │
│ Atualmente, os usuários precisam navegar por...    │
│                                                     │
│ [More fields...]                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Improvements:**
✅ All action buttons always visible
✅ Can add/replace problem easily
✅ Can create additional problems
✅ Quick access to management

---

## New Modals

### 1. Add Problem Modal

```
╔═══════════════════════════════════════════════════════╗
║ Adicionar Problema à Squad                       [×] ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ 🎯  Melhorar experiência de busca              │ ║
║  │                                                 │ ║
║  │     Atualmente, os usuários precisam navegar   │ ║
║  │     por múltiplas páginas para encontrar...    │ ║
║  │                                                 │ ║
║  │     [Adicionar]                                │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ 🎯  Reduzir tempo de checkout                  │ ║
║  │                                                 │ ║
║  │     O processo de checkout atual tem muitos    │ ║
║  │     passos desnecessários que causam...        │ ║
║  │                                                 │ ║
║  │     [Adicionar]                                │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                     [Fechar]                          ║
╚═══════════════════════════════════════════════════════╝
```

**Features:**
- Lists all available problems from workspace
- Excludes current squad's problem
- Shows title and preview of narrative
- One-click assignment
- Loading state while assigning

---

### 2. Create Problem Modal

```
╔═══════════════════════════════════════════════════════╗
║ Criar Novo Problema                               [×] ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Título do Problema *                                 ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Ex: Usuários não conseguem encontrar produtos  │ ║
║  └─────────────────────────────────────────────────┘ ║
║  Um título claro e conciso do problema               ║
║                                                       ║
║  Narrativa *                                          ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Descreva o problema em detalhes: contexto,     │ ║
║  │ impacto, stakeholders afetados...              │ ║
║  │                                                 │ ║
║  │                                                 │ ║
║  └─────────────────────────────────────────────────┘ ║
║  Mínimo 280 caracteres para uma descrição completa   ║
║                                                       ║
║  Métricas de Sucesso                                  ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Como saberemos que o problema foi resolvido?   │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  [... Additional fields ...]                          ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║              [Cancelar]  [Criar Problema]             ║
╚═══════════════════════════════════════════════════════╝
```

**Features:**
- Complete form with all problem fields
- Required field validation
- Field hints for guidance
- Creates and assigns to squad in one step
- Loading state while creating

---

## Interaction Flows

### Flow 1: Adding Existing Problem

```
User on Squad Detail
        ↓
Clicks "Adicionar"
        ↓
Modal opens with available problems
        ↓
User reviews options
        ↓
Clicks "Adicionar" on chosen problem
        ↓
Problem reassigned to squad
        ↓
Modal closes, card refreshes
        ↓
Problem now displayed on card
```

### Flow 2: Creating New Problem

```
User on Squad Detail
        ↓
Clicks "Criar"
        ↓
Modal opens with empty form
        ↓
User fills required fields
        ↓
User optionally fills additional fields
        ↓
Clicks "Criar Problema"
        ↓
Validation runs
        ↓
Problem created and assigned
        ↓
Modal closes, card refreshes
        ↓
New problem displayed on card
```

### Flow 3: Managing Problems

```
User on Squad Detail
        ↓
Clicks "Gerenciar"
        ↓
Navigates to /workspaces/{id}/problems
        ↓
Full problem management interface
        ↓
Can edit, delete, view all problems
        ↓
User navigates back to squad
        ↓
Changes reflected in card
```

---

## Responsive Behavior

### Desktop (> 768px)
- Action buttons displayed inline
- Modals centered on screen
- Full form fields visible
- Comfortable spacing

### Tablet (481px - 768px)
- Action buttons may wrap
- Modals take up more screen space
- Form fields adapt to width
- Touch-friendly targets

### Mobile (≤ 480px)
- Action buttons stack vertically
- Modals full-screen
- Form fields full-width
- Optimized for touch

---

## Visual Consistency

### Color Scheme
- Primary Blue: `#3b82f6` (action buttons, links)
- Secondary Gray: `#64748b` (labels, hints)
- Success Green: `#10b981` (success states)
- Danger Red: `#ef4444` (required markers)
- Background: `#ffffff` (cards, modals)
- Border: `#e5e7eb` (separators, outlines)

### Typography
- Headers: `16-18px`, weight `600`
- Body: `14px`, weight `400`
- Labels: `12px`, weight `600`, uppercase
- Hints: `13px`, weight `400`, muted

### Spacing
- Card padding: `24px`
- Modal padding: `20px`
- Gap between buttons: `8px`
- Gap between fields: `16px`

### Icons
- Action buttons: `18px` SVG icons
- Problem items: `24px` emoji icons
- Status indicators: `16px` icons

---

## Accessibility

### Keyboard Navigation
✅ All buttons accessible via Tab
✅ Enter to submit forms
✅ Escape to close modals
✅ Focus visible indicators

### Screen Readers
✅ Semantic HTML structure
✅ ARIA labels on buttons
✅ Form field labels
✅ Error announcements

### Color Contrast
✅ WCAG AA compliant
✅ Text readable on backgrounds
✅ Focus indicators visible

---

## Animation & Transitions

### Modal Animations
- Fade in: `200ms ease`
- Fade out: `150ms ease`
- Backdrop blur on open

### Button Interactions
- Hover: Background color change
- Active: Slight scale down
- Focus: Outline visible

### Loading States
- Button text changes
- Button disabled
- Subtle opacity change

---

## Error States

### Validation Errors
```
┌─────────────────────────────────────┐
│ ⚠️  Título é obrigatório            │
└─────────────────────────────────────┘
```

### Network Errors
```
┌─────────────────────────────────────┐
│ ❌  Erro ao carregar problemas      │
│     Tente novamente                 │
└─────────────────────────────────────┘
```

### Empty States
```
┌─────────────────────────────────────┐
│ Todos os problemas disponíveis já   │
│ estão associados a outras squads.   │
└─────────────────────────────────────┘
```

---

## Summary of UI Improvements

### Consistency
✅ Matches Personas pattern
✅ Matches Roles pattern
✅ Unified interaction model
✅ Coherent visual language

### Usability
✅ More discoverable actions
✅ Clear action hierarchy
✅ Efficient workflows
✅ Reduced navigation

### Accessibility
✅ Keyboard accessible
✅ Screen reader friendly
✅ High contrast
✅ Clear focus indicators

### Maintainability
✅ Reusable patterns
✅ Consistent naming
✅ Well-documented
✅ Easy to extend
