# Contrato Funcional: sv.users

## Visão Geral

Este documento especifica como o backend deve usar a tabela `sv.users` existente no banco de dados. Esta NÃO é uma especificação de schema ou DDL, mas sim um contrato funcional que descreve o comportamento esperado.

## Campos Existentes

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único do usuário (PK) |
| `email` | text | Email do usuário (UNIQUE, NOT NULL) |
| `name` | text | Nome do usuário |
| `avatar_url` | text | URL da foto de perfil do usuário |
| `created_at` | timestamptz | Data de criação do registro (não muda após criação) |
| `updated_at` | timestamptz | Data da última atualização do registro |

## Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `email` (constraint: `users_email_key`)

## Regras de Uso

### Identificação Canônica

- O campo `email` é o identificador canônico do usuário
- Um email só pode existir uma vez na tabela
- O `id` é gerado automaticamente pelo banco (UUID)

### Timestamps

- `created_at`: Definido uma vez na criação, nunca alterado
- `updated_at`: Atualizado toda vez que o registro é modificado

### Campos Opcionais

- `name`: Pode ser null, mas recomenda-se sempre fornecer um valor
- `avatar_url`: Pode ser null ou string vazia

## Operações de Persistência

### Criação ou Atualização (Upsert)

Durante autenticação, o backend deve usar a seguinte estratégia:

```sql
INSERT INTO sv.users (email, name, avatar_url, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = COALESCE(EXCLUDED.avatar_url, sv.users.avatar_url),
  updated_at = NOW()
RETURNING id, email, name, avatar_url
```

**Regras de Atualização:**

1. **Email**: Nunca atualizado (é a chave de conflito)
2. **Name**: Sempre atualizado com o valor mais recente do provedor
3. **Avatar URL**: 
   - Se o novo valor não for vazio, atualiza
   - Se o novo valor for vazio, mantém o anterior (usando COALESCE)
4. **Updated At**: Sempre atualizado para NOW()

### Consulta de Usuário

```sql
SELECT id, email, name, avatar_url, created_at, updated_at
FROM sv.users
WHERE email = $1
```

## Casos de Borda

### Primeiro Login
- Usuário não existe ainda
- INSERT cria novo registro
- `created_at` e `updated_at` são definidos para NOW()
- `id` é gerado automaticamente

### Login Recorrente
- Usuário já existe
- ON CONFLICT aciona o UPDATE
- `name` e `avatar_url` são atualizados
- `updated_at` é atualizado para NOW()
- `created_at` permanece inalterado

### Atualização de Email
- **Não suportado**: Email é imutável após criação
- Se usuário trocar email no provedor, será tratado como novo usuário
- Identidades antigas permanecem vinculadas ao email original

### Usuário com Avatar Vazio
- Se provedor não fornece avatar, campo fica null ou vazio
- Em logins subsequentes, se avatar for fornecido, será atualizado
- Se avatar continuar vazio, mantém valor anterior (se existir)

### Sincronização de Nome
- Nome sempre reflete o valor mais recente do provedor
- Se usuário alterar nome no provedor, será atualizado no próximo login
- Não há histórico de nomes anteriores

## Coluna Não Existente

### ❌ last_login_at

**IMPORTANTE**: Esta coluna NÃO EXISTE na tabela `sv.users`.

Se você encontrar referências a `last_login_at` no código, isso está INCORRETO e deve ser removido. O conceito de "último login" é rastreado através do campo `updated_at` em `sv.user_identities`.

## Relação com Outras Tabelas

- **sv.user_identities**: Relacionamento 1:N (um usuário pode ter múltiplas identidades de provedores diferentes)
  - Foreign Key: `user_identities.user_id` → `users.id`
  - Cascade: DELETE CASCADE (deletar usuário remove suas identidades)

## Auditoria

- **Criação**: Rastreada via `created_at`
- **Última Atualização**: Rastreada via `updated_at`
- **Último Login**: NÃO rastreado nesta tabela (ver `sv.user_identities`)

## Segurança

- **Email**: Tratado como dado pessoal (PII)
- **Name**: Tratado como dado pessoal (PII)
- **Avatar URL**: URL pública, geralmente não contém PII
- **Logs**: Nunca logar valores completos de email ou name em produção

## Fonte de Verdade

Este documento é a fonte de verdade para uso da tabela `sv.users`. Qualquer código que não siga estas especificações está incorreto e deve ser corrigido.

---

**Versão**: 1.0  
**Data**: 2025-12-26  
**Mantido por**: Equipe Backend
