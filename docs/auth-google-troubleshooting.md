# Google Authentication Troubleshooting Guide

Este documento fornece uma visão detalhada do fluxo de autenticação Google e guias de troubleshooting para resolver problemas em produção.

## 📋 Índice

1. [Visão Geral do Fluxo](#visão-geral-do-fluxo)
2. [Fluxo Detalhado Passo a Passo](#fluxo-detalhado-passo-a-passo)
3. [Logs e Monitoramento](#logs-e-monitoramento)
4. [Erros Comuns e Soluções](#erros-comuns-e-soluções)
5. [Checklist de Validação](#checklist-de-validação)
6. [Debugging em Produção](#debugging-em-produção)

---

## Visão Geral do Fluxo

O login com Google segue este fluxo:

```
[Usuário] → [Google OAuth] → [Frontend] → [Netlify Function: auth-google] → [Database] → [JWT] → [Usuário logado]
```

### Componentes Principais

1. **Frontend (React)**: Usa `@react-oauth/google` para obter ID Token
2. **Backend (Netlify Function)**: Valida token e persiste usuário
3. **Database (PostgreSQL)**: Armazena usuários e identidades
4. **JWT**: Token da aplicação para sessões

---

## Fluxo Detalhado Passo a Passo

### Passo 1: Usuário Clica em "Login com Google"

**Onde**: Frontend (`src/App.jsx`)

**O que acontece**:
- Componente `<GoogleLogin>` do `@react-oauth/google` é renderizado
- Usuário clica no botão
- Popup/redirect do Google é aberto

**Possíveis erros**:
- Client ID inválido → Verificar `VITE_GOOGLE_CLIENT_ID` no frontend
- Origem não autorizada → Verificar configuração no Google Cloud Console

---

### Passo 2: Google Autentica o Usuário

**Onde**: Google OAuth 2.0

**O que acontece**:
- Google valida credenciais do usuário
- Google retorna um ID Token (JWT) para o frontend
- ID Token contém: `sub` (user ID), `email`, `name`, `picture`

**Possíveis erros**:
- Credenciais inválidas → Usuário precisa tentar novamente
- Permissões negadas → Usuário cancelou o login

---

### Passo 3: Frontend Envia Token para Backend

**Onde**: Frontend (`src/App.jsx`) → Netlify Function (`netlify/functions/auth-google.js`)

**O que acontece**:
```javascript
fetch('/.netlify/functions/auth-google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
})
```

**Logs esperados**:
```
[auth-google] Iniciando autenticação Google
[auth-google] VITE_GOOGLE_CLIENT_ID presente
[auth-google] Body parseado com sucesso
[auth-google] idToken recebido (length: 1234 chars)
```

**Possíveis erros**:
- `400 Bad Request`: Body JSON inválido ou idToken ausente
- `405 Method Not Allowed`: Método diferente de POST

---

### Passo 4: Backend Valida Token Google

**Onde**: `netlify/functions/auth-google.js`

**O que acontece**:
```javascript
const client = new OAuth2Client(googleClientId);
const ticket = await client.verifyIdToken({ 
  idToken, 
  audience: googleClientId 
});
const payload = ticket.getPayload();
```

**Logs esperados**:
```
[auth-google] Verificando token Google...
[auth-google] Token Google verificado com sucesso. Email: usuario@example.com
[auth-google] Dados extraídos - Email: usuario@example.com | Nome: João Silva
```

**Possíveis erros**:
- `401 Unauthorized: Falha ao verificar token Google`
  - Token expirado
  - Token inválido ou adulterado
  - Client ID diferente entre frontend e backend
  - Problema de rede ao validar com Google
  
**Solução**:
1. Verificar que `VITE_GOOGLE_CLIENT_ID` é o MESMO no frontend e backend
2. Token tem validade curta (minutos), usuário precisa fazer login novamente
3. Verificar logs do Netlify para detalhes do erro

---

### Passo 5: Upsert em `sv.users`

**Onde**: `netlify/functions/auth-google.js` → `netlify/functions/_lib/db.js`

**O que acontece**:
```sql
INSERT INTO sv.users (name, email, avatar_url, last_login_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = COALESCE(EXCLUDED.avatar_url, sv.users.avatar_url),
  last_login_at = EXCLUDED.last_login_at
RETURNING id, name, email, avatar_url
```

**Logs esperados**:
```
[db] Executando query...
[auth-google] Fazendo upsert em sv.users...
[db] Query executada com sucesso. Linhas retornadas: 1
[auth-google] Usuário criado/atualizado com sucesso. ID: 42
```

**Possíveis erros**:
- `500: Erro ao salvar usuário no banco de dados`
  - DATABASE_URL inválido ou não configurado
  - Tabela `sv.users` não existe
  - Constraint `users_email_key` não existe
  - Conexão com banco falhou
  - Schema `sv` não existe

**Solução**:
1. Verificar logs detalhados: `[db] Código do erro: ...`
2. Verificar que `DATABASE_URL` está configurado no Netlify
3. Verificar que tabela existe: `SELECT * FROM sv.users LIMIT 1;`
4. Verificar constraint: `\d sv.users` no psql

---

### Passo 6: Upsert em `sv.user_identities`

**Onde**: `netlify/functions/auth-google.js` → `netlify/functions/_lib/db.js`

**O que acontece**:
```sql
INSERT INTO sv.user_identities 
  (user_id, provider, provider_user_id, provider_email, raw_profile, last_login_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6)
ON CONFLICT (provider, provider_user_id)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  provider_email = EXCLUDED.provider_email,
  raw_profile = EXCLUDED.raw_profile,
  last_login_at = EXCLUDED.last_login_at
```

**Logs esperados**:
```
[auth-google] Fazendo upsert em sv.user_identities...
[db] Executando query...
[db] Query executada com sucesso. Linhas retornadas: 0
[auth-google] Identidade criada/atualizada com sucesso
```

**Possíveis erros**:
- `500: Erro ao salvar identidade do usuário`
  - Tabela `sv.user_identities` não existe
  - Constraint `unique_user_identity_provider_user` não existe
  - Foreign key `user_id` inválida
  - Campo `raw_profile` não é JSONB

**Solução**:
1. Verificar que tabela existe
2. Verificar constraints: `\d sv.user_identities`
3. Verificar que user_id existe em sv.users

---

### Passo 7: Gerar JWT da Aplicação

**Onde**: `netlify/functions/auth-google.js` → `netlify/functions/_lib/jwt.js`

**O que acontece**:
```javascript
const token = signJwt({ 
  userId: user.id, 
  email: user.email, 
  name: user.name 
});
```

**Logs esperados**:
```
[auth-google] Gerando JWT...
[jwt] Gerando JWT para usuário
[auth-google] JWT gerado com sucesso
```

**Possíveis erros**:
- `500: Erro ao gerar token de autenticação`
  - JWT_SECRET não configurado
  - JWT_SECRET muito curto ou inválido
  - Payload inválido

**Solução**:
1. Verificar que `JWT_SECRET` está configurado no Netlify
2. JWT_SECRET deve ter no mínimo 32 caracteres aleatórios
3. Verificar logs: `[jwt] JWT_SECRET não configurado`

---

### Passo 8: Retornar Sucesso ao Frontend

**Onde**: `netlify/functions/auth-google.js` → Frontend

**O que acontece**:
```javascript
return json(200, {
  ok: true,
  token,
  user: { id, name, email, avatarUrl }
});
```

**Logs esperados**:
```
[auth-google] Autenticação concluída com sucesso para: usuario@example.com
```

**Frontend recebe**:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "name": "João Silva",
    "email": "usuario@example.com",
    "avatarUrl": "https://..."
  }
}
```

---

## Logs e Monitoramento

### Como Acessar Logs no Netlify

1. Acesse [Netlify Dashboard](https://app.netlify.com)
2. Selecione o site "squadsvirtuais"
3. Vá em **Functions** no menu lateral
4. Clique em `auth-google`
5. Vá em **Function logs** ou **Recent deploys**

### Logs Importantes

Todos os logs começam com `[auth-google]`, `[db]` ou `[jwt]` para facilitar filtragem:

```bash
# Ver apenas logs do auth-google
grep "\[auth-google\]" function-logs.txt

# Ver apenas erros
grep "erro\|error\|Error" function-logs.txt -i

# Ver queries do banco
grep "\[db\]" function-logs.txt
```

### O Que Cada Prefixo Significa

- `[auth-google]`: Operações do handler principal
- `[db]`: Operações de banco de dados (queries, erros de conexão)
- `[jwt]`: Operações de geração/validação de JWT

---

## Erros Comuns e Soluções

### ❌ `500: Erro interno no login`

**Causa**: Erro genérico que não foi capturado por nenhum handler específico.

**Como resolver**:
1. Verifique os logs do Netlify para identificar o erro exato
2. Procure por `[auth-google] Erro inesperado:` nos logs
3. O stack trace completo estará disponível

---

### ❌ `500: VITE_GOOGLE_CLIENT_ID não configurado no backend`

**Causa**: Variável de ambiente ausente no Netlify.

**Como resolver**:
1. Acesse Netlify → Site settings → Environment variables
2. Adicione `VITE_GOOGLE_CLIENT_ID` com o mesmo valor do frontend
3. Redeploy o site

---

### ❌ `401: Falha ao verificar token Google`

**Causa**: Token inválido, expirado ou Client ID incorreto.

**Como resolver**:
1. Verificar que `VITE_GOOGLE_CLIENT_ID` é idêntico no frontend e backend
2. Token expira rapidamente, usuário deve tentar novamente
3. Verificar que o Client ID no Google Cloud Console está correto
4. Verificar que a origem (https://squadsvirtuais.com) está autorizada no Google Cloud

---

### ❌ `500: Erro ao salvar usuário no banco de dados`

**Causa**: Problema na conexão ou schema do banco.

**Como resolver**:
1. Verificar logs detalhados: `[db] Código do erro:`
2. Testar conexão: `psql $DATABASE_URL -c "SELECT 1"`
3. Verificar que schema `sv` existe: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'sv';`
4. Verificar que tabela existe: `\dt sv.users`
5. Verificar constraint UNIQUE: `\d sv.users`

**Erros PostgreSQL comuns**:
- `42P01`: Tabela não existe → Criar tabela `sv.users`
- `42704`: Schema não existe → Criar schema `sv`
- `23505`: Violação de UNIQUE (raro com ON CONFLICT) → Constraint incorreta
- `28P01`: Autenticação falhou → DATABASE_URL inválido

---

### ❌ `500: Erro ao salvar identidade do usuário`

**Causa**: Problema na tabela `sv.user_identities`.

**Como resolver**:
1. Verificar que tabela existe: `\dt sv.user_identities`
2. Verificar constraints:
   - `unique_user_identity_provider_user` em `(provider, provider_user_id)`
   - `unique_user_identity_user_provider` em `(user_id, provider)`
3. Verificar que coluna `raw_profile` é do tipo JSONB

---

### ❌ `500: Erro ao gerar token de autenticação`

**Causa**: JWT_SECRET ausente ou inválido.

**Como resolver**:
1. Verificar que `JWT_SECRET` está configurado no Netlify
2. Gerar novo secret: `openssl rand -base64 32`
3. Configurar no Netlify → Environment variables

---

## Checklist de Validação

Use este checklist para validar a configuração:

### ✅ Frontend

- [ ] `VITE_GOOGLE_CLIENT_ID` configurado no `.env` ou Netlify
- [ ] Componente `<GoogleLogin>` renderizado corretamente
- [ ] Handler `handleGoogleSuccess` implementado
- [ ] Fetch para `/.netlify/functions/auth-google` funcionando

### ✅ Backend (Netlify Function)

- [ ] `VITE_GOOGLE_CLIENT_ID` configurado nas environment variables do Netlify
- [ ] `JWT_SECRET` configurado (mínimo 32 caracteres)
- [ ] `DATABASE_URL` configurado e válido
- [ ] Função `auth-google.js` com logs detalhados
- [ ] Dependências instaladas: `google-auth-library`, `pg`, `jsonwebtoken`

### ✅ Google Cloud Console

- [ ] Client ID criado
- [ ] Origens autorizadas incluem `https://squadsvirtuais.com` e `http://localhost:5173`
- [ ] Google Sign-In API habilitada

### ✅ Banco de Dados (PostgreSQL)

- [ ] Schema `sv` existe
- [ ] Tabela `sv.users` existe com colunas: `id`, `name`, `email`, `avatar_url`, `last_login_at`, `created_at`
- [ ] Constraint `users_email_key` UNIQUE em `email`
- [ ] Tabela `sv.user_identities` existe
- [ ] Constraint `unique_user_identity_provider_user` em `(provider, provider_user_id)`
- [ ] Constraint `unique_user_identity_user_provider` em `(user_id, provider)`
- [ ] Coluna `raw_profile` é do tipo JSONB

---

## Debugging em Produção

### Passo 1: Reproduzir o Erro

1. Acesse https://squadsvirtuais.com
2. Abra DevTools (F12) → Network tab
3. Clique em "Entrar com Google"
4. Observe a requisição `POST /.netlify/functions/auth-google`

### Passo 2: Capturar Informações

**Network tab**:
- Status code: `500`
- Request payload: `{ "idToken": "eyJ..." }`
- Response: `{ "error": "..." }`

**Console tab**:
- Mensagens de erro do frontend
- Avisos do React ou bibliotecas

### Passo 3: Verificar Logs do Netlify

1. Acesse Netlify Dashboard → Functions → auth-google
2. Procure por logs recentes com timestamp correspondente
3. Filtre por `[auth-google]` para ver o fluxo completo
4. Identifique onde o fluxo parou

**Exemplo de log de sucesso**:
```
[auth-google] Iniciando autenticação Google
[auth-google] VITE_GOOGLE_CLIENT_ID presente
[auth-google] Body parseado com sucesso
[auth-google] idToken recebido (length: 1234 chars)
[auth-google] Verificando token Google...
[auth-google] Token Google verificado com sucesso. Email: user@example.com
[auth-google] Dados extraídos - Email: user@example.com | Nome: User
[db] Executando query...
[auth-google] Fazendo upsert em sv.users...
[db] Query executada com sucesso. Linhas retornadas: 1
[auth-google] Usuário criado/atualizado com sucesso. ID: 1
[auth-google] Fazendo upsert em sv.user_identities...
[db] Executando query...
[db] Query executada com sucesso. Linhas retornadas: 0
[auth-google] Identidade criada/atualizada com sucesso
[auth-google] Gerando JWT...
[jwt] Gerando JWT para usuário
[auth-google] JWT gerado com sucesso
[auth-google] Autenticação concluída com sucesso para: user@example.com
```

### Passo 4: Identificar o Problema

Compare os logs reais com o fluxo esperado acima. Identifique:
- Onde o fluxo parou?
- Qual foi o último log bem-sucedido?
- Qual foi a primeira mensagem de erro?

### Passo 5: Aplicar Solução

Consulte a seção [Erros Comuns e Soluções](#erros-comuns-e-soluções) baseado no erro identificado.

---

## Variáveis de Ambiente Necessárias

### Frontend (Netlify ou `.env`)

```bash
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
```

### Backend (Netlify Environment Variables)

```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com

# JWT
JWT_SECRET=seu-secret-super-seguro-com-no-minimo-32-caracteres-aleatorios
JWT_EXPIRES_IN=7d  # opcional, padrão 7 dias

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Ambiente (Netlify configura automaticamente)
NODE_ENV=production
```

---

## Contato e Suporte

Se após seguir este guia o problema persistir:

1. Copie os logs completos do Netlify
2. Capture screenshots do Network tab mostrando requisição e resposta
3. Documente os passos para reproduzir
4. Abra uma issue no repositório com todas as informações

---

## Referências

- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [google-auth-library (Node.js)](https://github.com/googleapis/google-auth-library-nodejs)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
