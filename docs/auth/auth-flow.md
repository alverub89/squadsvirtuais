# Fluxo de Autenticação - Especificação Funcional

## Visão Geral

Este documento descreve o fluxo geral de autenticação OAuth usado no backend. O sistema suporta múltiplos provedores OAuth (Google, GitHub) e mantém identidades vinculadas a usuários através de email.

## Arquitetura

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │ 1. OAuth Flow
       │    (idToken ou code)
       ▼
┌─────────────────────┐
│  Netlify Function   │
│  (auth-google.js)   │
│  (auth-github.js)   │
└──────┬──────────────┘
       │ 2. Validar Token
       │
       ▼
┌─────────────────────┐
│  Provider OAuth     │
│  (Google/GitHub)    │
└─────────────────────┘
       │ 3. Dados do Usuário
       │
       ▼
┌─────────────────────┐
│  PostgreSQL         │
│  (Supabase)         │
│  - sv.users         │
│  - sv.user_identities│
└──────┬──────────────┘
       │ 4. User + Identity
       │
       ▼
┌─────────────────────┐
│  JWT Generator      │
│  (jsonwebtoken)     │
└──────┬──────────────┘
       │ 5. App Token
       │
       ▼
┌─────────────────────┐
│  Frontend           │
│  (localStorage)     │
└─────────────────────┘
```

## Fluxo Passo a Passo

### 1. Início da Autenticação (Frontend)

**Google:**
```javascript
// Usuário clica em "Entrar com Google"
<GoogleLogin
  onSuccess={(credentialResponse) => {
    // credentialResponse.credential é o idToken
    authenticateWithGoogle(credentialResponse.credential);
  }}
/>
```

**GitHub:**
```javascript
// Usuário clica em "Entrar com GitHub"
// Redireciona para /.netlify/functions/auth-github
window.location.href = "/.netlify/functions/auth-github";
```

### 2. Validação no Backend

#### Google (ID Token)

```
Frontend → Backend: POST /auth-google { idToken }
Backend → Google: Verifica assinatura RSA do token
Google → Backend: Token válido ✓
Backend: Extrai payload (sub, email, name, picture)
```

#### GitHub (Authorization Code)

```
Frontend → Backend: GET /auth-github
Backend → GitHub: Redireciona para oauth/authorize
GitHub → Usuário: Tela de aprovação
Usuário → GitHub: Aprova
GitHub → Backend: Callback com code
Backend → GitHub: POST oauth/access_token (troca code por token)
GitHub → Backend: access_token
Backend → GitHub: GET /user (com access_token)
GitHub → Backend: Dados do usuário
```

### 3. Mapeamento de Dados

**Dados Extraídos:**

| Provedor | ID Canônico | Email | Name | Avatar |
|----------|-------------|-------|------|--------|
| Google   | payload.sub | payload.email | payload.name | payload.picture |
| GitHub   | user.id     | user.email (ou /user/emails) | user.name ou user.login | user.avatar_url |

**Constantes:**

```javascript
const provider = "google"; // ou "github"
const providerUserId = payload.sub; // ou String(githubUser.id)
```

### 4. Persistência em Banco de Dados

#### Passo 4.1: Upsert em sv.users

**Objetivo:** Garantir que o usuário existe, criando ou atualizando dados

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

**Lógica:**
- Email é chave única (constraint: `users_email_key`)
- Se email existe → atualiza dados
- Se email não existe → cria usuário
- Avatar vazio preserva avatar anterior (COALESCE)

#### Passo 4.2: Upsert em sv.user_identities

**Objetivo:** Vincular identidade OAuth ao usuário

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

**Lógica:**
- Chave única: (provider, provider_user_id)
- Se identidade existe → atualiza dados do provedor
- Se identidade não existe → cria identidade
- **user_id NÃO é atualizado** (identidade sempre pertence ao usuário original)

### 5. Geração do JWT da Aplicação

```javascript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    name: user.name
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN || "7d" }
);
```

**Payload do JWT:**
- `userId`: UUID do usuário em sv.users
- `email`: Email do usuário
- `name`: Nome do usuário
- `iat`: Timestamp de emissão (automático)
- `exp`: Timestamp de expiração (calculado automaticamente)

### 6. Resposta ao Frontend

**Google (JSON Response):**

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "avatarUrl": "https://..."
  }
}
```

**GitHub (Redirect):**

```
HTTP 302 Found
Location: https://squadsvirtuais.com?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. Armazenamento no Frontend

```javascript
// Google (já tem o token na response)
localStorage.setItem('auth_token', response.token);

// GitHub (extrai token da URL)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
if (token) {
  localStorage.setItem('auth_token', token);
  // Limpa URL por segurança
  window.history.replaceState({}, document.title, window.location.pathname);
}
```

## Cenários de Uso

### Cenário 1: Novo Usuário (Primeiro Login)

```
Entrada:
  - Usuário nunca usou o sistema
  - Faz login com Google

Fluxo:
  1. Token Google validado ✓
  2. Email: novo@example.com
  3. INSERT em sv.users → novo usuário criado (id: abc)
  4. INSERT em sv.user_identities → identidade criada (user_id: abc, provider: google)
  5. JWT gerado com userId: abc
  6. Frontend armazena token

Resultado:
  - 1 registro em sv.users
  - 1 registro em sv.user_identities
  - Usuário autenticado
```

### Cenário 2: Login Recorrente (Mesmo Provedor)

```
Entrada:
  - Usuário já fez login com Google antes
  - Faz login novamente com Google

Fluxo:
  1. Token Google validado ✓
  2. Email: existente@example.com
  3. ON CONFLICT em sv.users → atualiza name, avatar_url, updated_at
  4. ON CONFLICT em sv.user_identities → atualiza email, name, avatar_url, updated_at
  5. JWT gerado
  6. Frontend armazena novo token

Resultado:
  - Dados sincronizados com Google
  - updated_at atualizado em ambas tabelas
  - Novo JWT válido por 7 dias
```

### Cenário 3: Usuário com Múltiplos Provedores

```
Entrada:
  - Usuário fez primeiro login com Google (email: user@example.com)
  - Depois faz login com GitHub (mesmo email: user@example.com)

Fluxo Login Google:
  1. INSERT sv.users → cria usuário (id: abc, email: user@example.com)
  2. INSERT sv.user_identities → (user_id: abc, provider: google, provider_user_id: sub-123)

Fluxo Login GitHub (subsequente):
  1. ON CONFLICT sv.users → encontra usuário por email (id: abc)
  2. INSERT sv.user_identities → (user_id: abc, provider: github, provider_user_id: 456)

Resultado:
  - 1 usuário em sv.users (id: abc)
  - 2 identidades em sv.user_identities:
    * (provider: google, provider_user_id: sub-123, user_id: abc)
    * (provider: github, provider_user_id: 456, user_id: abc)
  - Usuário pode logar com qualquer provedor
  - Ambos os logins geram JWT com mesmo userId (abc)
```

### Cenário 4: Usuário Muda Email no Provedor

```
Entrada:
  - Usuário tinha email: old@example.com
  - Mudou email no Google para: new@example.com
  - Faz login com Google novamente

Fluxo:
  1. Token Google validado ✓ (payload.email = new@example.com)
  2. sv.users:
     - Se new@example.com não existe: ON CONFLICT não aciona, INSERT cria novo usuário
     - Se new@example.com existe: ON CONFLICT aciona UPDATE
  3. sv.user_identities:
     - ON CONFLICT (google, sub-123) aciona UPDATE
     - email atualizado para new@example.com
     - user_id mantém valor original (abc)

Resultado (caso 1 - novo email):
  - Novo usuário criado (id: def, email: new@example.com)
  - Identidade atualizada aponta para novo usuário (user_id: def)
  - Usuário antigo (id: abc) fica sem identidade Google

Resultado (caso 2 - email já existe):
  - Identidade agora vinculada ao usuário que já tinha o novo email
  - Pode causar merge não intencional de contas
  
⚠️ Edge case complexo, requer validação com requisitos de negócio
```

### Cenário 5: Erro de Validação

```
Entrada:
  - Token Google expirado ou inválido

Fluxo:
  1. verifyIdToken() lança exceção
  2. Backend captura erro
  3. Retorna 401 { "error": "Falha ao verificar token Google" }
  4. Frontend mostra mensagem de erro
  5. Usuário tenta novamente

Resultado:
  - Nenhum registro criado ou atualizado
  - Autenticação rejeitada
```

### Cenário 6: Erro de Banco de Dados

```
Entrada:
  - Token válido, dados corretos
  - Banco de dados indisponível

Fluxo:
  1. Token validado ✓
  2. Tentativa de INSERT/UPDATE falha
  3. Exceção capturada com erro SQL
  4. Retorna 500 com código de erro
  5. Frontend mostra erro genérico

Resultado:
  - Nenhum registro criado ou atualizado
  - Logs contêm código SQL para diagnóstico
  - Usuário deve tentar novamente
```

## Segurança

### Validações por Provedor

**Google:**
- ✅ Assinatura RSA do token
- ✅ Audience (deve ser o Client ID da aplicação)
- ✅ Issuer (accounts.google.com)
- ✅ Expiração (exp claim)

**GitHub:**
- ✅ Code válido (uso único)
- ✅ Client Secret não exposto (troca feita no backend)
- ✅ Access Token obtido via HTTPS
- ✅ Dados do usuário via API oficial

### JWT da Aplicação

- **Algoritmo**: HS256 (HMAC com SHA-256)
- **Secret**: Mínimo 32 caracteres aleatórios
- **Expiração**: 7 dias (configurável)
- **Payload**: userId, email, name (não contém dados sensíveis)

### Proteções Implementadas

1. **SQL Injection**: Prepared statements em todas queries
2. **XSS**: JSON.stringify ao persistir dados externos
3. **CSRF**: Tokens OAuth validados no backend
4. **Token Replay**: Expiração do JWT
5. **HTTPS**: Obrigatório em produção
6. **Segredos**: Nunca expostos no frontend ou logs

## Referências de Código

- **Google Auth**: `/netlify/functions/auth-google.js`
- **GitHub Auth**: `/netlify/functions/auth-github.js`
- **Database**: `/netlify/functions/_lib/db.js`
- **JWT**: `/netlify/functions/_lib/jwt.js`

## Referências de Documentação

- **Contrato sv.users**: `/docs/data-contracts/users.md`
- **Contrato sv.user_identities**: `/docs/data-contracts/user-identities.md`
- **Especificação Google**: `/docs/auth/auth-google.md`

## Variáveis de Ambiente

### Frontend (Vite)

- `VITE_GOOGLE_CLIENT_ID`: Client ID do Google

### Backend (Netlify Functions)

- `VITE_GOOGLE_CLIENT_ID`: Client ID do Google (validação)
- `GITHUB_CLIENT_ID`: Client ID do GitHub
- `GITHUB_CLIENT_SECRET`: Client Secret do GitHub
- `FRONTEND_URL`: URL do frontend em produção
- `JWT_SECRET`: Segredo para assinar JWT (32+ chars)
- `JWT_EXPIRES_IN`: Expiração do JWT (padrão: "7d")
- `DATABASE_URL`: String de conexão PostgreSQL

## Troubleshooting

### Login falha com erro 401

**Possíveis causas:**
1. Token OAuth inválido ou expirado
2. Audience mismatch (Client ID diferente)
3. Email ausente no payload

**Como diagnosticar:**
- Verificar logs: procurar por `[auth-google]` ou `[auth-github]`
- Verificar mensagem de erro retornada
- Validar variáveis de ambiente

### Login falha com erro 500

**Possíveis causas:**
1. Banco de dados indisponível
2. Violação de constraint
3. Erro ao gerar JWT

**Como diagnosticar:**
- Verificar logs: procurar por `[db]` e códigos SQL
- Verificar mensagem de erro com code, constraint, detail
- Validar DATABASE_URL e JWT_SECRET

### Usuário criado mas identidade não

**Causa:**
- Erro entre os dois upserts (sv.users sucesso, sv.user_identities falha)

**Solução:**
- Usuário tenta login novamente
- ON CONFLICT em sv.users encontra usuário
- INSERT em sv.user_identities cria identidade faltante

### Múltiplas contas para mesmo usuário

**Causa:**
- Usuário mudou email no provedor
- Sistema cria novo usuário ao invés de atualizar existente

**Prevenção:**
- Implementar merge de contas (fora do escopo atual)
- Documentar limitação para usuários

---

**Versão**: 1.0  
**Data**: 2025-12-26  
**Mantido por**: Equipe Backend
