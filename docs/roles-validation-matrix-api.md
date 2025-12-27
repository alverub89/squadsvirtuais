# API de Roles e Matriz de Validação

Esta documentação descreve os endpoints da API para gerenciamento de roles (especialidades) e matriz de validação no Squads Virtuais.

---

## Conceitos

### Role (Especialidade)
Uma **role** representa uma especialidade ou responsabilidade dentro de uma squad. Pode ser:
- **Global**: Definida no catálogo global do produto
- **Workspace**: Customizada pelo workspace

### Squad Role
Uma **squad role** é a ativação de uma role (global ou workspace) em uma squad específica.

### Member Role Assignment
Um **member role assignment** é a atribuição de uma role a um membro específico da squad.

**Regra importante:** Um membro pode ter apenas 1 role ativa por squad.

### Validation Matrix
A **matriz de validação** define quais roles validam quais personas em cada tipo de checkpoint:
- **ISSUE**: Validação de issues/tarefas
- **DECISION**: Validação de decisões
- **PHASE**: Validação de fases
- **MAP**: Validação de mapeamento

Cada entrada define:
- **REQUIRED**: Validação obrigatória
- **OPTIONAL**: Validação opcional/recomendada

---

## Endpoints

### 1. Listar Roles

**GET** `/.netlify/functions/roles`

Lista todas as roles disponíveis (globais + workspace).

**Query Parameters:**
- `workspace_id` (opcional): Se fornecido, inclui também roles customizadas do workspace

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "ok": true,
  "roles": [
    {
      "id": "uuid",
      "code": "tech_lead",
      "label": "Tech Lead",
      "description": "Líder técnico responsável por arquitetura",
      "responsibilities": "Definir arquitetura, revisar código...",
      "source": "global",
      "created_at": "2025-12-27T10:00:00Z"
    },
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "code": "custom_role",
      "label": "Custom Role",
      "description": "Role customizada",
      "source": "workspace",
      "active": true,
      "created_at": "2025-12-27T10:00:00Z"
    }
  ]
}
```

---

### 2. Criar Role de Workspace

**POST** `/.netlify/functions/workspace-roles`

Cria uma role customizada no workspace.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "workspace_id": "uuid",
  "code": "custom_specialist",
  "label": "Custom Specialist",
  "description": "Especialista customizado",
  "responsibilities": "Responsabilidades específicas..."
}
```

**Response 201:**
```json
{
  "ok": true,
  "role": {
    "id": "uuid",
    "workspace_id": "uuid",
    "code": "custom_specialist",
    "label": "Custom Specialist",
    "description": "Especialista customizado",
    "responsibilities": "Responsabilidades específicas...",
    "active": true,
    "created_at": "2025-12-27T10:00:00Z",
    "updated_at": "2025-12-27T10:00:00Z"
  }
}
```

---

### 3. Atualizar Role de Workspace

**PATCH** `/.netlify/functions/workspace-roles`

Atualiza uma role do workspace.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "label": "Updated Label",
  "description": "Updated description",
  "responsibilities": "Updated responsibilities",
  "active": false
}
```

**Response 200:**
```json
{
  "ok": true,
  "role": { /* updated role */ }
}
```

---

### 4. Listar Squad Roles

**GET** `/.netlify/functions/squad-roles`

Lista todas as roles ativas e inativas de uma squad.

**Query Parameters:**
- `squad_id` (obrigatório): ID da squad

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "ok": true,
  "roles": [
    {
      "squad_role_id": "uuid",
      "squad_id": "uuid",
      "active": true,
      "source": "global",
      "role_id": "uuid",
      "code": "tech_lead",
      "label": "Tech Lead",
      "description": "...",
      "responsibilities": "...",
      "created_at": "2025-12-27T10:00:00Z"
    }
  ]
}
```

---

### 5. Ativar Role na Squad

**POST** `/.netlify/functions/squad-roles`

Ativa uma role (global ou workspace) em uma squad.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "squad_id": "uuid",
  "role_id": "uuid",          // Para role global
  "workspace_role_id": null   // Para role workspace
}
```

**Nota:** Deve fornecer **apenas** `role_id` OU `workspace_role_id`, não ambos.

**Response 201:**
```json
{
  "ok": true,
  "squad_role": {
    "id": "uuid",
    "squad_id": "uuid",
    "role_id": "uuid",
    "workspace_role_id": null,
    "active": true,
    "created_at": "2025-12-27T10:00:00Z",
    "updated_at": "2025-12-27T10:00:00Z"
  }
}
```

---

### 6. Ativar/Desativar Squad Role

**PATCH** `/.netlify/functions/squad-roles`

Ativa ou desativa uma role já adicionada à squad.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "active": false
}
```

**Response 200:**
```json
{
  "ok": true,
  "squad_role": { /* updated squad role */ }
}
```

---

### 7. Atribuir/Remover Role de Membro

**POST** `/.netlify/functions/squad-member-roles`

Atribui ou remove uma role de um membro da squad.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (Atribuir):**
```json
{
  "squad_member_id": "uuid",
  "squad_role_id": "uuid",
  "action": "assign"
}
```

**Body (Remover):**
```json
{
  "squad_member_id": "uuid",
  "action": "unassign"
}
```

**Response 201 (assign) / 200 (unassign):**
```json
{
  "ok": true,
  "assignment": {
    "id": "uuid",
    "squad_member_id": "uuid",
    "squad_id": "uuid",
    "squad_role_id": "uuid",
    "active": true,
    "assigned_at": "2025-12-27T10:00:00Z",
    "unassigned_at": null,
    "created_at": "2025-12-27T10:00:00Z",
    "updated_at": "2025-12-27T10:00:00Z"
  }
}
```

---

### 8. Listar Atribuições de Roles

**GET** `/.netlify/functions/squad-member-roles`

Lista todas as atribuições de roles ativas em uma squad.

**Query Parameters:**
- `squad_id` (obrigatório): ID da squad

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "ok": true,
  "assignments": [
    {
      "assignment_id": "uuid",
      "squad_member_id": "uuid",
      "squad_role_id": "uuid",
      "assigned_at": "2025-12-27T10:00:00Z",
      "active": true,
      "user_id": "uuid",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "user_avatar_url": "https://...",
      "role_code": "tech_lead",
      "role_label": "Tech Lead",
      "role_source": "global"
    }
  ]
}
```

---

### 9. Obter Matriz de Validação

**GET** `/.netlify/functions/squad-validation-matrix`

Retorna a versão atual da matriz de validação de uma squad.

**Query Parameters:**
- `squad_id` (obrigatório): ID da squad

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "ok": true,
  "version": {
    "id": "uuid",
    "squad_id": "uuid",
    "version": 2,
    "description": "Adicionar validação de Designer UX",
    "created_by_user_id": "uuid",
    "created_at": "2025-12-27T10:00:00Z"
  },
  "entries": [
    {
      "id": "uuid",
      "version_id": "uuid",
      "squad_role_id": "uuid",
      "persona_id": "uuid",
      "checkpoint_type": "ISSUE",
      "requirement_level": "REQUIRED",
      "role_code": "tech_lead",
      "role_label": "Tech Lead",
      "role_source": "global",
      "persona_name": "Usuário Final",
      "persona_type": "cliente",
      "created_at": "2025-12-27T10:00:00Z"
    }
  ]
}
```

**Response 200 (sem versão):**
```json
{
  "ok": true,
  "version": null,
  "entries": []
}
```

---

### 10. Criar Nova Versão da Matriz

**POST** `/.netlify/functions/squad-validation-matrix`

Cria uma nova versão da matriz de validação.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "squad_id": "uuid",
  "description": "Descrição opcional da versão",
  "entries": [
    {
      "squad_role_id": "uuid",
      "persona_id": "uuid",
      "checkpoint_type": "ISSUE",
      "requirement_level": "REQUIRED"
    },
    {
      "squad_role_id": "uuid",
      "persona_id": "uuid",
      "checkpoint_type": "DECISION",
      "requirement_level": "OPTIONAL"
    }
  ]
}
```

**Checkpoint Types:**
- `ISSUE` - Validação de issues/tarefas
- `DECISION` - Validação de decisões
- `PHASE` - Validação de fases
- `MAP` - Validação de mapeamento

**Requirement Levels:**
- `REQUIRED` - Validação obrigatória
- `OPTIONAL` - Validação opcional/recomendada

**Response 201:**
```json
{
  "ok": true,
  "version": {
    "id": "uuid",
    "squad_id": "uuid",
    "version": 3,
    "description": "Descrição opcional da versão",
    "created_by_user_id": "uuid",
    "created_at": "2025-12-27T10:00:00Z"
  },
  "entries": [ /* array of created entries */ ]
}
```

---

## Códigos de Erro

### 400 Bad Request
- Parâmetros obrigatórios ausentes
- Valores inválidos
- Violação de regras de negócio

### 401 Unauthorized
- Token inválido ou ausente

### 403 Forbidden
- Usuário não tem acesso ao workspace/squad

### 404 Not Found
- Recurso não encontrado

### 409 Conflict
- Violação de constraint único
- Role já ativa na squad
- Membro já possui role ativa

### 500 Internal Server Error
- Erro do servidor

---

## Regras de Negócio

### Roles
- Código de role global deve ser único
- Código de role workspace deve ser único por workspace
- Uma role não pode estar ativa múltiplas vezes na mesma squad

### Member Role Assignments
- Um membro pode ter apenas 1 role ativa por squad
- Ao atribuir nova role, a anterior é automaticamente desativada

### Validation Matrix
- Matriz é versionada automaticamente
- Versões antigas nunca são editadas
- Cada entrada deve ter role, persona, checkpoint type e requirement level
- Não pode haver duplicidade de (role, persona, checkpoint) na mesma versão
- Squad role deve pertencer à squad
- Persona deve pertencer ao workspace da squad

---

## Exemplos de Uso

### Configurar roles em uma nova squad

1. Listar roles disponíveis: `GET /roles?workspace_id={id}`
2. Ativar roles na squad: `POST /squad-roles` para cada role
3. Atribuir roles aos membros: `POST /squad-member-roles` com `action=assign`
4. Criar matriz de validação: `POST /squad-validation-matrix`

### Trocar role de um membro

1. Atribuir nova role: `POST /squad-member-roles` com nova `squad_role_id` e `action=assign`
   - A role anterior será automaticamente desativada

### Atualizar matriz de validação

1. Criar nova versão: `POST /squad-validation-matrix` com novas entradas
   - A versão anterior permanece no histórico
   - A nova versão se torna a versão vigente

---

Para mais informações sobre a arquitetura e decisões técnicas, consulte:
- [Decisão Técnica: Roles e Matriz de Validação](./technical-decision-roles-validation-matrix.md)
- [Database Schema](./database-schema.md)
