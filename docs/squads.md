# Squads

## O que é uma Squad?

Uma **squad** é a unidade central de trabalho do Squads Virtuais. Ela representa um grupo focado em resolver um problema de negócio específico, organizando todo o método de trabalho em um único lugar.

## Relação entre Workspace e Squad

```
Workspace (contexto organizacional)
  └── Squad 1 (problema específico)
  └── Squad 2 (problema específico)
  └── Squad 3 (problema específico)
```

- **Workspace**: Organiza pessoas, permissões e contexto geral (ex: "Produto Principal", "Cliente X")
- **Squad**: Foca em um problema de negócio específico dentro do workspace

**Regra fundamental**: Uma squad sempre pertence a um workspace. Não existe squad órfã.

## Ciclo de Vida de uma Squad

### Status Possíveis

Uma squad passa por diferentes estados durante sua existência:

| Status | Descrição | Quando usar |
|--------|-----------|-------------|
| `rascunho` | Estado inicial (padrão) | Squad recém-criada, ainda sendo estruturada |
| `ativa` | Squad em execução | Trabalho em andamento, backlog sendo executado |
| `aguardando_execucao` | Pronta mas não iniciada | Planejamento completo, aguardando recursos/priorização |
| `em_revisao` | Sob revisão | Trabalho concluído, passando por validação |
| `concluida` | Finalizada | Objetivos alcançados, squad encerrada |
| `pausada` | Temporariamente pausada | Trabalho interrompido, pode retornar |

### Fluxo Típico

```
rascunho → ativa → em_revisao → concluida
              ↓
           pausada → ativa
```

## Estrutura de uma Squad

Uma squad organiza o método completo:

1. **Problema de Negócio** (futuro)
   - Definição clara do problema a resolver
   - Contexto e justificativa

2. **Personas** (futuro)
   - Usuários afetados pelo problema
   - Necessidades e comportamentos

3. **Fases** (futuro)
   - Etapas do método
   - Marcos e entregas

4. **Backlog** (futuro)
   - Tarefas e histórias
   - Priorização

5. **Integração com Repositório** (futuro)
   - Vínculo com código
   - Rastreamento de desenvolvimento

> **Nota**: Esta versão inicial implementa apenas a criação da squad. As funcionalidades acima serão adicionadas gradualmente.

## Criando uma Squad

### Pré-requisitos

- Você deve ser membro do workspace
- O workspace deve existir e estar ativo

### Informações Necessárias

**Obrigatórias:**
- **Nome**: Identifica a squad de forma clara (ex: "Onboarding de Usuários")

**Opcionais:**
- **Descrição**: Contexto adicional sobre o propósito da squad

**Automáticas:**
- **Status**: Sempre inicia como `rascunho`
- **Workspace**: Definido automaticamente pelo contexto

### Processo de Criação

1. Acesse o workspace desejado
2. Clique em "Criar Squad"
3. Preencha o nome (obrigatório) e descrição (opcional)
4. Clique em "Criar squad"
5. A squad é criada com status `rascunho`

### Regras de Negócio

- ✅ Usuário deve ser membro do workspace
- ✅ Nome não pode estar vazio
- ✅ Status inicial sempre `rascunho`
- ✅ Workspace deve existir e ser válido
- ❌ Não é possível criar squad sem workspace
- ❌ Não é possível criar squad em workspace onde não é membro

## Permissões

### Quem pode criar squads?

Qualquer membro do workspace pode criar squads.

### Quem pode ver squads?

Todos os membros do workspace podem ver todas as squads do workspace.

> **Futuro**: Permissões mais granulares podem ser adicionadas (ex: roles, membros específicos por squad).

## API

### Criar Squad

**Endpoint:** `POST /squads-create`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "workspace_id": "uuid",
  "name": "Nome da Squad",
  "description": "Descrição opcional"
}
```

**Resposta de Sucesso (201):**
```json
{
  "ok": true,
  "squad": {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Nome da Squad",
    "description": "Descrição opcional",
    "status": "rascunho",
    "created_at": "2025-12-27T00:00:00Z",
    "updated_at": "2025-12-27T00:00:00Z"
  }
}
```

**Erros:**
- `400` - Dados inválidos (nome vazio, workspace_id ausente)
- `401` - Não autenticado
- `403` - Usuário não é membro do workspace
- `404` - Workspace não encontrado
- `500` - Erro interno

### Listar Squads

**Endpoint:** `GET /squads?workspace_id={uuid}`

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta de Sucesso (200):**
```json
{
  "ok": true,
  "squads": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Nome da Squad",
      "description": "Descrição",
      "status": "rascunho",
      "created_at": "2025-12-27T00:00:00Z"
    }
  ]
}
```

## Banco de Dados

### Tabela: sv.squads

```sql
CREATE TABLE sv.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sv.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT squads_status_check 
    CHECK (status IN ('rascunho', 'ativa', 'aguardando_execucao', 
                      'em_revisao', 'concluida', 'pausada'))
);
```

### Constraints

- `workspace_id` é obrigatório (NOT NULL)
- `workspace_id` referencia `sv.workspaces(id)` com CASCADE DELETE
- `status` deve ser um dos valores permitidos
- Nome é obrigatório (NOT NULL)

## Onde Começa o Método?

O método começa com a **definição do problema de negócio** dentro de uma squad.

### Fluxo Inicial (versão futura)

1. Criar workspace (contexto organizacional)
2. Criar squad (unidade de trabalho)
3. **Definir problema de negócio** ← Começa aqui
4. Identificar personas
5. Definir fases
6. Criar backlog
7. Integrar com repositório

> **Status Atual**: Apenas os passos 1 e 2 estão implementados. Os demais serão adicionados nas próximas iterações.

## Práticas Recomendadas

### Nomeação de Squads

✅ **Bom:**
- "Onboarding de Usuários"
- "Checkout e Pagamentos"
- "Dashboard Analytics"

❌ **Evitar:**
- "Squad 1"
- "Time do João"
- "Projeto Secreto"

### Descrição

A descrição deve ajudar você e sua equipe a:
- Lembrar o contexto rapidamente
- Entender o propósito sem abrir a squad
- Diferenciar squads similares

**Exemplo:**
> "Melhorar o processo de criação de conta e primeiro acesso, reduzindo abandono na primeira semana"

### Quando Criar uma Nova Squad

Crie uma nova squad quando:
- O problema é suficientemente distinto
- Requer foco dedicado
- Tem escopo e objetivo claros

Evite criar squads demais:
- Mantém organização simples
- Facilita priorização
- Reduz overhead de gestão

## Próximos Passos

Após criar uma squad, você poderá (futuro):

1. **Definir o Problema**: O que estamos resolvendo e por quê?
2. **Mapear Personas**: Quem é afetado por este problema?
3. **Estruturar Fases**: Como dividir o trabalho?
4. **Criar Backlog**: Quais tarefas executar?
5. **Conectar Repositório**: Onde o código está?

Por enquanto, a squad existe como entidade estrutural, pronta para receber essas funcionalidades.
