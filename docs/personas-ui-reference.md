# Personas Feature - Visual UI Reference

## Component Location

The PersonaCard component appears on the Squad Detail page, positioned between:
1. **Above**: Problem Statement Card
2. **Below**: Main Content Grid (Timeline, Members, Decisions)

## Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  Squad Detail Page                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Problem Statement Card]                                │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Personas da Squad          [+ Adicionar Persona]  │ │
│  │                                                    │ │
│  │ Essas personas existem para validar decisões      │ │
│  │ relacionadas a este problema.                     │ │
│  │                                                    │ │
│  │ ┌──────────────────────────────────────────────┐ │ │
│  │ │ Maria Silva                              [×] │ │ │
│  │ │ [Cliente] [PF] [Influência: Alto]           │ │ │
│  │ │                                              │ │ │
│  │ │ Foco: experiência do usuário                 │ │ │
│  │ │                                              │ │ │
│  │ │ │ Maria representa o cliente final que usa  │ │ │
│  │ │ │ o produto diariamente e precisa de uma   │ │ │
│  │ │ │ interface intuitiva.                      │ │ │
│  │ │                                              │ │ │
│  │ │ Objetivos:                                   │ │ │
│  │ │ Encontrar um produto que resolva seu         │ │ │
│  │ │ problema rapidamente                         │ │ │
│  │ │                                              │ │ │
│  │ │ Dores:                                       │ │ │
│  │ │ Dificuldade em entender opções complexas     │ │ │
│  │ │                                              │ │ │
│  │ │ Comportamentos:                              │ │ │
│  │ │ Pesquisa muito antes de decidir, prefere     │ │ │
│  │ │ recomendações de pessoas próximas            │ │ │
│  │ └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │ ┌──────────────────────────────────────────────┐ │ │
│  │ │ João Santos                              [×] │ │ │
│  │ │ [Stakeholder] [jurídico] [Influência: Médio]│ │ │
│  │ │                                              │ │ │
│  │ │ Foco: compliance e risco                     │ │ │
│  │ │                                              │ │ │
│  │ │ │ João valida aspectos legais e de          │ │ │
│  │ │ │ conformidade de todas as decisões do      │ │ │
│  │ │ │ produto.                                  │ │ │
│  │ │                                              │ │ │
│  │ │ Objetivos:                                   │ │ │
│  │ │ Garantir conformidade com LGPD e             │ │ │
│  │ │ regulamentações do setor                     │ │ │
│  │ └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Timeline]  [Members]  [Decisions]                      │
└──────────────────────────────────────────────────────────┘
```

## Add Persona Form (when clicking "+ Adicionar Persona")

```
┌────────────────────────────────────────────────┐
│ Personas da Squad              [✕ Cancelar]   │
│                                                │
│ Essas personas existem para validar decisões  │
│ relacionadas a este problema.                 │
│                                                │
│ ┌──────────────────────────────────────────┐ │
│ │ Persona do Workspace                      │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ [Selecione uma persona...        ▼] │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │ Foco nesta Squad                         │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ Ex: risco, experiência, custo...    │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │ Contexto de Atuação                      │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ Explique como essa persona atua     │ │ │
│ │ │ neste problema específico...        │ │ │
│ │ │                                     │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │                      [Adicionar]         │ │
│ └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## Color Scheme

Based on CSS variables from the theme:

### Type Badges
- **Cliente**: Blue accent color (`--accent-color`)
- **Stakeholder**: Blue accent color (`--accent-color`)
- **Membro Squad**: Blue accent color (`--accent-color`)

### Subtype Badges
- Light gray background (`--bg-tertiary`)
- Gray text (`--text-secondary`)
- Subtle border (`--border-color`)

### Influence Badge
- Green/success color (`--status-active`)
- White text

### Context Description Box
- Light background (`--bg-primary`)
- Left border: Blue accent (`--accent-color`)
- Padding: 1rem
- Indented appearance for emphasis

### Interactive Elements
- Add button: Transparent with border, hover effect
- Remove (×) button: Subtle gray, red on hover
- Form inputs: Standard border, focus effect

## Typography

### Persona Name
- Font size: 1.1rem
- Font weight: 600 (semibold)
- Color: Primary text color

### Section Headers
- Font size: 1.25rem (h2)
- Font weight: 600
- Color: Primary text color

### Guidance Text
- Font size: 0.9rem
- Font style: italic
- Color: Secondary text color

### Detail Labels (Objetivos, Dores, etc.)
- Font size: 0.875rem
- Font weight: 600
- Color: Primary text color

### Detail Content
- Font size: 0.875rem
- Line height: 1.5
- Color: Secondary text color

## Responsive Behavior

### Desktop (> 768px)
- Full width within container
- Actions aligned right in header
- Horizontal layout for badges

### Mobile (≤ 768px)
- Full width
- Actions stack vertically
- Badges wrap to multiple lines
- Reduced padding

## Empty State

When no personas are associated:

```
┌────────────────────────────────────────────────┐
│ Personas da Squad          [+ Adicionar Persona]│
│                                                │
│ Essas personas existem para validar decisões  │
│ relacionadas a este problema.                 │
│                                                │
│              Nenhuma persona associada ainda.  │
│                                                │
│     Adicione personas para validar decisões e  │
│          backlog desta squad.                  │
└────────────────────────────────────────────────┘
```

## Design Philosophy

Following "ambiente de raciocínio" principles:

1. **Calm**: Neutral colors, ample whitespace
2. **Professional**: Clear hierarchy, no playful elements
3. **Thoughtful**: Long-form content encouraged
4. **Focused**: Information presented clearly without distraction
5. **Purposeful**: Every element serves a function

## Interaction Flow

### Adding a Persona
1. User clicks "+ Adicionar Persona"
2. Form appears with dropdown of available personas
3. User selects persona from workspace
4. User fills in focus and context
5. User clicks "Adicionar"
6. Persona appears in list immediately
7. Form closes

### Removing a Persona
1. User clicks "×" button on persona
2. Confirmation dialog appears
3. User confirms
4. Persona removed from list (remains in workspace)

### Viewing Details
- All persona details visible by default
- No need to expand/collapse
- Designed for reading and reflection

## Accessibility

- Proper heading hierarchy (h2, h3)
- Form labels associated with inputs
- Focus states on interactive elements
- Color contrast meets WCAG AA standards
- Keyboard navigation supported
- Screen reader friendly semantic HTML

## Notes

This is a conceptual representation. Actual appearance will match the existing design system of the Squads Virtuais application, inheriting:
- CSS variables from global theme
- Typography from main stylesheet
- Spacing and layout patterns from other components (e.g., ProblemStatementCard)
