# Environment Variables

Este documento lista todas as variáveis de ambiente necessárias para o projeto Squads Virtuais.

---

## Variáveis Obrigatórias

### Frontend (Vite)

#### `VITE_GOOGLE_CLIENT_ID`
- **Descrição**: Client ID do OAuth 2.0 do Google Cloud
- **Tipo**: String
- **Exemplo**: `123456789-abc123def456.apps.googleusercontent.com`
- **Onde obter**: [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
- **Usado em**: 
  - `src/main.jsx` - Inicialização do GoogleOAuthProvider
  - `netlify/functions/auth-google.js` - Validação do token ID
- **Importante**: Deve ser o mesmo valor em frontend e backend

---

### Backend (Netlify Functions)

#### `VITE_GOOGLE_CLIENT_ID`
- **Descrição**: Client ID do Google OAuth (mesmo do frontend)
- **Tipo**: String
- **Exemplo**: `123456789-abc123def456.apps.googleusercontent.com`
- **Usado em**: `netlify/functions/auth-google.js`
- **Nota**: Nome mantido como `VITE_*` para compatibilidade, mas é usado no backend também

#### `GITHUB_CLIENT_ID`
- **Descrição**: Client ID do GitHub OAuth App
- **Tipo**: String
- **Exemplo**: `Iv1.abc123def456789`
- **Onde obter**: [GitHub Developer Settings](https://github.com/settings/developers) > OAuth Apps
- **Usado em**: 
  - `netlify/functions/auth-github.js` (login de usuário)
  - `netlify/functions/auth-github-start.js` (conexão de workspace)
  - `netlify/functions/auth-github-callback.js` (callback OAuth)
- **Nota**: OAuth App precisa ter scope `repo` para integração de repositórios

#### `GITHUB_CLIENT_SECRET`
- **Descrição**: Client Secret do GitHub OAuth App
- **Tipo**: String (sensível)
- **Exemplo**: `abcdef1234567890abcdef1234567890abcdef12`
- **Onde obter**: [GitHub Developer Settings](https://github.com/settings/developers) > OAuth Apps
- **Usado em**: 
  - `netlify/functions/auth-github.js` (login de usuário)
  - `netlify/functions/auth-github-callback.js` (callback OAuth)
- **⚠️ CRÍTICO**: Nunca expor no frontend ou commitar no Git

#### `FRONTEND_URL`
- **Descrição**: URL pública do frontend em produção
- **Tipo**: String (URL)
- **Exemplo**: `https://squadsvirtuais.com`
- **Padrão**: `https://squadsvirtuais.com` (se não definido)
- **Usado em**: 
  - `netlify/functions/auth-github.js` (login de usuário)
  - `netlify/functions/auth-github-start.js` (início OAuth workspace)
  - `netlify/functions/auth-github-callback.js` (redirect pós-OAuth)
- **Importante**: Usado para redirect após OAuth. Deve ser HTTPS em produção.

#### `JWT_SECRET`
- **Descrição**: Segredo para assinar tokens JWT da aplicação
- **Tipo**: String (sensível, mínimo 32 caracteres)
- **Exemplo**: `your-super-secret-jwt-key-min-32-chars-recommended-64`
- **Gerar**: `openssl rand -base64 64` ou `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`
- **Usado em**: 
  - `netlify/functions/_lib/jwt.js`
  - `netlify/functions/me.js`
- **⚠️ CRÍTICO**: Nunca expor ou commitar. Se comprometido, trocar imediatamente.

#### `DATABASE_URL`
- **Descrição**: String de conexão PostgreSQL
- **Tipo**: String (sensível)
- **Formato**: `postgresql://user:password@host:port/database?schema=sv`
- **Exemplo**: `postgresql://admin:pass123@db.example.com:5432/squadsvirtuais`
- **Usado em**: `netlify/functions/_lib/db.js`
- **⚠️ CRÍTICO**: Contém credenciais de banco. Nunca expor.

---

## Variáveis Opcionais

#### `JWT_EXPIRES_IN`
- **Descrição**: Tempo de expiração dos tokens JWT
- **Tipo**: String (formato zeit/ms)
- **Padrão**: `7d` (7 dias)
- **Exemplos**: 
  - `1h` - 1 hora
  - `24h` - 24 horas
  - `7d` - 7 dias
  - `30d` - 30 dias
- **Usado em**: `netlify/functions/_lib/jwt.js`

#### `NODE_ENV`
- **Descrição**: Ambiente de execução
- **Tipo**: String
- **Valores**: `development`, `production`
- **Padrão**: `development`
- **Usado em**: `netlify/functions/_lib/db.js` (define se usa SSL no PostgreSQL)
- **Nota**: Netlify define automaticamente como `production` em deploy

---

## Configuração no Netlify

### Passos para Configurar

1. Acesse o [Netlify Dashboard](https://app.netlify.com)
2. Selecione o site **squadsvirtuais**
3. Vá em **Site settings** > **Environment variables**
4. Clique em **Add a variable**
5. Para cada variável:
   - **Key**: Nome da variável (ex: `JWT_SECRET`)
   - **Values**: 
     - **Production**: Valor para produção
     - **Deploy previews**: (opcional) Valor para previews
     - **Branch deploys**: (opcional) Valor para branches
   - Marque **Secret** para variáveis sensíveis (JWT_SECRET, DATABASE_URL, etc)
6. Clique em **Create variable**
7. Repita para todas as variáveis

### Scopes

- **Production**: Usado no deploy da branch principal (main/master)
- **Deploy previews**: Usado em PRs para preview
- **Branch deploys**: Usado em deploys de outras branches

Recomendação: Configure ao menos **Production** para todas as variáveis.

---

## Configuração Local (Desenvolvimento)

### Arquivo `.env.local`

Crie um arquivo `.env.local` na raiz do projeto (não commitar no Git):

```bash
# Frontend
VITE_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com

# Backend (Netlify Functions usam as mesmas)
GITHUB_CLIENT_ID=Iv1.abc123def456789
GITHUB_CLIENT_SECRET=abcdef1234567890abcdef1234567890abcdef12
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-local-jwt-secret-at-least-32-chars
DATABASE_URL=postgresql://user:pass@localhost:5432/squadsvirtuais
NODE_ENV=development
JWT_EXPIRES_IN=7d
```

### `.gitignore`

Certifique-se de que `.env.local` está no `.gitignore`:

```bash
# Local env files
.env.local
.env.*.local
*.local
```

### Netlify CLI (opcional)

Para testar Netlify Functions localmente:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Executar localmente
netlify dev

# Netlify CLI carrega automaticamente variáveis do .env.local
```

---

## Checklist de Configuração

### Google OAuth

- [ ] Projeto criado no Google Cloud Console
- [ ] Google+ API habilitada
- [ ] OAuth 2.0 Client ID criado
- [ ] Origens JavaScript autorizadas configuradas:
  - [ ] `https://squadsvirtuais.com` (produção)
  - [ ] `http://localhost:5173` (desenvolvimento, se aplicável)
- [ ] `VITE_GOOGLE_CLIENT_ID` configurado no Netlify
- [ ] `VITE_GOOGLE_CLIENT_ID` configurado no `.env.local` (dev)

### GitHub OAuth

- [ ] OAuth App criado no GitHub
- [ ] Homepage URL: `https://squadsvirtuais.com`
- [ ] Authorization callback URL: `https://squadsvirtuais.com/.netlify/functions/auth-github`
- [ ] `GITHUB_CLIENT_ID` configurado no Netlify
- [ ] `GITHUB_CLIENT_SECRET` configurado no Netlify (marcado como Secret)
- [ ] `GITHUB_CLIENT_ID` configurado no `.env.local` (dev)
- [ ] `GITHUB_CLIENT_SECRET` configurado no `.env.local` (dev)

### JWT

- [ ] `JWT_SECRET` gerado (mínimo 32 caracteres)
- [ ] `JWT_SECRET` configurado no Netlify (marcado como Secret)
- [ ] `JWT_SECRET` configurado no `.env.local` (dev)
- [ ] `JWT_EXPIRES_IN` definido (ou usar padrão `7d`)

### Database

- [ ] PostgreSQL database provisionado
- [ ] Schema `sv` criado
- [ ] Tabelas `sv.users` e `sv.user_identities` criadas
- [ ] Constraints UNIQUE configuradas
- [ ] `DATABASE_URL` configurado no Netlify (marcado como Secret)
- [ ] `DATABASE_URL` configurado no `.env.local` (dev)

### Produção

- [ ] `FRONTEND_URL=https://squadsvirtuais.com` no Netlify
- [ ] `NODE_ENV=production` no Netlify (ou deixar Netlify definir)
- [ ] Todas as variáveis testadas em deploy preview
- [ ] SSL/HTTPS verificado e funcionando

---

## Troubleshooting

### Erro: "VITE_GOOGLE_CLIENT_ID não está configurado"

**Causa**: Variável não definida ou não carregada

**Solução**:
1. Verifique no Netlify Dashboard se a variável existe
2. Confirme o nome exato: `VITE_GOOGLE_CLIENT_ID` (case-sensitive)
3. Redeploy o site após adicionar variável
4. Para dev local: crie `.env.local` com a variável

### Erro: "JWT_SECRET ausente"

**Causa**: Variável não configurada ou não acessível pelas functions

**Solução**:
1. Configure `JWT_SECRET` no Netlify
2. Valor deve ter no mínimo 32 caracteres
3. Marque como "Secret" ao adicionar
4. Redeploy após adicionar

### Erro: "GitHub OAuth não configurado corretamente"

**Causa**: `GITHUB_CLIENT_ID` ou `GITHUB_CLIENT_SECRET` ausentes

**Solução**:
1. Verifique ambas as variáveis no Netlify
2. Confirme que o Client Secret está correto (não expira)
3. Se necessário, gere novo secret no GitHub e atualize Netlify

### Erro: Database connection failed

**Causa**: `DATABASE_URL` incorreto ou banco inacessível

**Solução**:
1. Verifique formato da connection string
2. Teste conexão manualmente: `psql $DATABASE_URL`
3. Confirme que schema `sv` existe: `\dn` no psql
4. Verifique firewall/IP whitelist do database provider

### Variável não carrega em dev local

**Causa**: Arquivo `.env.local` não existe ou tem nome errado

**Solução**:
1. Crie `.env.local` na raiz (ao lado de `package.json`)
2. Formato: `NOME_VARIAVEL=valor` (sem aspas, sem espaços)
3. Reinicie o dev server: `npm run dev`
4. Para Netlify CLI: use `netlify dev` ao invés de `npm run dev`

---

## Referências

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
