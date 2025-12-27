# Contrato Funcional: sv.github_connections

## Visão Geral

Este documento especifica como o backend deve usar a tabela `sv.github_connections` existente no banco de dados. Esta tabela representa a conexão OAuth entre uma conta GitHub e um workspace.

## Campos Esperados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único da conexão (PK) |
| `workspace_id` | uuid | Referência ao workspace (FK, NOT NULL) |
| `provider_user_id` | text | ID do usuário no GitHub (NOT NULL) |
| `login` | text | Login do usuário no GitHub |
| `avatar_url` | text | URL do avatar do usuário GitHub |
| `access_token` | text | Token OAuth do GitHub (sensível, NOT NULL) |
| `connected_at` | timestamptz | Data/hora da última conexão ou reautorização |

## Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `(workspace_id, provider_user_id)` - Um usuário GitHub por workspace
- **FOREIGN KEY**: `workspace_id` → `workspaces.id` (assumido)

## Regras de Uso

### Identificação

- Uma conexão representa um usuário GitHub conectado a um workspace específico
- `provider_user_id` é o ID numérico do usuário no GitHub
- Um mesmo usuário GitHub pode estar conectado a múltiplos workspaces
- Um workspace pode ter apenas uma conexão GitHub ativa

### Access Token

- O `access_token` é o token OAuth retornado pelo GitHub
- **NUNCA** deve ser exposto ao frontend
- Deve ser usado apenas no backend para chamadas à API do GitHub
- Pode ser armazenado criptografado (recomendado, mas não obrigatório nesta issue)

### Timestamps

- `connected_at`: Atualizado sempre que o OAuth é refeito (reautorização)

## Operações de Persistência

### Criação ou Atualização (Upsert)

Após o callback OAuth bem-sucedido:

```sql
INSERT INTO sv.github_connections (
  workspace_id, 
  provider_user_id, 
  login, 
  avatar_url, 
  access_token, 
  connected_at
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (workspace_id, provider_user_id)
DO UPDATE SET
  login = EXCLUDED.login,
  avatar_url = EXCLUDED.avatar_url,
  access_token = EXCLUDED.access_token,
  connected_at = EXCLUDED.connected_at
RETURNING id, workspace_id, provider_user_id, login, connected_at
```

**Regras de Atualização:**

1. **workspace_id e provider_user_id**: Chave de conflito, nunca atualizados
2. **login**: Atualizado (usuário pode ter mudado username no GitHub)
3. **avatar_url**: Atualizado
4. **access_token**: Sempre atualizado com novo token
5. **connected_at**: Sempre atualizado para NOW()

### Consulta de Conexão por Workspace

```sql
SELECT id, provider_user_id, login, access_token, connected_at
FROM sv.github_connections
WHERE workspace_id = $1
ORDER BY connected_at DESC
LIMIT 1
```

## Casos de Borda

### Primeira Conexão

- Usuário inicia OAuth pela primeira vez para um workspace
- INSERT cria novo registro
- `connected_at` é definido para NOW()

### Reautorização (Token Expirado)

- Usuário inicia OAuth novamente para o mesmo workspace
- ON CONFLICT aciona UPDATE
- Novo `access_token` substitui o anterior
- `connected_at` é atualizado

### Múltiplos Workspaces

- Mesmo usuário GitHub pode conectar em diferentes workspaces
- Cada workspace tem seu próprio registro
- Tokens são independentes (cada workspace tem seu próprio token)

### Token Revogado

- Se o usuário revogar acesso no GitHub, o token fica inválido
- API GitHub retornará 401 Unauthorized
- Backend deve detectar e sugerir reautorização
- Registro permanece no banco (não é removido automaticamente)

## Segurança

- **access_token**: Dado extremamente sensível
  - Nunca retornar ao frontend
  - Nunca logar valor completo
  - Considerar criptografia em repouso (fora do escopo desta issue)
- **provider_user_id**: Seguro para logs
- **login**: Seguro para exibição

## Fonte de Verdade

Este documento é a fonte de verdade para uso da tabela `sv.github_connections`. 

---

**Versão**: 1.0  
**Data**: 2025-12-27  
**Mantido por**: Equipe Backend
