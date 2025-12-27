# Squads Virtuais

Plataforma para criar e gerenciar squads virtuais de forma colaborativa.

## 🚀 Tecnologias

- **Frontend**: React 19 + Vite 7
- **Backend**: Netlify Functions (Serverless)
- **Database**: PostgreSQL
- **Autenticação**: OAuth 2.0 (Google + GitHub) + JWT

## 🔐 Login

O projeto suporta autenticação via:

- **Google OAuth 2.0**: Login rápido usando conta Google
- **GitHub OAuth 2.0**: Login integrado para desenvolvedores

### Fluxo do Login Google

1. **Frontend**: Usuário clica em "Entrar com Google"
2. **Google OAuth**: Autentica usuário e retorna ID Token
3. **Backend** (`/.netlify/functions/auth-google`):
   - Valida ID Token com Google
   - Cria/atualiza usuário em `sv.users` (upsert por email)
   - Cria/atualiza identidade em `sv.user_identities` (upsert por provider + provider_user_id)
   - Atualiza `last_login_at` e `updated_at`
   - Gera JWT próprio da aplicação
4. **Frontend**: Recebe JWT e armazena para autenticação

**Características**:
- Validação com biblioteca oficial do Google
- Upsert seguro com ON CONFLICT (não cria duplicatas)
- Constraints UNIQUE garantem integridade dos dados
- Sessão válida por 7 dias
- Logging detalhado para debugging em produção (sem vazar dados pessoais)

Para detalhes técnicos, consulte [docs/oauth-flow.md](docs/oauth-flow.md).

**Troubleshooting**: Se encontrar erros no login Google, consulte [docs/auth-google-troubleshooting.md](docs/auth-google-troubleshooting.md) para um guia detalhado de diagnóstico.

## ⚙️ Variáveis de Ambiente

### Obrigatórias para Funcionamento

Estas variáveis **DEVEM** estar configuradas tanto no frontend (.env local) quanto no backend (Netlify Environment Variables):

#### Google OAuth
```bash
# Client ID do Google Cloud Console
# Mesmo valor no frontend e backend
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
```

**Como obter**:
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie projeto (ou use existente)
3. Ative "Google Sign-In API"
4. Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure origens autorizadas: `https://squadsvirtuais.com`, `http://localhost:5173`

#### GitHub OAuth
```bash
# Client ID e Secret do GitHub OAuth App
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRETS_OAUTH=abc123def456789...
```

**Como obter**:
1. Acesse GitHub Settings → Developer settings → OAuth Apps
2. New OAuth App
3. Authorization callback URL: `https://squadsvirtuais.com/.netlify/functions/auth-github`

#### JWT (Backend apenas)
```bash
# Secret para assinar tokens JWT
# Mínimo 32 caracteres, máximo sigilo
JWT_SECRET=seu-segredo-super-forte-aleatorio-minimo-32-chars

# Opcional: tempo de expiração do token
JWT_EXPIRES_IN=7d
```

**Como gerar secret seguro**:
```bash
openssl rand -base64 32
```

#### Database (Backend apenas)
```bash
# Connection string do PostgreSQL
# Formato: postgresql://user:password@host:port/database?sslmode=require
DATABASE_URL=postgresql://user:pass@host.supabase.co:5432/postgres?sslmode=require
```

**Requisitos**:
- PostgreSQL 12+
- Schema `sv` criado
- Tabelas `sv.users` e `sv.user_identities` criadas
- SSL habilitado em produção

#### Frontend URL (Backend apenas)
```bash
# URL do frontend em produção
# Usado para validar CORS e redirects
FRONTEND_URL=https://squadsvirtuais.com
```

### Opcionais

```bash
# Ambiente (Netlify configura automaticamente)
NODE_ENV=production

# Tempo de expiração do JWT (padrão: 7 dias)
JWT_EXPIRES_IN=7d
```

### Como Configurar

#### Desenvolvimento Local
1. Crie arquivo `.env` na raiz do projeto:
```bash
VITE_GOOGLE_CLIENT_ID=seu-client-id
```

2. **Nunca commitar** `.env` (já está no `.gitignore`)

#### Produção (Netlify)
1. Acesse [Netlify Dashboard](https://app.netlify.com)
2. Site settings → Environment variables
3. Adicione **todas** as variáveis obrigatórias (exceto frontend-only)
4. Redeploy o site para aplicar mudanças

**Importante**: Variáveis do Netlify são usadas tanto pelo build (frontend) quanto pelas functions (backend).

Para lista completa e instruções detalhadas, consulte [docs/environment-variables.md](docs/environment-variables.md).

## 🏗️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Linting
npm run lint
```

## 📦 Deploy

O projeto usa Netlify para deploy automático:

1. Push para branch `main` no GitHub
2. Netlify executa `npm run build`
3. Deploy automático em https://squadsvirtuais.com

Configurações no Netlify:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

## 📚 Documentação

- [OAuth Flow](docs/oauth-flow.md) - Fluxo detalhado de autenticação Google e GitHub
- [Google Auth Troubleshooting](docs/auth-google-troubleshooting.md) - Guia de diagnóstico e resolução de problemas do login Google
- [Issue #001.02 Fix](docs/issue-001-02-google-auth-identity-fix.md) - Histórico das issues e correção da persistência de identidades
- [Architecture](docs/architecture.md) - Decisões arquiteturais e estrutura do projeto
- [Environment Variables](docs/environment-variables.md) - Lista completa de variáveis de ambiente
- [Squads](docs/squads.md) - Documentação completa sobre squads: conceito, ciclo de vida, API e práticas
- [Database Schema](docs/database-schema.md) - Esquema completo do banco de dados

## 🗄️ Banco de Dados

Schema: `sv` (squads virtuais)

Tabelas principais:
- `sv.users` - Dados dos usuários
- `sv.user_identities` - Identidades OAuth vinculadas aos usuários
- `sv.workspaces` - Workspaces (contextos organizacionais)
- `sv.workspace_members` - Membros dos workspaces
- `sv.squads` - Squads (unidades de trabalho)

O banco usa constraints UNIQUE para evitar duplicação e permitir upserts seguros.

### Squads

Uma **squad** é a unidade central de trabalho do produto. Cada squad:

- Pertence a um workspace (não existe squad órfã)
- Organiza o método completo: problema, personas, fases, backlog e integração com repositório
- Tem um ciclo de vida com estados: `rascunho`, `ativa`, `aguardando_execucao`, `em_revisao`, `concluida`, `pausada`

Para mais informações sobre squads, consulte [docs/squads.md](docs/squads.md).

### Relação Workspace → Squad

```
Workspace (contexto organizacional)
  └── Squad 1 (problema específico)
  └── Squad 2 (problema específico)
  └── Squad 3 (problema específico)
```

- **Workspace**: Organiza pessoas, permissões e contexto geral
- **Squad**: Foca em um problema de negócio específico

Apenas membros de um workspace podem criar e visualizar squads nele.

## 🔒 Segurança

- Tokens Google validados com biblioteca oficial
- GitHub OAuth usa fluxo Authorization Code (server-side)
- JWT assinado com secret forte
- HTTPS obrigatório em produção
- Variáveis sensíveis nunca expostas no frontend

## 📄 Licença

Este projeto é privado e de propriedade de Squads Virtuais.

