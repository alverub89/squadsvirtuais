# Contrato Funcional: sv.repo_connections

## Visão Geral

Este documento especifica como o backend deve usar a tabela `sv.repo_connections` existente no banco de dados. Esta tabela representa repositórios GitHub conectados a um workspace.

## Campos Esperados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único da conexão (PK) |
| `workspace_id` | uuid | Referência ao workspace (FK, NOT NULL) |
| `repo_full_name` | text | Nome completo do repositório no formato "owner/repo" (NOT NULL) |
| `default_branch` | text | Branch padrão do repositório (ex: "main", "master") |
| `permissions_level` | text | Nível de permissão (read, write, admin) |
| `connected_at` | timestamptz | Data/hora em que o repositório foi conectado |

## Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `(workspace_id, repo_full_name)` - Um repositório por workspace
- **FOREIGN KEY**: `workspace_id` → `workspaces.id` (assumido)

## Regras de Uso

### Identificação

- Uma conexão representa um repositório GitHub vinculado a um workspace
- `repo_full_name` é o identificador lógico único (formato: "owner/repo")
- Um mesmo repositório pode estar conectado a múltiplos workspaces
- Um workspace pode ter múltiplos repositórios conectados

### Campos de Metadados

- **repo_full_name**: Formato obrigatório "owner/repo" (ex: "facebook/react")
- **default_branch**: Branch principal usado como referência (geralmente "main" ou "master")
- **permissions_level**: Indica o nível de acesso
  - `read`: Apenas leitura
  - `write`: Leitura e escrita
  - `admin`: Controle total

### Timestamps

- `connected_at`: Definido quando o repositório é conectado pela primeira vez
- Pode ser atualizado se o repositório for reconectado

## Operações de Persistência

### Criação ou Atualização (Upsert)

Ao conectar um repositório ao workspace:

```sql
INSERT INTO sv.repo_connections (
  workspace_id,
  repo_full_name,
  default_branch,
  permissions_level,
  connected_at
)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (workspace_id, repo_full_name)
DO UPDATE SET
  default_branch = EXCLUDED.default_branch,
  permissions_level = EXCLUDED.permissions_level,
  connected_at = EXCLUDED.connected_at
RETURNING id, workspace_id, repo_full_name, default_branch, permissions_level, connected_at
```

**Regras de Atualização:**

1. **workspace_id e repo_full_name**: Chave de conflito, nunca atualizados
2. **default_branch**: Atualizado (pode mudar no GitHub)
3. **permissions_level**: Atualizado (permissões podem mudar)
4. **connected_at**: Atualizado para NOW()

### Consulta de Repositórios por Workspace

```sql
SELECT id, repo_full_name, default_branch, permissions_level, connected_at
FROM sv.repo_connections
WHERE workspace_id = $1
ORDER BY connected_at DESC
```

### Verificar Se Repositório Já Está Conectado

```sql
SELECT id
FROM sv.repo_connections
WHERE workspace_id = $1 AND repo_full_name = $2
```

## Casos de Borda

### Primeira Conexão

- Usuário seleciona repositório da lista
- Backend verifica permissões via GitHub API
- INSERT cria novo registro
- `connected_at` é definido para NOW()

### Reconexão (Repositório Já Conectado)

- Usuário tenta conectar repositório já vinculado
- ON CONFLICT aciona UPDATE
- Metadados são atualizados (branch, permissões)
- `connected_at` é atualizado

### Repositório Removido do GitHub

- Se repositório for deletado ou acesso revogado no GitHub
- Registro permanece no banco (não é removido automaticamente)
- Tentativas futuras de usar o repositório resultarão em erro 404 da API
- Backend deve tratar graciosamente e informar usuário

### Mudança de Permissões

- Se permissões mudarem no GitHub (ex: de admin para read)
- Próxima reconexão atualizará `permissions_level`
- Operações que requerem permissões superiores falharão

### Mudança de Branch Padrão

- Se branch padrão mudar no GitHub (ex: de master para main)
- Próxima reconexão atualizará `default_branch`
- Operações devem usar sempre o valor atualizado

## Validações

### repo_full_name

- **Formato obrigatório**: "owner/repo"
- **Validação**: Deve conter exatamente uma barra (/)
- **Exemplos válidos**: 
  - "facebook/react"
  - "vercel/next.js"
  - "microsoft/vscode"
- **Exemplos inválidos**:
  - "react" (falta owner)
  - "facebook/react/issues" (muitas barras)
  - "" (vazio)

### permissions_level

- **Valores permitidos**: "read", "write", "admin"
- **Validação**: Deve ser um dos três valores
- **Mapeamento do GitHub**:
  - GitHub `pull` → "read"
  - GitHub `push` → "write"
  - GitHub `admin` → "admin"

## Segurança

- **repo_full_name**: Dado público (repositórios podem ser públicos ou privados)
- **default_branch**: Dado público
- **permissions_level**: Metadado interno, não expor ao usuário final
- **Logs**: Seguro logar todos os campos

## Relacionamento com github_connections

- `repo_connections` depende de `github_connections` existir
- Para listar repositórios disponíveis, usa-se o `access_token` de `github_connections`
- Para conectar repositório, valida-se acesso via API do GitHub usando o token

## Fonte de Verdade

Este documento é a fonte de verdade para uso da tabela `sv.repo_connections`.

---

**Versão**: 1.0  
**Data**: 2025-12-27  
**Mantido por**: Equipe Backend
