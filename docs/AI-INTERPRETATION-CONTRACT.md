# Contrato de Interpretação do Retorno da Squad IA

## Objetivo do Documento

Este documento define como o Squads Virtuais interpreta, persiste e age sobre cada bloco do JSON retornado pelo prompt estratégico da Squad IA.

**Princípio Central:**
- **A IA sugere**
- **O usuário aprova**
- **O sistema persiste**

Nenhum artefato nasce no banco sem checkpoint humano.

---

## 1. Decision Context (Contexto de Decisão)

### Origem
`decision_context` no JSON retornado pela IA

### O que é no sistema
Registro explícito de contexto decisório inicial da squad

### Estrutura Esperada do JSON
```json
{
  "decision_context": {
    "why_now": "string",
    "what_is_at_risk": "string",
    "decision_horizon": "string"
  }
}
```

### Persistência
- **Tabela:** `sv.decisions`
- **Tipo:** `contexto_inicial`
- **Campos usados:**
  - `title` → `"Contexto inicial da squad"`
  - `decision` → JSON com `why_now`, `what_is_at_risk`, `decision_horizon`
  - `created_by_role` → `"Human + AI"`

### Comportamento do Sistema
- Criado após aprovação explícita do usuário
- Visível na timeline da squad
- Nunca editável automaticamente, apenas complementável por novas decisões
- Registra o momento e motivação da formação da squad

---

## 2. Problem Maturity (Maturidade do Problema)

### Origem
`problem_maturity` no JSON retornado pela IA

### O que é no sistema
Estado de maturidade do problema de negócio

### Estrutura Esperada do JSON
```json
{
  "problem_maturity": {
    "current_stage": "string",
    "confidence_level": "string",
    "main_gaps": ["string"]
  }
}
```

### Persistência
- **Tabela:** `sv.decisions` (atualização do Problem Statement)
- **Campos:**
  - `current_stage` → adicionado ao decision JSON
  - `confidence_level` → adicionado ao decision JSON
  - `assumptions` → derivado de `main_gaps`

### Comportamento
- Atualiza o "estado de clareza" da squad
- Influencia:
  - Rigor das validações
  - Obrigatoriedade de discovery
  - Mensagens de alerta na UI
- Não substitui o Problem Statement original, apenas enriquece

---

## 3. Personas

### Origem
`personas[]` no JSON retornado pela IA

### O que é no sistema
Personas digitais ativas da squad

### Estrutura Esperada do JSON
```json
{
  "personas": [
    {
      "name": "string",
      "type": "string",
      "description": "string",
      "goals": "string",
      "pain_points": "string"
    }
  ]
}
```

### Persistência
- **Tabela:** `sv.personas`
- **Campos:**
  - `workspace_id` → workspace da squad
  - `name`
  - `type`
  - `description`
  - `goals`
  - `pain_points`
  - `active` → `true`
- **Tabela de Ligação:** `sv.squad_personas` para associar persona à squad

### Comportamento
- Cada persona é apresentada em modal separado para aprovação
- Criadas automaticamente após aprovação
- Passam a ser obrigatórias em:
  - Validação de issues
  - Validação de fases
  - Checkpoints de decisão
- Rejeição: persona não existe no sistema

---

## 4. Governance (Governança)

### Origem
`governance` no JSON retornado pela IA

### O que é no sistema
Regras explícitas de governança da squad

### Estrutura Esperada do JSON
```json
{
  "governance": {
    "decision_rules": ["string"],
    "non_negotiables": ["string"]
  }
}
```

### Persistência
- **Tabela:** `sv.decisions`
- **Título:** `"Governance Rules"`
- **Decision JSON:**
  - `decision_rules`
  - `non_negotiables`
- **created_by_role:** `"Human + AI"`

### Comportamento
- Define bloqueios de fluxo:
  - Issue não avança sem responsáveis humanos
  - Decisões precisam de registro explícito
- UI mostra isso como "Regras da Squad"
- Pode ser referenciada em validações futuras

---

## 5. Squad Structure (Papéis / Agentes)

### Origem
`squad_structure.roles[]` no JSON retornado pela IA

### O que é no sistema
Papéis funcionais da squad (agentes)

### Estrutura Esperada do JSON
```json
{
  "squad_structure": {
    "roles": [
      {
        "role": "string",
        "label": "string",
        "description": "string",
        "accountability": "string",
        "responsibility": "string"
      }
    ]
  }
}
```

### Persistência
- **Tabela:** `sv.squad_roles`
- **Campos:**
  - `squad_id`
  - `role_id` (se existir role global)
  - `workspace_role_id` (se existir role do workspace)
  - `active` → `true`
- Se role não existir, criar primeiro em `sv.workspace_roles`

### Comportamento
- Cada role apresentada em modal individual (mesmo padrão do modal de adicionar papel)
- Criação automática após aprovação
- Usuário pode editar, remover ou adicionar novos após aprovação
- Cada ação futura da IA referencia esses papéis

---

## 6. Recommended Flow (Fases Recomendadas)

### Origem
`recommended_flow.phases[]` no JSON retornado pela IA

### O que é no sistema
Sequência metodológica sugerida

### Estrutura Esperada do JSON
```json
{
  "recommended_flow": {
    "phases": [
      {
        "name": "string",
        "order": number,
        "description": "string",
        "objective": "string",
        "is_optional": boolean
      }
    ]
  }
}
```

### Persistência
- **Tabela:** `sv.phases`
- **Campos:**
  - `squad_id`
  - `name`
  - `order_index`
  - `status` → `'rascunho'`

### Comportamento
- Modal apresenta todas as fases em ordem
- Fases criadas em estado `rascunho` após aprovação
- Usuário pode:
  - Aprovar todas
  - Editar individualmente
  - Remover antes da persistência
- Stop conditions viram regras de pausa da squad (se implementadas no futuro)

---

## 7. Critical Unknowns (Incertezas Críticas)

### Origem
`critical_unknowns[]` no JSON retornado pela IA

### O que é no sistema
Incertezas críticas que bloqueiam investimento

### Estrutura Esperada do JSON
```json
{
  "critical_unknowns": [
    {
      "question": "string",
      "why_it_matters": "string",
      "how_to_reduce": "string"
    }
  ]
}
```

### Persistência
- **Tabela:** `sv.decisions`
- **Título:** `"Incerteza Crítica"`
- **Decision JSON:**
  - `question`
  - `why_it_matters`
  - `how_to_reduce`
- **created_by_role:** `"Human + AI"`

### Comportamento
- Cada incerteza apresentada em modal separado
- Sistema sinaliza: "Squad não pronta para produção"
- Podem gerar fases de discovery automaticamente no futuro
- Rejeição: incerteza não registrada, mas squad pode continuar

---

## 8. Execution Model (Modelo de Execução)

### Origem
`execution_model` no JSON retornado pela IA

### O que é no sistema
Modo de execução humano + IA

### Estrutura Esperada do JSON
```json
{
  "execution_model": {
    "approach": "string",
    "constraints": ["string"],
    "responsibilities": "string"
  }
}
```

### Persistência
- **Tabela:** `sv.decisions`
- **Título:** `"Execution Model"`
- **Decision JSON:**
  - `approach`
  - `constraints`
  - `responsibilities`
- **created_by_role:** `"Human + AI"`

### Comportamento
- Define:
  - Como backlog é criado
  - Se IA pode sugerir ou só estruturar
- Não cria código automaticamente
- Influencia comportamento futuro do sistema

---

## 9. Engineering Model

### Origem
Pode estar em `engineering_model` ou integrado no `execution_model`

### Comportamento
- Tratado de forma similar ao Execution Model
- Pode ser fundido no mesmo registro de decisão
- Define práticas técnicas da squad

---

## 10. Validation Strategy (Estratégia de Validação)

### Origem
`validation_strategy` no JSON retornado pela IA

### Estrutura Esperada do JSON
```json
{
  "validation_strategy": {
    "signals_to_stop": ["string"],
    "signals_of_confidence": ["string"]
  }
}
```

### Persistência
- **Tabela:** `sv.decisions`
- **Título:** `"Validation Strategy"`
- **Decision JSON:**
  - `signals_to_stop`
  - `signals_of_confidence`
- **created_by_role:** `"Human + AI"`

### Comportamento
- Bloqueia avanço de fase se sinais negativos aparecerem
- UI mostra "alertas de confiança"
- Pode ativar regras de bloqueio de fluxo

---

## 11. Readiness Assessment (Avaliação de Prontidão)

### Origem
`readiness_assessment` no JSON retornado pela IA

### O que é no sistema
Estado atual da squad para execução

### Estrutura Esperada do JSON
```json
{
  "readiness_assessment": {
    "is_ready_to_build_product": boolean,
    "conditions": ["string"],
    "recommendations": "string"
  }
}
```

### Persistência
- **Tabela:** `sv.squads`
- **Campo:** `status`
- **Mapeamento:**
  - `is_ready_to_build_product = false` → `status = 'rascunho'` ou `'pausada'`
  - `is_ready_to_build_product = true` → `status = 'ativa'`

### Comportamento
- Modal informativo (não cria entidade direta)
- Apresenta:
  - Se a squad está pronta ou não
  - Condições para avançar ou pausar
- Aprovação: atualiza `sv.squads.status`

---

## Regras de Persistência (Definition of Done)

### ✅ Aprovação
1. Nada é salvo sem aprovação explícita
2. Nenhuma tabela é escrita automaticamente
3. Backend não inventa colunas
4. Tudo segue a documentação oficial
5. Cada aprovação gera um decision log automático em `sv.suggestion_decisions`

### ❌ Rejeição
1. Rejeições não quebram o fluxo
2. Rejeições são registradas em `sv.suggestion_decisions` para histórico
3. Dados rejeitados não aparecem no sistema
4. Usuário pode opcionalmente fornecer motivo da rejeição

### 🔄 Aprovação com Ajustes
1. Usuário pode editar payload antes de aprovar
2. Sistema registra que houve edição em `sv.suggestion_decisions`
3. Versão editada é persistida, não a original da IA

---

## Fluxo Técnico de Alto Nível

1. **Receber JSON da IA** → endpoint `ai-structure-proposal`
2. **Converter cada bloco em uma SuggestionProposal** → endpoint `suggestion-approvals/breakdown`
3. **Armazenar propostas em** `sv.suggestion_proposals` com `status = 'pending'`
4. **Exibir modais de aprovação** → componente `ApprovalQueue`
5. **Após aprovação:**
   - Persistir no banco (tabelas específicas por tipo)
   - Registrar decision log automático em `sv.suggestion_decisions`
   - Atualizar `sv.suggestion_proposals.status` para `'approved'` ou `'approved_with_edits'`
6. **Atualizar status da squad** conforme aprovações concluídas

---

## Estados de Sugestão

| Estado | Descrição |
|--------|-----------|
| `pending` | Aguardando aprovação do usuário |
| `approved` | Aprovado sem modificações |
| `approved_with_edits` | Aprovado após ajustes pelo usuário |
| `rejected` | Rejeitado pelo usuário |

---

## UI / Experiência (Obrigatório)

### Design Pattern
- Utilizar modal no mesmo padrão visual do modal de adicionar papel à squad
- Modal calmo, focado em leitura e decisão
- Sem ações destrutivas em destaque

### Informações Apresentadas
Para cada modal:
1. **O que está sendo sugerido** → conteúdo da sugestão
2. **Onde isso será usado no sistema** → info box explicativa
3. **Impacto da aprovação** → texto claro sobre o que acontece ao aprovar

### Ações Disponíveis
- **Aprovar** → persiste dados, cria decision log
- **Ajustar e Aprovar** → permite edição antes de persistir (futuro)
- **Rejeitar** → não persiste, registra decisão
- **Revisar Depois** → fecha modal, mantém sugestão pendente

---

## Referência de Implementação

### Backend
- `netlify/functions/suggestion-approvals.js`
- Endpoints:
  - `GET /suggestion-approvals?squad_id=...` → listar pendentes
  - `POST /suggestion-approvals/breakdown` → quebrar proposta em sugestões
  - `POST /suggestion-approvals/:id/approve` → aprovar sugestão
  - `POST /suggestion-approvals/:id/reject` → rejeitar sugestão

### Frontend
- `src/components/SuggestionApprovalModal.jsx` → modal base
- `src/components/SuggestionApprovalContent.jsx` → renderização por tipo
- `src/components/ApprovalQueue.jsx` → gerenciador de fila sequencial

### Database
- `docs/migrations/014-create-suggestion-approval-tables.sql`
- Tabelas:
  - `sv.suggestion_proposals`
  - `sv.suggestion_decisions`

---

## Versão
Documento versão 1.0 - criado em 2025-12-28

Este documento é a fonte da verdade para interpretação dos retornos da Squad IA.
