# Especificação Funcional: Autenticação Google OAuth

## Visão Geral

Este documento especifica o fluxo completo de autenticação usando Google OAuth 2.0 com ID Token. O backend deve seguir exatamente este contrato funcional ao implementar a autenticação.

## Protocolo

- **Tipo**: OAuth 2.0 com ID Token (OpenID Connect)
- **Biblioteca**: `google-auth-library` (Node.js)
- **Frontend**: `@react-oauth/google`

## Entrada

### Requisição HTTP

```
POST /.netlify/functions/auth-google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE..."
}
```

### Validações de Entrada

1. **HTTP Method**: Apenas POST permitido
2. **Content-Type**: application/json
3. **Body**: JSON válido
4. **idToken**: String não vazia

**Erros de Entrada:**

```json
// Method não é POST
{ "error": "Method Not Allowed" } // 405

// Body inválido
{ "error": "Body JSON inválido" } // 400

// idToken ausente ou não string
{ "error": "idToken é obrigatório" } // 400
```

## Validação do Token

### Passo 1: Verificar Token Google

```javascript
const client = new OAuth2Client(VITE_GOOGLE_CLIENT_ID);
const ticket = await client.verifyIdToken({
  idToken: idToken,
  audience: VITE_GOOGLE_CLIENT_ID
});
const payload = ticket.getPayload();
```

### Validações Obrigatórias

1. **Token válido**: Assinatura RSA válida
2. **Emissor**: `accounts.google.com` ou `https://accounts.google.com`
3. **Audience**: Deve ser igual ao `VITE_GOOGLE_CLIENT_ID`
4. **Expiração**: Token não expirado (`exp` no futuro)

**Erro de Validação:**

```json
{ "error": "Falha ao verificar token Google" } // 401
{ "error": "Token inválido" } // 401
```

### Passo 2: Extrair Dados do Payload

**Campos obrigatórios:**

- `sub`: Identificador único do usuário no Google (string)
- `email`: Email do usuário (string)

**Campos opcionais:**

- `name`: Nome completo do usuário (string)
- `picture`: URL do avatar (string)

**Mapeamento:**

```javascript
const provider = "google";
const providerUserId = payload.sub;
const email = payload.email;
const name = payload.name || email || "";
const avatarUrl = payload.picture || "";
```

**Erro de Extração:**

```json
// Email ausente no payload
{ "error": "Email ausente no token" } // 401
```

## Persistência

### Passo 3: Upsert em sv.users

**Operação SQL:**

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

**Parâmetros:**

1. `$1`: email (string)
2. `$2`: name (string)
3. `$3`: avatarUrl (string)

**Comportamento:**

- **Primeiro login**: Cria novo usuário
- **Login recorrente**: Atualiza name e avatar_url
- **Avatar vazio**: Mantém avatar anterior se existir (COALESCE)

**Erro de Persistência:**

```json
{
  "error": "Erro ao salvar usuário no banco de dados",
  "code": "23505", // exemplo: violação de constraint
  "constraint": "users_email_key" // exemplo
} // 500
```

### Passo 4: Upsert em sv.user_identities

**Operação SQL:**

```sql
INSERT INTO sv.user_identities (user_id, provider, provider_user_id, email, name, avatar_url, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
ON CONFLICT (provider, provider_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW()
RETURNING id, user_id
```

**Parâmetros:**

1. `$1`: user.id (UUID do usuário retornado no passo 3)
2. `$2`: "google" (string constante)
3. `$3`: providerUserId (payload.sub)
4. `$4`: email (string)
5. `$5`: name (string)
6. `$6`: avatarUrl (string)

**Comportamento:**

- **Primeiro login com Google**: Cria nova identidade
- **Login recorrente**: Atualiza email, name, avatar_url e updated_at
- **user_id NÃO é atualizado**: Identidade sempre pertence ao mesmo usuário

**Erro de Persistência:**

```json
{
  "error": "Erro ao salvar identidade do usuário",
  "code": "23503", // exemplo: FK violation
  "constraint": "user_identities_user_id_fkey",
  "detail": "Key (user_id)=(abc) is not present in table users"
} // 500
```

## Geração do JWT

### Passo 5: Criar Token JWT da Aplicação

```javascript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    name: user.name
  },
  JWT_SECRET,
  {
    expiresIn: JWT_EXPIRES_IN || "7d"
  }
);
```

**Payload do JWT:**

- `userId`: UUID do usuário
- `email`: Email do usuário
- `name`: Nome do usuário
- `iat`: Timestamp de emissão (automático)
- `exp`: Timestamp de expiração (automático)

**Variáveis de Ambiente:**

- `JWT_SECRET`: Segredo para assinar token (mínimo 32 caracteres)
- `JWT_EXPIRES_IN`: Tempo de expiração (padrão: "7d")

**Erro de JWT:**

```json
{ "error": "Erro ao gerar token de autenticação" } // 500
```

## Resposta

### Sucesso (200 OK)

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "João Silva",
    "email": "joao@example.com",
    "avatarUrl": "https://lh3.googleusercontent.com/a/..."
  }
}
```

### Erro (4xx ou 5xx)

```json
{
  "error": "Mensagem de erro legível",
  "code": "23505",           // opcional: código SQL
  "constraint": "constraint_name", // opcional: nome da constraint
  "detail": "Detalhes técnicos"    // opcional: detalhes do erro
}
```

## Casos de Borda

### Caso 1: Primeiro Login (Novo Usuário)

**Entrada:**
- Email: novo@example.com
- Nunca fez login antes

**Fluxo:**
1. Token validado ✓
2. INSERT em sv.users → novo usuário criado
3. INSERT em sv.user_identities → nova identidade criada
4. JWT gerado e retornado

**Resultado:**
- Usuário criado com created_at = NOW()
- Identidade criada com created_at = NOW()
- Login bem-sucedido

### Caso 2: Login Recorrente

**Entrada:**
- Email: existente@example.com
- Já fez login antes com Google

**Fluxo:**
1. Token validado ✓
2. ON CONFLICT em sv.users → atualiza name, avatar_url, updated_at
3. ON CONFLICT em sv.user_identities → atualiza email, name, avatar_url, updated_at
4. JWT gerado e retornado

**Resultado:**
- Dados atualizados com informações mais recentes do Google
- created_at preservado em ambas tabelas
- updated_at atualizado para NOW()
- Login bem-sucedido

### Caso 3: Atualização de Nome no Google

**Entrada:**
- Usuário mudou nome no perfil do Google
- Novo name retornado no payload

**Fluxo:**
1. Token validado ✓
2. sv.users: name atualizado com novo valor
3. sv.user_identities: name atualizado com novo valor
4. JWT gerado com novo nome

**Resultado:**
- Nome sincronizado em sv.users
- Nome sincronizado em sv.user_identities
- JWT contém novo nome
- Login bem-sucedido

### Caso 4: Atualização de Avatar no Google

**Entrada:**
- Usuário mudou foto de perfil no Google
- Nova picture URL retornada no payload

**Fluxo:**
1. Token validado ✓
2. sv.users: avatar_url atualizado (não vazio)
3. sv.user_identities: avatar_url atualizado
4. JWT gerado (não contém avatar)

**Resultado:**
- Avatar URL atualizado em ambas tabelas
- Login bem-sucedido

### Caso 5: Avatar Vazio no Provedor

**Entrada:**
- Google não retorna picture (campo ausente ou vazio)
- Usuário já tem avatar_url salvo anteriormente

**Fluxo:**
1. Token validado ✓
2. avatarUrl = "" (string vazia)
3. sv.users: COALESCE preserva avatar anterior
4. sv.user_identities: avatar_url atualizado para ""

**Resultado:**
- sv.users mantém avatar anterior
- sv.user_identities registra avatar vazio (última informação do provedor)
- Login bem-sucedido

### Caso 6: Email Ausente no Token

**Entrada:**
- Token Google válido mas sem campo email
- Caso raro, mas tecnicamente possível

**Fluxo:**
1. Token validado ✓
2. email = undefined
3. Validação falha: "Email ausente no token"
4. Retorna erro 401

**Resultado:**
- Autenticação rejeitada
- Nenhum registro criado ou atualizado
- Usuário deve tentar novamente ou usar outro provedor

### Caso 7: Usuário Existente, Primeira Identidade Google

**Entrada:**
- Usuário existe em sv.users (criado via GitHub)
- Primeira tentativa de login com Google
- Google retorna mesmo email

**Fluxo:**
1. Token validado ✓
2. ON CONFLICT em sv.users → atualiza dados do usuário existente
3. INSERT em sv.user_identities → cria nova identidade Google
4. Ambas identidades (GitHub + Google) vinculadas ao mesmo user_id

**Resultado:**
- Usuário tem múltiplas identidades
- Pode logar com Google ou GitHub
- Login bem-sucedido

### Caso 8: Token Expirado

**Entrada:**
- idToken Google expirado (exp no passado)

**Fluxo:**
1. verifyIdToken() lança exceção
2. Captura erro de verificação
3. Retorna erro 401

**Resultado:**
- Autenticação rejeitada
- Frontend deve obter novo token do Google
- Usuário precisa tentar novamente

### Caso 9: Audience Incorreto

**Entrada:**
- idToken válido mas para outro Client ID
- audience não corresponde ao VITE_GOOGLE_CLIENT_ID

**Fluxo:**
1. verifyIdToken() lança exceção
2. Token rejeitado por audience mismatch
3. Retorna erro 401

**Resultado:**
- Autenticação rejeitada
- Possível tentativa de ataque
- Token pode ser válido mas não é para esta aplicação

### Caso 10: Erro de Banco de Dados

**Entrada:**
- Tudo correto até persistência
- Banco de dados indisponível ou erro interno

**Fluxo:**
1. Token validado ✓
2. Tentativa de INSERT/UPDATE falha
3. Exceção capturada com código de erro
4. Retorna erro 500 com detalhes

**Resultado:**
- Autenticação falha
- Logs contêm código de erro SQL para diagnóstico
- Usuário deve tentar novamente
- Equipe técnica investiga erro no banco

## Variáveis de Ambiente Obrigatórias

### Frontend

- `VITE_GOOGLE_CLIENT_ID`: Client ID do projeto no Google Cloud Console

### Backend

- `VITE_GOOGLE_CLIENT_ID`: Mesmo Client ID (para validação de audience)
- `JWT_SECRET`: Segredo para assinar JWT (mínimo 32 caracteres)
- `DATABASE_URL`: String de conexão PostgreSQL

### Backend (Opcional)

- `JWT_EXPIRES_IN`: Tempo de expiração do JWT (padrão: "7d")

## Segurança

### Validações Implementadas

1. ✅ Token assinado pelo Google (verificação RSA)
2. ✅ Audience matching (evita token de outra aplicação)
3. ✅ Expiração do token (exp claim)
4. ✅ Emissor válido (iss claim)

### Proteções

- **SQL Injection**: Prepared statements (queries parametrizadas)
- **Token Replay**: Expiração de 7 dias (JWT da aplicação)
- **XSS**: JSON.stringify ao persistir dados
- **HTTPS**: Obrigatório em produção

### Dados Não Logados

- ❌ idToken completo (contém PII)
- ❌ Email completo (apenas length em chars)
- ❌ JWT da aplicação (contém dados do usuário)

### Dados Logados (Debug)

- ✅ user_id (UUID, não é PII)
- ✅ provider ("google")
- ✅ Status das operações (validated_token, upsert_user_ok, etc)
- ✅ Códigos de erro SQL (para diagnóstico)

## Referências

- **Contrato de Dados**: Ver `/docs/data-contracts/users.md` e `/docs/data-contracts/user-identities.md`
- **Fluxo Geral**: Ver `/docs/auth/auth-flow.md`
- **Google Identity**: https://developers.google.com/identity/sign-in/web/backend-auth

---

**Versão**: 1.0  
**Data**: 2025-12-26  
**Mantido por**: Equipe Backend
