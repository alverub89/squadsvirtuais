# Architecture Documentation

Este documento descreve as decisões arquiteturais do projeto Squads Virtuais.

## Stack Tecnológica

### Frontend
- **React**: Biblioteca para interface de usuário
- **Vite**: Build tool e dev server
- **@react-oauth/google**: Cliente OAuth 2.0 para Google
- **ESLint**: Linter para garantir qualidade do código

### Backend
- **Netlify Functions**: Serverless functions (AWS Lambda)
- **Node.js**: Runtime JavaScript
- **PostgreSQL**: Banco de dados relacional
- **jsonwebtoken**: Geração e validação de JWT
- **google-auth-library**: Validação de tokens Google
- **pg**: Driver PostgreSQL para Node.js

### Infraestrutura
- **Netlify**: Hospedagem do frontend e functions
- **PostgreSQL**: Banco de dados (provavelmente hospedado em serviço externo)
- **Domain**: squadsvirtuais.com

---

## Arquitetura da Aplicação

### Camadas

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)           │
│  - Login UI (Google + GitHub)               │
│  - Token management (localStorage)          │
│  - API calls to Netlify Functions           │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────────┐
│        Netlify Functions (Backend)          │
│  - auth-google.js: Google OAuth handler     │
│  - auth-github.js: GitHub OAuth handler     │
│  - me.js: Get current user info             │
│  - _lib/db.js: Database connection          │
│  - _lib/jwt.js: JWT utilities               │
└─────────────────┬───────────────────────────┘
                  │
                  │ PostgreSQL Protocol
                  │
┌─────────────────▼───────────────────────────┐
│          PostgreSQL Database                │
│  - Schema: sv                               │
│  - Tables: users, user_identities           │
└─────────────────────────────────────────────┘
```

---

## Decisões de Design

### 1. Netlify Functions vs Express API

**Decisão**: Usar Netlify Functions (serverless)

**Razões**:
- Integração nativa com deploy do frontend
- Escalabilidade automática
- Sem necessidade de gerenciar servidores
- Custo-benefício para aplicações com tráfego variável
- Deploy simplificado (um único repositório)

**Trade-offs**:
- Cold start latency (primeira requisição pode ser lenta)
- Limitações de tempo de execução (10 segundos no plano free)
- Debugging mais complexo

### 2. Schema Separado no PostgreSQL

**Decisão**: Usar schema `sv` (squads virtuais) ao invés de `public`

**Razões**:
- Isolamento lógico das tabelas
- Facilita multi-tenancy futuro
- Evita conflito com outras aplicações no mesmo banco
- Melhora organização em bancos compartilhados

**Implementação**:
```sql
-- Todas as queries usam sv.users, sv.user_identities
SELECT * FROM sv.users WHERE email = $1;
```

### 3. Upsert Strategy para OAuth

**Decisão**: Usar `ON CONFLICT` com upserts ao invés de verificar existência antes

**Razões**:
- Operação atômica (evita race conditions)
- Melhor performance (uma query ao invés de duas)
- Código mais simples e legível
- Aproveitamento das constraints UNIQUE existentes

**Exemplo**:
```sql
INSERT INTO sv.users (name, email, avatar_url, last_login_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = COALESCE(EXCLUDED.avatar_url, sv.users.avatar_url),
  last_login_at = EXCLUDED.last_login_at
RETURNING id, name, email, avatar_url;
```

### 4. JWT para Sessões

**Decisão**: Usar JWT armazenado no localStorage ao invés de sessions server-side

**Razões**:
- Stateless: não precisa armazenar sessões no servidor
- Compatível com arquitetura serverless (Netlify Functions)
- Permite autenticação entre diferentes functions sem state compartilhado
- Facilita escalabilidade horizontal

**Trade-offs**:
- Não é possível invalidar token antes do expiry
- Token pode ser roubado se XSS vulnerável
- Tamanho maior que session ID simples

**Mitigação**:
- Token expira em 7 dias
- HTTPS obrigatório em produção
- CSP headers recomendados

### 5. Dois Provedores OAuth (Google + GitHub)

**Decisão**: Suportar múltiplos provedores desde o início

**Razões**:
- Flexibilidade para usuários sem conta Google
- Desenvolvedores preferem GitHub
- Permite vincular múltiplas identidades ao mesmo usuário

**Implementação**:
- Tabela `user_identities` com constraint `UNIQUE (user_id, provider)`
- Mesmo email = mesmo usuário (unificação por email)
- Campo `provider` diferencia origem ('google' ou 'github')

### 6. Redirecionamento via Query String para GitHub

**Decisão**: GitHub OAuth redireciona com `?token=<jwt>` na URL

**Razões**:
- GitHub OAuth usa Authorization Code Flow (requer callback server-side)
- Impossível passar token diretamente via postMessage
- URL é limpa imediatamente após extração do token

**Alternativas consideradas**:
- Cookies: complexidade com SameSite e CORS
- Session storage via iframe: não funciona cross-origin
- Popup com postMessage: GitHub não suporta

**Implementação**:
```javascript
// Backend
return redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);

// Frontend
const token = new URLSearchParams(window.location.search).get('token');
if (token) {
  localStorage.setItem('authToken', token);
  window.history.replaceState({}, document.title, window.location.pathname);
}
```

### 7. FRONTEND_URL como Variável de Ambiente

**Decisão**: Configurar `FRONTEND_URL` ao invés de hardcoded

**Razões**:
- Permite diferentes URLs em desenvolvimento/staging/produção
- Elimina hardcoded localhost em produção
- Facilita testes e deploys

**Valor padrão**: `https://squadsvirtuais.com`

### 8. Separação de Concerns (_lib)

**Decisão**: Criar pasta `_lib` para código compartilhado

**Razões**:
- Reutilização de código entre functions
- Separação de responsabilidades (DB, JWT, etc)
- Facilita testes unitários
- Organização mais clara

**Estrutura**:
```
netlify/functions/
├── _lib/
│   ├── db.js      # Database connection pool
│   └── jwt.js     # JWT sign/verify utilities
├── auth-google.js
├── auth-github.js
└── me.js
```

---

## Padrões de Código

### 1. Resposta JSON Padronizada

Todas as functions retornam JSON com mesma estrutura:

```javascript
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
```

**Sucesso**:
```json
{
  "ok": true,
  "token": "eyJhbG...",
  "user": { ... }
}
```

**Erro**:
```json
{
  "error": "Descrição do erro"
}
```

### 2. Error Handling

- Try-catch em todas as functions
- Erros nunca expõem detalhes internos ao cliente
- Logs detalhados no servidor (console.error)
- Status codes HTTP apropriados

```javascript
try {
  // ... código
} catch (e) {
  console.error("Erro no auth-github:", e);
  return json(500, { error: "Erro interno" });
}
```

### 3. Validação de Entrada

- Sempre validar parâmetros obrigatórios
- Retornar 400 (Bad Request) para dados inválidos
- Retornar 401 (Unauthorized) para problemas de autenticação
- Retornar 500 (Internal Error) para erros do servidor

### 4. Naming Conventions

- **Variáveis**: camelCase (`googleClientId`, `accessToken`)
- **Funções**: camelCase (`signJwt`, `handleGithubLogin`)
- **Componentes React**: PascalCase (`App`, `GoogleLogin`)
- **Arquivos**: kebab-case (`auth-google.js`, `oauth-flow.md`)
- **Tabelas**: snake_case (`user_identities`, `last_login_at`)

---

## Segurança

### Variáveis de Ambiente Sensíveis

Nunca commitar no repositório:
- `JWT_SECRET`
- `GITHUB_CLIENT_SECRET`
- `DATABASE_URL`

Configurar no Netlify Dashboard > Site Settings > Environment Variables.

### Validações Implementadas

1. **Token Google**: Validado com `google-auth-library`
2. **Token GitHub**: Obtido via exchange oficial da API
3. **JWT App**: Assinado e verificado com secret forte
4. **Database**: Usa parameterized queries (proteção contra SQL injection)

### HTTPS

Produção obrigatoriamente usa HTTPS:
- Netlify fornece certificado SSL automático
- Variável `NODE_ENV=production` ativa SSL no pool PostgreSQL

---

## Melhorias Futuras

### Curto Prazo
- [ ] Implementar logout (invalidação de token via blacklist)
- [ ] Adicionar refresh token para sessões longas
- [ ] Implementar rate limiting nas functions
- [ ] Adicionar testes automatizados (Jest + Supertest)

### Médio Prazo
- [ ] Dashboard de gerenciamento de squads
- [ ] Sistema de convites por email
- [ ] Notificações em tempo real (WebSockets)
- [ ] Suporte a mais provedores OAuth (Microsoft, Apple)

### Longo Prazo
- [ ] Migrar para Supabase (PostgreSQL + Auth + Realtime)
- [ ] Implementar multi-tenancy (múltiplas organizações)
- [ ] App mobile (React Native)
- [ ] API GraphQL para queries complexas

---

## Deploy

### Processo de Deploy

1. **Push para GitHub**: Código commitado na branch main
2. **Netlify Build**: 
   - Executa `npm run build` (Vite build)
   - Gera pasta `dist` com assets estáticos
   - Copia `netlify/functions` para build
3. **Deploy**:
   - CDN serve arquivos estáticos
   - Functions deployadas como AWS Lambda
   - URL disponível em `https://squadsvirtuais.com`

### Configuração Necessária

**Netlify Site Settings**:
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

**Environment Variables** (configurar no Netlify):
- `VITE_GOOGLE_CLIENT_ID`: Client ID do Google OAuth
- `GITHUB_CLIENT_ID`: Client ID do GitHub OAuth
- `GITHUB_CLIENT_SECRET`: Secret do GitHub OAuth
- `FRONTEND_URL`: `https://squadsvirtuais.com`
- `JWT_SECRET`: String aleatória longa (min 32 chars)
- `JWT_EXPIRES_IN`: `7d` (ou outro valor)
- `DATABASE_URL`: Connection string PostgreSQL
- `NODE_ENV`: `production`

### Rollback

Se houver problema em produção:
1. Acessar Netlify Dashboard > Deploys
2. Selecionar deploy anterior estável
3. Clicar em "Publish deploy"
4. Rollback é instantâneo

---

## Manutenção

### Logs e Monitoramento

- **Netlify Functions**: Logs disponíveis em Dashboard > Functions
- **PostgreSQL**: Configurar logging no serviço de database
- **Frontend**: Erros capturados no console do browser

### Backup

- **Database**: Configurar backup automático diário no provider PostgreSQL
- **Code**: Git é o backup (múltiplos remotes recomendado)

### Atualizações de Dependências

```bash
# Verificar vulnerabilidades
npm audit

# Atualizar dependências
npm update

# Testar localmente
npm run dev

# Deploy se tudo OK
git commit -am "Update dependencies"
git push
```

---

## Contato e Suporte

Para questões técnicas, consulte:
- README.md (instruções gerais)
- docs/oauth-flow.md (detalhes de autenticação)
- docs/environment-variables.md (lista completa de env vars)
