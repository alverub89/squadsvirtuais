# OAuth Flow Documentation

Este documento descreve os fluxos de autenticação OAuth implementados no projeto Squads Virtuais.

## Google OAuth Flow

### Visão Geral
O login com Google usa o protocolo OAuth 2.0 com o fluxo de ID Token, implementado através da biblioteca `@react-oauth/google`.

### Fluxo de Autenticação

1. **Frontend (React)**
   - O usuário clica no botão "Entrar com Google"
   - O componente `GoogleLogin` do `@react-oauth/google` abre o popup de autenticação do Google
   - Após autenticação bem-sucedida, o Google retorna um `credential` (ID Token JWT)
   
2. **Validação no Backend**
   - O frontend envia o ID Token para `/.netlify/functions/auth-google` via POST
   - O backend usa `google-auth-library` para validar o token
   - Extrai informações do usuário (email, nome, foto) do payload do token

3. **Persistência no Banco de Dados**
   - **Tabela `sv.users`**: Upsert por email (constraint: `users_email_key`)
   - **Tabela `sv.user_identities`**: Upsert por (provider, provider_user_id) usando constraint `unique_user_identity_provider_user`
   - Atualiza `last_login_at` em ambas as tabelas

4. **Geração de Token JWT**
   - Backend gera um JWT próprio da aplicação usando `JWT_SECRET`
   - Token contém: `userId`, `email`, `name`
   - Expira em 7 dias (configurável via `JWT_EXPIRES_IN`)

5. **Resposta ao Frontend**
   - Backend retorna o token JWT e dados do usuário
   - Frontend armazena o token no `localStorage`

### Variáveis de Ambiente Necessárias

**Frontend (Vite):**
- `VITE_GOOGLE_CLIENT_ID`: Client ID do projeto no Google Cloud Console

**Backend (Netlify Functions):**
- `VITE_GOOGLE_CLIENT_ID`: Client ID para validar tokens (mesmo valor do frontend)
- `JWT_SECRET`: Segredo para assinar tokens JWT da aplicação
- `JWT_EXPIRES_IN`: Tempo de expiração do JWT (padrão: "7d")
- `DATABASE_URL`: String de conexão PostgreSQL

### Configuração no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie ou selecione um projeto
3. Habilite o Google Sign-In API (Google Identity Services)
4. Em "Credenciais", crie um "OAuth 2.0 Client ID"
5. Configure as origens JavaScript autorizadas:
   - `https://squadsvirtuais.com` (produção)
   - `http://localhost:5173` (desenvolvimento)
6. Configure os URIs de redirecionamento autorizados conforme necessário

---

## GitHub OAuth Flow

### Visão Geral
O login com GitHub usa o protocolo OAuth 2.0 com fluxo de autorização (Authorization Code Flow).

### Fluxo de Autenticação

1. **Início do Fluxo (Frontend)**
   - Usuário clica em "Entrar com GitHub"
   - Frontend redireciona para `/.netlify/functions/auth-github`

2. **Redirecionamento para GitHub**
   - Netlify Function redireciona para `https://github.com/login/oauth/authorize`
   - Parâmetros incluem: `client_id`, `redirect_uri`, `scope` (read:user, user:email)
   - `redirect_uri` sempre usa `FRONTEND_URL` (nunca localhost em produção)

3. **Callback do GitHub**
   - Após aprovação, GitHub redireciona de volta com `code` na query string
   - Netlify Function troca o `code` por um `access_token`
   - Endpoint: `https://github.com/login/oauth/access_token`

4. **Obtenção de Dados do Usuário**
   - Backend usa o `access_token` para chamar GitHub API
   - `GET https://api.github.com/user` - dados do perfil
   - `GET https://api.github.com/user/emails` - emails (se não público)
   - Prioriza o email primário verificado

5. **Persistência no Banco de Dados**
   - **Tabela `sv.users`**: Upsert por email
   - **Tabela `sv.user_identities`**: Upsert por (provider='github', provider_user_id)
   - Campo `raw_profile` armazena resposta completa da API do GitHub
   - Atualiza `last_login_at`

6. **Geração de Token JWT**
   - Backend gera JWT próprio com `userId`, `email`, `name`
   - Mesmo mecanismo usado no Google OAuth

7. **Redirecionamento Final**
   - Backend redireciona para `${FRONTEND_URL}?token=${jwt}`
   - Frontend detecta o token na URL via `useEffect`
   - Token é armazenado no `localStorage`
   - URL é limpa (sem o token) para segurança

### Variáveis de Ambiente Necessárias

**Backend (Netlify Functions):**
- `GITHUB_CLIENT_ID`: Client ID do OAuth App no GitHub
- `GITHUB_CLIENT_SECRET`: Client Secret do OAuth App no GitHub
- `FRONTEND_URL`: URL do frontend em produção (ex: `https://squadsvirtuais.com`)
- `JWT_SECRET`: Segredo para assinar tokens JWT
- `DATABASE_URL`: String de conexão PostgreSQL

### Configuração no GitHub

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em "New OAuth App"
3. Preencha:
   - **Application name**: Squads Virtuais
   - **Homepage URL**: `https://squadsvirtuais.com`
   - **Authorization callback URL**: `https://squadsvirtuais.com/.netlify/functions/auth-github`
4. Após criar, copie o `Client ID` e gere um `Client Secret`
5. Configure as variáveis de ambiente no Netlify

---

## Estrutura do Banco de Dados

### Tabela `sv.users`

```sql
CREATE TABLE sv.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL, -- constraint: users_email_key
  avatar_url TEXT,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `sv.user_identities`

```sql
CREATE TABLE sv.user_identities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sv.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google' ou 'github'
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  raw_profile JSONB,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (provider, provider_user_id), -- constraint: unique_user_identity_provider_user
  UNIQUE (user_id, provider) -- constraint: unique_user_identity_user_provider
);
```

### Lógica de Upsert

Ambos os fluxos OAuth usam a mesma estratégia:

1. **Upsert em `sv.users`** usando `ON CONFLICT (email)`:
   - Se email existe: atualiza `name`, `avatar_url`, `last_login_at`
   - Se email não existe: cria novo usuário

2. **Upsert em `sv.user_identities`** usando `ON CONFLICT (provider, provider_user_id)`:
   - Se identidade existe: atualiza `user_id`, `provider_email`, `raw_profile`, `last_login_at`
   - Se identidade não existe: cria nova identidade

Isso permite que:
- Um usuário tenha múltiplos provedores (Google + GitHub) vinculados ao mesmo email
- Informações sejam atualizadas a cada login
- Não haja duplicação de usuários

---

## Segurança

### Validação de Tokens
- **Google**: Token ID é validado usando biblioteca oficial `google-auth-library`
- **GitHub**: Access token é obtido diretamente da API do GitHub após troca segura

### JWT da Aplicação
- Assinado com `JWT_SECRET` forte (deve ter no mínimo 32 caracteres aleatórios)
- Expira em 7 dias por padrão
- Armazenado no `localStorage` do cliente
- Enviado como `Authorization: Bearer <token>` para endpoints protegidos

### Proteção Contra Ataques
- CORS configurado adequadamente
- Tokens nunca expostos em logs
- HTTPS obrigatório em produção
- Validação de origem das requisições

### Boas Práticas Implementadas
- Nunca expor `CLIENT_SECRET` no frontend
- Sempre validar tokens no backend
- Usar constraints do banco para evitar duplicação
- Atualizar `last_login_at` para auditoria
- Armazenar perfil completo em `raw_profile` para debug

---

## Troubleshooting

### Erro: "invalid_client" no Google OAuth
- Verifique se `VITE_GOOGLE_CLIENT_ID` está configurado corretamente
- Confirme que o Client ID no Google Cloud é o mesmo em frontend e backend
- Verifique se a origem está autorizada no Google Cloud Console

### Erro: Redirecionamento para localhost no GitHub
- Verifique se `FRONTEND_URL` está configurado no Netlify
- Confirme que não há hardcoded `localhost` no código
- Verifique o callback URL configurado no GitHub OAuth App

### Usuário não é criado no banco
- Verifique logs da Netlify Function
- Confirme que `DATABASE_URL` está correto
- Verifique se as tabelas `sv.users` e `sv.user_identities` existem
- Confirme que as constraints (UNIQUE) estão criadas

### Token JWT inválido
- Verifique se `JWT_SECRET` é o mesmo em todas as funções
- Confirme que o token não expirou
- Verifique formato: deve ser `Bearer <token>`
