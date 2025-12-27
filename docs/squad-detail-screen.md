# Squad Detail Screen - Tela de Detalhe da Squad (Overview Completo)

## Visão Geral

A tela de detalhe da squad é o **centro operacional do produto**, fornecendo uma visão completa do estado atual do trabalho, progresso, decisões tomadas e membros da squad.

## Características Principais

### 1. Indicadores no Topo (Cards)

Três indicadores visuais fornecem métricas rápidas:

- **Issues**: Total de issues criadas para a squad
- **Etapas**: Progresso atual (ex: 3/5 etapas)
- **Membros**: Número de membros ativos na squad

### 2. Linha do Tempo do Método

Timeline com 5 etapas fixas, cada uma mostrando seu estado:

1. **Análise do Problema**
   - Status: Sempre "done" (implementação futura irá validar)
   - Indica se problema foi definido

2. **Definição de Personas**
   - Status: "done" se existir ao menos uma persona ativa
   - Status: "current" se próximas etapas já iniciadas mas esta não
   - Status: "next" se é a próxima etapa
   - Status: "future" se ainda não chegou

3. **Estruturação do Backlog**
   - Status: "done" se existir ao menos uma phase criada
   - Lógica similar para outros estados

4. **Geração de Issues**
   - Status: "done" se existir ao menos uma issue criada
   - Lógica similar para outros estados

5. **Validação Final**
   - Status: "done" se existir decisão registrada
   - Última etapa do método

**Estados Possíveis:**
- `done`: Etapa concluída (verde)
- `current`: Etapa em andamento (azul)
- `next`: Próxima etapa (cinza claro)
- `future`: Etapa futura (cinza muito claro)

### 3. Decisões Recentes

Card lateral mostrando as últimas 5 decisões tomadas na squad:

- Título da decisão
- Resumo/descrição
- Papel/role de quem tomou a decisão
- Tempo relativo (ex: "Há 2 dias")

**Ordenação:** Por data de criação (mais recente primeiro)

### 4. Membros da Squad

Card lateral mostrando preview dos membros:

- Primeiros 3 membros ativos
- Avatar com iniciais
- Nome do membro
- Role/papel na squad
- Contador de membros adicionais se houver mais de 3

## Ações Disponíveis

### Editar Squad

Permite editar:
- Nome da squad
- Descrição
- Status (rascunho, ativa, em_revisao, etc.)

**Validação:**
- Usuário deve ser membro do workspace
- Nome não pode ser vazio

### Excluir Squad

Remove completamente a squad e todos os dados relacionados:
- Phases
- Issues
- Personas
- Decisions
- Squad members

**Validação:**
- Usuário deve ser membro do workspace
- Confirmação obrigatória no frontend

## Autorização

**Regra Fundamental:** Apenas membros do workspace podem acessar a squad.

Verificação feita em todos os endpoints:
1. Usuário está autenticado (JWT válido)
2. Squad existe
3. Usuário é membro do workspace da squad (tabela `sv.workspace_members`)

## Backend API

### GET /squads/:id/overview

Retorna overview completo da squad.

**Cálculos Realizados:**
- Conta issues (`sv.issues`)
- Conta fases e identifica fase atual (`sv.phases`)
- Conta membros ativos (`sv.squad_members`)
- Busca últimas 5 decisões (`sv.decisions`)
- Busca primeiros 3 membros ativos com roles (`sv.squad_members` + `sv.users`)
- Calcula estado de cada item da timeline baseado em existência de dados

**Formato de Resposta:**
```json
{
  "squad": {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "Squad Name",
    "description": "Description",
    "status": "rascunho"
  },
  "counts": {
    "members": 3,
    "issues": 12,
    "phase": {
      "current": 3,
      "total": 5
    }
  },
  "timeline": [
    {
      "key": "problem",
      "title": "Análise do Problema",
      "state": "done",
      "relativeTime": "Há 2 dias"
    }
  ],
  "membersPreview": [
    {
      "initials": "TL",
      "name": "João Silva",
      "role": "Tech Lead",
      "active": true
    }
  ],
  "recentDecisions": [
    {
      "title": "Arquitetura escolhida",
      "summary": "Monolito modular",
      "role": "Tech Lead",
      "relativeTime": "Há 1 dia"
    }
  ]
}
```

### PATCH /squads/:id

Atualiza dados básicos da squad.

**Campos Editáveis:**
- `name` (string, obrigatório se fornecido)
- `description` (string, opcional)
- `status` (string, opcional)

**Validação:**
- Ao menos um campo deve ser fornecido
- Usuário deve ser membro do workspace

### DELETE /squads/:id

Exclui a squad e todos os dados relacionados.

**Cascata Automática:**
O banco de dados automaticamente remove:
- Todas as phases da squad
- Todas as issues da squad
- Todas as personas da squad
- Todas as decisions da squad
- Todos os squad_members da squad

**Validação:**
- Usuário deve ser membro do workspace

## Frontend

### Componente: SquadDetail

**Localização:** `/src/pages/SquadDetail.jsx`

**Props (via React Router):**
- `workspaceId` - ID do workspace (route param)
- `squadId` - ID da squad (route param)

**Estados:**
- `squadData` - Dados completos da squad
- `loading` - Estado de carregamento
- `error` - Mensagem de erro (se houver)
- `isEditing` - Modo de edição ativado
- `editForm` - Formulário de edição

**Hooks Utilizados:**
- `useParams()` - Captura workspaceId e squadId da URL
- `useNavigate()` - Navegação programática
- `useAuth()` - Token JWT para autenticação
- `useEffect()` - Carrega dados ao montar/atualizar

### Navegação

**Rota:** `/workspaces/:workspaceId/squads/:squadId`

**Acesso:**
- Clicando em um card de squad na lista de squads
- URL direta (se usuário tiver permissão)

**Botão Voltar:** Retorna para `/workspaces/:workspaceId/squads`

## Estilos

### Design System

**Cores:**
- Background principal: `#f8fafc`
- Cards: `#ffffff` com borda `#e5e7eb`
- Texto principal: `#0f172a`
- Texto secundário: `#64748b`
- Texto terciário: `#94a3b8`

**Indicadores:**
- Issues: Azul (`#3b82f6`)
- Phases: Roxo (`#8b5cf6`)
- Members: Verde (`#10b981`)

**Timeline:**
- Done: Verde (`#10b981`)
- Current: Azul (`#3b82f6`)
- Next: Cinza médio (`#94a3b8`)
- Future: Cinza claro (`#cbd5e1`)

### Layout Responsivo

**Desktop (>1024px):**
- Content grid: 2 colunas (timeline + sidebar)
- Sidebar: 380px de largura fixa

**Tablet (768px - 1024px):**
- Content grid: 1 coluna (timeline sobre sidebar)

**Mobile (<768px):**
- Indicadores: 1 coluna
- Timeline e sidebar: largura total
- Botões de ação: largura total

## Banco de Dados

### Tabelas Utilizadas

#### sv.squads
Tabela principal com dados da squad.

**Campos utilizados:**
- `id`, `workspace_id`, `name`, `description`, `status`

#### sv.workspace_members
Autorização de acesso.

**Campos utilizados:**
- `workspace_id`, `user_id`

#### sv.issues
Issues/tarefas da squad.

**Campos utilizados:**
- `id`, `squad_id`

#### sv.phases
Fases do método.

**Campos utilizados:**
- `id`, `squad_id`, `order_index`, `status`, `created_at`

#### sv.personas
Personas da squad.

**Campos utilizados:**
- `id`, `squad_id`, `active`

#### sv.decisions
Decisões tomadas.

**Campos utilizados:**
- `id`, `squad_id`, `title`, `decision`, `created_by_role`, `created_at`

#### sv.squad_members
Membros atribuídos à squad.

**Campos utilizados:**
- `id`, `squad_id`, `user_id`, `role_code`, `role_label`, `active`, `created_at`

### Migrations

**Arquivo:** `/docs/migrations/002-create-squad-detail-tables.sql`

Cria as seguintes tabelas:
- `sv.phases`
- `sv.issues`
- `sv.personas`
- `sv.decisions`
- `sv.squad_members`

Todas com constraints adequados e índices para performance.

## Regras de Negócio

### Timeline Calculation Logic

A lógica do backend determina o estado de cada etapa:

```javascript
// Análise do Problema: sempre done (por enquanto)
problem: "done"

// Definição de Personas
if (hasPersonas) {
  state = "done"
} else if (hasPhases || hasIssues || hasDecisions) {
  state = "current" // próximas etapas já iniciadas
} else {
  state = "next"
}

// Similar para outras etapas
```

### Relative Time Calculation

Tempo relativo calculado no backend:

```javascript
diffMinutes < 60 → "Há X minutos"
diffHours < 24   → "Há X horas"
diffDays >= 1    → "Há X dias"
```

## Testes Recomendados

### Backend

1. **GET /squads/:id/overview**
   - ✅ Retorna 401 sem token
   - ✅ Retorna 403 se usuário não é membro
   - ✅ Retorna 404 se squad não existe
   - ✅ Retorna 200 com dados corretos
   - ✅ Calcula timeline corretamente
   - ✅ Retorna últimas 5 decisões
   - ✅ Retorna primeiros 3 membros

2. **PATCH /squads/:id**
   - ✅ Retorna 401 sem token
   - ✅ Retorna 403 se usuário não é membro
   - ✅ Retorna 400 se nenhum campo fornecido
   - ✅ Atualiza apenas campos fornecidos
   - ✅ Retorna squad atualizada

3. **DELETE /squads/:id**
   - ✅ Retorna 401 sem token
   - ✅ Retorna 403 se usuário não é membro
   - ✅ Remove squad e dados relacionados
   - ✅ Retorna 200 em sucesso

### Frontend

1. **Navegação**
   - ✅ Carrega overview ao abrir
   - ✅ Mostra loading durante carregamento
   - ✅ Mostra erro se falhar
   - ✅ Botão voltar funciona

2. **Edição**
   - ✅ Entra em modo de edição ao clicar "Editar"
   - ✅ Salva alterações ao clicar "Salvar"
   - ✅ Cancela edição ao clicar "Cancelar"
   - ✅ Recarrega dados após salvar

3. **Exclusão**
   - ✅ Pede confirmação antes de excluir
   - ✅ Redireciona para lista após excluir
   - ✅ Mostra erro se falhar

## Notas de Implementação

### Backend sem Lógica no Frontend

Todo cálculo é feito no backend:
- Contadores
- Estados da timeline
- Tempo relativo
- Ordenação de decisões

Frontend apenas exibe os dados recebidos.

### Tabelas Necessárias

Todas as tabelas devem existir antes de usar a feature:
- `sv.squads` (já existe)
- `sv.workspace_members` (já existe)
- `sv.phases` (nova)
- `sv.issues` (nova)
- `sv.personas` (nova)
- `sv.decisions` (nova)
- `sv.squad_members` (nova)

Execute a migration 002 para criar as novas tabelas.

### Performance

Queries otimizadas:
- Usa índices em foreign keys
- Usa COUNT(*) para contadores
- Usa LIMIT para decisões e membros
- Usa Promise.all para queries paralelas

## Futuras Melhorias

1. **Problem Statement Table**
   - Adicionar validação real para "Análise do Problema"
   - Criar tabela `sv.problem_statements`

2. **Real-time Updates**
   - WebSocket para atualizar dados em tempo real
   - Notificações de mudanças

3. **Roles Granulares**
   - Permissões específicas por role na squad
   - Editor vs Viewer

4. **Histórico de Edições**
   - Audit log de mudanças na squad
   - Quem editou o quê e quando

5. **Exportação**
   - Exportar overview como PDF
   - Compartilhar link público (read-only)
