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

Ambos os fluxos:
- Validam credenciais com os provedores oficiais
- Criam/atualizam usuário no banco de dados
- Geram token JWT próprio da aplicação
- Sessão válida por 7 dias

Para detalhes técnicos, consulte [docs/oauth-flow.md](docs/oauth-flow.md).

## ⚙️ Variáveis de Ambiente

### Obrigatórias

```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID=seu-client-id-google

# GitHub OAuth
GITHUB_CLIENT_ID=seu-client-id-github
GITHUB_CLIENT_SECRET=seu-client-secret-github

# JWT
JWT_SECRET=seu-segredo-jwt-minimo-32-caracteres

# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# Frontend URL (produção)
FRONTEND_URL=https://squadsvirtuais.com
```

### Opcionais

```bash
JWT_EXPIRES_IN=7d  # Tempo de expiração do token (padrão: 7 dias)
NODE_ENV=production  # Ambiente (Netlify define automaticamente)
```

Para lista completa e instruções de configuração, consulte [docs/environment-variables.md](docs/environment-variables.md).

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
- [Architecture](docs/architecture.md) - Decisões arquiteturais e estrutura do projeto
- [Environment Variables](docs/environment-variables.md) - Lista completa de variáveis de ambiente

## 🗄️ Banco de Dados

Schema: `sv` (squads virtuais)

Tabelas principais:
- `sv.users` - Dados dos usuários
- `sv.user_identities` - Identidades OAuth vinculadas aos usuários

O banco usa constraints UNIQUE para evitar duplicação e permitir upserts seguros.

## 🔒 Segurança

- Tokens Google validados com biblioteca oficial
- GitHub OAuth usa fluxo Authorization Code (server-side)
- JWT assinado com secret forte
- HTTPS obrigatório em produção
- Variáveis sensíveis nunca expostas no frontend

## 📄 Licença

Este projeto é privado e de propriedade de Squads Virtuais.

