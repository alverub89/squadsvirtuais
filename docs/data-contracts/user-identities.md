# Contrato Funcional: sv.user_identities

## Visão Geral

Este documento especifica como o backend deve usar a tabela `sv.user_identities` existente no banco de dados. Esta NÃO é uma especificação de schema ou DDL, mas sim um contrato funcional que descreve o comportamento esperado.

## Campos Existentes

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único da identidade (PK) |
| `user_id` | uuid | Referência ao usuário em sv.users (FK, NOT NULL) |
| `provider` | text | Nome do provedor (ex: "google", "github") |
| `provider_user_id` | text | ID do usuário no provedor (sub do Google, id do GitHub) |
| `email` | text | Email retornado pelo provedor no momento do login |
| `name` | text | Nome retornado pelo provedor no momento do login |
| `avatar_url` | text | URL do avatar retornado pelo provedor |
| `created_at` | timestamptz | Data de criação da identidade (primeiro login com esse provedor) |
| `updated_at` | timestamptz | Data da última atualização (último login válido) |

## Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `(provider, provider_user_id)` - Uma identidade por provedor
- **FOREIGN KEY**: `user_id` → `sv.users.id` (ON DELETE CASCADE)

## Regras de Uso

### Identidade e Vínculo

- Uma identidade representa **um login por provedor OAuth**
- `provider_user_id` é o identificador canônico do usuário no provedor
  - Google: Campo `sub` do JWT token
  - GitHub: Campo `id` da resposta da API
- A identidade pertence sempre ao mesmo `user_id` (não muda após criação)
- Um usuário pode ter múltiplas identidades (Google + GitHub)

### Dados do Provedor

Os campos `email`, `name`, e `avatar_url` refletem os dados **mais recentes** retornados pelo provedor:

- **São atualizados a cada login**
- Não são usados para lógica de negócio, apenas para auditoria
- O email oficial do usuário está em `sv.users.email`

### Timestamps

- `created_at`: Definido no primeiro login com o provedor, nunca alterado
- `updated_at`: Atualizado toda vez que o usuário faz login com esse provedor
- Representa o "último login válido" com aquele provedor específico

## Operações de Persistência

### Criação ou Atualização (Upsert)

Durante autenticação, o backend deve usar a seguinte estratégia:

```sql
INSERT INTO sv.user_identities (user_id, provider, provider_user_id, email, name, avatar_url, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
ON CONFLICT (provider, provider_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW()
RETURNING id, user_id, provider, provider_user_id
```

**Regras Críticas:**

1. **user_id NÃO é atualizado**: Uma vez criada a identidade, ela pertence sempre ao mesmo usuário
2. **provider e provider_user_id**: Chave de conflito, nunca atualizados
3. **email, name, avatar_url**: Sempre atualizados com valores mais recentes
4. **updated_at**: Sempre atualizado para NOW()
5. **created_at**: Apenas definido no INSERT, nunca atualizado

### Consulta de Identidade

```sql
SELECT id, user_id, provider, provider_user_id, email, name, avatar_url, created_at, updated_at
FROM sv.user_identities
WHERE provider = $1 AND provider_user_id = $2
```

### Consulta de Identidades de um Usuário

```sql
SELECT id, provider, provider_user_id, email, name, avatar_url, created_at, updated_at
FROM sv.user_identities
WHERE user_id = $1
ORDER BY created_at ASC
```

## Casos de Borda

### Primeiro Login com Provedor

**Cenário**: Usuário faz login pela primeira vez com Google

```
Entrada:
  - id_token Google válido
  - sub: "123456789"
  - email: "user@example.com"
  - name: "João Silva"
  - picture: "https://..."

Fluxo:
  1. Verificar se usuário existe em sv.users (por email)
     - Se não: criar usuário
     - Se sim: atualizar dados
  2. Criar identidade em sv.user_identities
     - provider: "google"
     - provider_user_id: "123456789"
     - email: "user@example.com"
     - name: "João Silva"
     - avatar_url: "https://..."
     - created_at: NOW()
     - updated_at: NOW()

Resultado:
  - Nova identidade criada
  - user_id vinculado ao usuário
```

### Login Recorrente

**Cenário**: Usuário que já fez login anteriormente usa o mesmo provedor

```
Entrada:
  - Mesmos dados de autenticação (provider_user_id idêntico)
  - Dados do perfil podem ter mudado (nome, avatar)

Fluxo:
  1. Upsert em sv.users (atualiza dados se mudaram)
  2. ON CONFLICT em sv.user_identities aciona UPDATE
     - email, name, avatar_url atualizados
     - updated_at atualizado para NOW()
     - user_id NÃO muda (mantém vinculo original)
     - created_at NÃO muda (preserva data do primeiro login)

Resultado:
  - Identidade atualizada com dados mais recentes
  - Timestamp de updated_at reflete último login
```

### Atualização de Email no Provedor

**Cenário**: Usuário muda email no Google/GitHub

```
Entrada:
  - Mesmo provider_user_id (identidade é a mesma)
  - Novo email retornado pelo provedor

Fluxo:
  1. sv.users: 
     - Se novo email não existe: atualiza email do usuário
     - Se novo email já existe: cria novo usuário (edge case raro)
  2. sv.user_identities:
     - Campo email é atualizado com novo valor
     - Mantém mesmo user_id

Resultado:
  - Campo email em user_identities reflete novo email
  - Email em sv.users também refletirá o novo email
```

### Identidade Sem Email

**Cenário**: Provedor não retorna email (raro, mas possível)

```
Entrada:
  - Token válido, mas sem email no payload
  - Exemplo: usuário do GitHub com email privado e sem permissão user:email

Fluxo:
  - Backend DEVE rejeitar autenticação
  - Email é obrigatório para criar/atualizar usuário em sv.users
  - Retornar erro 401: "Email ausente no token"

Resultado:
  - Autenticação falha
  - Nenhum registro criado ou atualizado
```

### Usuário Existente Sem Identidade

**Cenário**: Usuário criado manualmente ou por outro provedor faz primeiro login com novo provedor

```
Entrada:
  - Usuário existe em sv.users (email: user@example.com)
  - Primeira tentativa de login com Google
  - Google retorna mesmo email

Fluxo:
  1. Upsert em sv.users: ON CONFLICT encontra usuário por email
  2. INSERT em sv.user_identities: cria nova identidade
     - user_id: vincula ao usuário existente
     - provider: "google"
     - Primeira identidade Google para esse usuário

Resultado:
  - Nova identidade Google vinculada a usuário existente
  - Usuário pode ter múltiplas identidades (Google, GitHub, etc)
```

### Usuário com Múltiplas Identidades

**Cenário**: Usuário com mesmo email em Google e GitHub

```
Entrada:
  - Usuário fez login com Google: user@example.com
  - Depois faz login com GitHub: user@example.com (mesmo email)

Resultado:
  - Um registro em sv.users (email: user@example.com)
  - Dois registros em sv.user_identities:
    - (provider: "google", provider_user_id: "sub-google", user_id: abc)
    - (provider: "github", provider_user_id: "id-github", user_id: abc)
  - Ambas identidades vinculadas ao mesmo user_id
  - Usuário pode logar com qualquer um dos provedores
```

## Colunas Não Existentes

### ❌ provider_email

**IMPORTANTE**: Esta coluna NÃO EXISTE. O campo correto é `email`.

Se você encontrar código usando `provider_email`, isso está INCORRETO e deve ser alterado para `email`.

### ❌ raw_profile

**IMPORTANTE**: Esta coluna NÃO EXISTE na tabela.

O sistema não armazena o JSON completo do perfil retornado pelo provedor. Apenas os campos específicos (`email`, `name`, `avatar_url`) são persistidos.

Se você precisar de dados adicionais do provedor, deve:
1. Documentar o novo campo neste documento
2. Adicionar o campo ao schema (via migração, fora do escopo deste contrato)
3. Atualizar o código para persistir o novo campo

### ❌ last_login_at

**IMPORTANTE**: Esta coluna NÃO EXISTE na tabela.

O conceito de "último login" é representado pelo campo `updated_at`:
- A cada login válido, `updated_at` é atualizado para NOW()
- Portanto, `updated_at` efetivamente representa o último login com aquele provedor

Se você encontrar código usando `last_login_at`, isso está INCORRETO e deve ser alterado para `updated_at`.

## Relação com Outras Tabelas

- **sv.users**: Relacionamento N:1 (múltiplas identidades podem pertencer ao mesmo usuário)
  - Foreign Key: `user_id` → `users.id`
  - Cascade: ON DELETE CASCADE (deletar usuário remove suas identidades)

## Auditoria

- **Primeiro Login**: Rastreado via `created_at`
- **Último Login**: Rastreado via `updated_at`
- **Mudanças no Perfil**: Campos `email`, `name`, `avatar_url` sempre refletem último valor do provedor

## Segurança

- **Email**: Dado pessoal (PII), não logar valores completos
- **Name**: Dado pessoal (PII), não logar valores completos
- **Provider User ID**: Identificador único por provedor, pode ser logado para debug
- **Avatar URL**: URL pública, seguro para logs

## Fonte de Verdade

Este documento é a fonte de verdade para uso da tabela `sv.user_identities`. Qualquer código que não siga estas especificações está incorreto e deve ser corrigido.

---

**Versão**: 1.0  
**Data**: 2025-12-26  
**Mantido por**: Equipe Backend
