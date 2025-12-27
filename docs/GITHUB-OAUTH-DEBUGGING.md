# GitHub OAuth Login Debugging Guide

Este documento fornece orientações para diagnosticar o problema onde o login com GitHub funciona na primeira vez mas falha em tentativas subsequentes.

## Problema Relatado

- **Sintoma:** Login com GitHub funciona na primeira vez, mas não em logins subsequentes
- **Comportamento esperado:** Usuário deve ser redirecionado para `/workspaces` após login bem-sucedido
- **Comportamento observado:** Usuário permanece na tela de login após completar o OAuth

## Endpoints Envolvidos

### 1. `/auth-github.js` - Login de Usuário
- **Propósito:** Autenticar usuário no aplicativo
- **Fluxo:** User click → GitHub OAuth → Callback com code → Gera JWT → Redireciona com `?token=...`
- **Callback URL esperada:** `${FRONTEND_URL}/.netlify/functions/auth-github`

### 2. `/auth-github-callback.js` - Conexão de Workspace
- **Propósito:** Conectar conta GitHub a um workspace existente
- **Fluxo:** POST `/auth-github-start` → GitHub OAuth → Callback com code + state → Salva conexão → Redireciona com `?github_connected=true`
- **Callback URL esperada:** `${FRONTEND_URL}/.netlify/functions/auth-github-callback`
- **Requer:** Parâmetro `state` com `workspace_id`

## Logs Implementados

### Logs em `auth-github.js`

```
[auth-github] INICIO
{
  httpMethod: 'GET',
  queryStringParameters: { ... },
  hasCode: false/true,
  timestamp: '...'
}

[auth-github] Redirecionando para GitHub OAuth
{
  redirectUri: 'https://squadsvirtuais.com/.netlify/functions/auth-github',
  scope: 'read:user user:email',
  frontendUrl: 'https://squadsvirtuais.com'
}

[auth-github] Processando callback com code
{
  codeLength: 20,
  hasState: false
}

[auth-github] ✓ Access token obtido do GitHub

[auth-github] Dados do usuário GitHub obtidos
{
  id: 123456,
  login: 'username',
  email: 'user@example.com',
  hasPublicEmail: true
}

[auth-github] Usuário upsert realizado
{
  userId: 1,
  email: 'user@example.com',
  name: 'User Name'
}

[auth-github] JWT gerado
{
  userId: 1,
  tokenLength: 200
}

[auth-github] REDIRECT URL: https://squadsvirtuais.com/login?token=...
```

### Logs em `auth-github-callback.js`

```
[auth-github-callback] INICIO
{
  httpMethod: 'GET',
  queryStringParameters: { ... },
  hasCode: true,
  hasState: true,
  timestamp: '...'
}

[auth-github-callback] workspace_id extraído do state: abc-123

[auth-github-callback] Trocando code por access_token...
[auth-github-callback] ✓ Access token obtido

[auth-github-callback] Buscando dados do usuário GitHub...
[auth-github-callback] ✓ Dados do usuário obtidos, login: username

[auth-github-callback] Dados extraídos - provider_user_id: 123456 login: username

[auth-github-callback] Persistindo conexão GitHub...
[auth-github-callback] ✓ Conexão GitHub persistida com sucesso

[auth-github-callback] OAuth concluído com sucesso
[auth-github-callback] REDIRECT URL: https://squadsvirtuais.com?github_connected=true&workspace_id=...
```

## Como Diagnosticar

### Cenário 1: Endpoint Correto Sendo Chamado

Se os logs mostram:

```
[auth-github] INICIO { hasCode: false, ... }
[auth-github] Redirecionando para GitHub OAuth { ... }
[auth-github] INICIO { hasCode: true, ... }
[auth-github] Processando callback com code { ... }
[auth-github] JWT gerado { ... }
[auth-github] REDIRECT URL: https://squadsvirtuais.com/login?token=...
```

**Diagnóstico:** O fluxo OAuth está correto no backend. O problema pode estar no frontend (Login.jsx) não processando o token corretamente.

**Próximos passos:**
1. Verificar console do navegador para erros JavaScript
2. Verificar se o token está sendo salvo no localStorage
3. Verificar se o useEffect em Login.jsx está sendo executado

### Cenário 2: Endpoint Errado Sendo Chamado

Se os logs mostram:

```
[auth-github] INICIO { hasCode: false, ... }
[auth-github] Redirecionando para GitHub OAuth { ... }
[auth-github-callback] INICIO { hasCode: true, hasState: false, ... }
[auth-github-callback] State ausente
```

**Diagnóstico:** GitHub está redirecionando para o endpoint errado (`auth-github-callback` em vez de `auth-github`).

**Causa raiz:** A configuração do GitHub OAuth App pode ter múltiplas callback URLs ou a URL errada configurada.

**Próximos passos:**
1. Acessar [GitHub Developer Settings](https://github.com/settings/developers)
2. Verificar o OAuth App "Squads Virtuais"
3. Confirmar que **Authorization callback URL** está configurada como:
   - `https://squadsvirtuais.com/.netlify/functions/auth-github`
   - **NÃO** `https://squadsvirtuais.com/.netlify/functions/auth-github-callback`

### Cenário 3: GitHub Cacheing Redirect URI

Se o problema persiste mesmo com a callback URL correta:

**Diagnóstico:** GitHub pode estar cacheando a redirect URI da primeira autorização.

**Solução:**
1. Revogar autorização do aplicativo:
   - Acessar https://github.com/settings/applications
   - Encontrar "Squads Virtuais"
   - Clicar "Revoke access"
2. Tentar login novamente

### Cenário 4: Estado Inesperado no Callback

Se os logs mostram `hasState: true` quando deveria ser `false`:

```
[auth-github] INICIO { hasCode: true, hasState: true, ... }
```

**Diagnóstico:** Alguém pode estar chamando o fluxo de login com um parâmetro `state` que não deveria existir.

**Próximos passos:**
1. Verificar o código que inicia o fluxo OAuth
2. Confirmar que `Login.jsx` está apenas redirecionando para `/.netlify/functions/auth-github` sem parâmetros adicionais

## Frontend: Tratamento de Resposta

O `Login.jsx` atualmente apenas processa `?token=...`:

```javascript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  
  if (token) {
    login(token)
    navigate('/workspaces')
  }
}, [login, navigate])
```

**Importante:** O frontend **não** trata `?github_connected=true`, que é o retorno de `auth-github-callback.js`. Se o usuário está sendo redirecionado para o endpoint errado, o login não funcionará mesmo que o OAuth seja bem-sucedido.

## Checklist de Configuração

- [ ] Variáveis de ambiente configuradas no Netlify:
  - [ ] `GITHUB_CLIENT_ID`
  - [ ] `GITHUB_CLIENT_SECRETS_OAUTH`
  - [ ] `FRONTEND_URL`
- [ ] GitHub OAuth App configurado:
  - [ ] Application name: Squads Virtuais
  - [ ] Homepage URL: `https://squadsvirtuais.com`
  - [ ] Authorization callback URL: `https://squadsvirtuais.com/.netlify/functions/auth-github`
- [ ] Usuário revogou acesso anterior (se necessário)

## Monitoramento de Logs

Para visualizar os logs em produção:

1. Acessar Netlify Dashboard
2. Ir para o site "squadsvirtuais"
3. Clicar em "Functions"
4. Selecionar a função relevante (`auth-github` ou `auth-github-callback`)
5. Visualizar "Function log" em tempo real

Ou usar Netlify CLI:

```bash
netlify dev
# Testar localmente e ver logs no terminal

netlify functions:log auth-github
# Ver logs da função em produção
```

## Referências

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- Código fonte:
  - `netlify/functions/auth-github.js`
  - `netlify/functions/auth-github-callback.js`
  - `netlify/functions/auth-github-start.js`
  - `src/pages/Login.jsx`
