# Solução do Erro 500 no Login Google

## Resumo

Este documento descreve a solução implementada para corrigir o erro 500 que ocorria durante o login com Google em produção.

## Problema Original

### Sintoma
- Login com Google autenticava corretamente no Google OAuth
- Frontend recebia ID Token válido do Google
- POST para `/.netlify/functions/auth-google` retornava 500
- Mensagem de erro genérica: `{ "error": "Erro interno no login" }`
- Impossível diagnosticar a causa raiz do erro

### Causa Raiz
O código da Netlify Function `auth-google.js` tinha um bloco catch genérico que:
1. Capturava todos os erros sem distinção
2. Não registrava logs detalhados
3. Retornava sempre a mesma mensagem genérica
4. Impossibilitava debugging em produção

```javascript
// ANTES (problemático)
try {
  // ... todo o código ...
} catch {
  return json(500, { error: "Erro interno no login" });
}
```

## Solução Implementada

### 1. Logging Detalhado em Cada Etapa

O fluxo de autenticação foi dividido em **10 etapas distintas**, cada uma com:
- Log de início da operação
- Log de sucesso com contexto
- Try-catch específico para capturar erros
- Log de erro com mensagem específica e stack trace

#### Etapas Implementadas:
1. Validação do método HTTP
2. Verificação de variáveis de ambiente
3. Parse do body JSON
4. Validação do idToken
5. Verificação do token com Google OAuth
6. Extração dos dados do usuário
7. Upsert na tabela `sv.users`
8. Upsert na tabela `sv.user_identities`
9. Geração do JWT da aplicação
10. Resposta de sucesso

### 2. Prefixos de Log Estruturados

Todos os logs utilizam prefixos para facilitar filtragem:

- `[auth-google]`: Operações do handler principal
- `[db]`: Operações de banco de dados
- `[jwt]`: Operações de JWT

**Exemplo de uso**:
```bash
# Filtrar apenas logs do auth-google
grep "\[auth-google\]" logs.txt

# Ver apenas erros
grep "error\|erro" logs.txt -i
```

### 3. Mensagens de Erro Específicas

Cada tipo de erro agora retorna uma mensagem específica:

| Erro | Mensagem | HTTP Status |
|------|----------|-------------|
| Método inválido | "Method Not Allowed" | 405 |
| Body JSON inválido | "Body JSON inválido" | 400 |
| idToken ausente | "idToken é obrigatório" | 400 |
| Token Google inválido | "Falha ao verificar token Google" | 401 |
| Email ausente | "Email ausente no token" | 401 |
| Erro no banco (users) | "Erro ao salvar usuário no banco de dados" | 500 |
| Erro no banco (identities) | "Erro ao salvar identidade do usuário" | 500 |
| Erro ao gerar JWT | "Erro ao gerar token de autenticação" | 500 |
| Client ID ausente | "VITE_GOOGLE_CLIENT_ID não configurado no backend" | 500 |

### 4. Melhorias no Módulo de Banco de Dados

**Arquivo**: `netlify/functions/_lib/db.js`

Melhorias implementadas:
- Validação do `DATABASE_URL` na inicialização
- Handler de erros do pool de conexões
- Logging de cada query executada
- Logging de códigos de erro PostgreSQL
- Contagem de linhas retornadas

### 5. Melhorias no Módulo JWT

**Arquivo**: `netlify/functions/_lib/jwt.js`

Melhorias implementadas:
- Validação de `JWT_SECRET` e payload
- Logging de geração de JWT
- Mensagens de erro específicas

### 6. Segurança e Privacidade

A solução foi projetada com **privacy-first approach**:

#### ✅ O que é logado:
- Etapas do fluxo (sucesso/falha)
- Comprimento do token (não o conteúdo)
- Tipo de erro
- Códigos de erro do PostgreSQL
- Stack traces para debugging

#### ❌ O que NÃO é logado:
- Tokens completos ou parciais
- Endereços de email
- Nomes de usuários
- IDs de usuário
- Qualquer dado pessoal identificável

Esta abordagem permite debugging efetivo mantendo a privacidade dos usuários conforme LGPD/GDPR.

## Arquivos Modificados

### Código
1. **netlify/functions/auth-google.js** - Handler principal com 10 etapas logadas
2. **netlify/functions/_lib/db.js** - Conexão DB com logging e validação
3. **netlify/functions/_lib/jwt.js** - JWT com logging e validação

### Documentação
4. **README.md** - Atualizado com referência ao troubleshooting
5. **docs/oauth-flow.md** - Atualizado com informações de logging
6. **docs/auth-google-troubleshooting.md** - Novo guia completo de troubleshooting
7. **docs/SOLUTION-SUMMARY.md** - Este documento

## Como Usar em Produção

### Quando o Login Funcionar
Os logs mostrarão todas as 10 etapas com sucesso:
```
[auth-google] Iniciando autenticação Google
[auth-google] VITE_GOOGLE_CLIENT_ID presente
[auth-google] Body parseado com sucesso
[auth-google] idToken recebido (length: 1234 chars)
[auth-google] Verificando token Google...
[auth-google] Token Google verificado com sucesso
[auth-google] Dados do usuário extraídos com sucesso
[db] Executando query...
[auth-google] Fazendo upsert em sv.users...
[db] Query executada com sucesso. Linhas retornadas: 1
[auth-google] Usuário criado/atualizado com sucesso
[auth-google] Fazendo upsert em sv.user_identities...
[db] Executando query...
[db] Query executada com sucesso. Linhas retornadas: 0
[auth-google] Identidade criada/atualizada com sucesso
[auth-google] Gerando JWT...
[jwt] Gerando JWT para usuário
[auth-google] JWT gerado com sucesso
[auth-google] Autenticação concluída com sucesso
```

### Quando Houver Erro
Os logs mostrarão exatamente onde falhou:

**Exemplo - Erro no banco de dados**:
```
[auth-google] Iniciando autenticação Google
[auth-google] VITE_GOOGLE_CLIENT_ID presente
[auth-google] Body parseado com sucesso
[auth-google] idToken recebido (length: 1234 chars)
[auth-google] Verificando token Google...
[auth-google] Token Google verificado com sucesso
[auth-google] Dados do usuário extraídos com sucesso
[db] Executando query...
[auth-google] Fazendo upsert em sv.users...
[db] Erro ao executar query: relation "sv.users" does not exist
[db] Código do erro: 42P01
[auth-google] Erro no upsert de sv.users: relation "sv.users" does not exist
[auth-google] Stack: Error: relation "sv.users" does not exist
    at Parser.parseErrorMessage (...)
```

Neste exemplo, fica claro que:
1. O token Google foi validado com sucesso
2. O erro ocorreu no upsert de `sv.users`
3. A tabela não existe (código 42P01)
4. Solução: criar a tabela `sv.users`

## Validação

### Testes Executados
- ✅ Linting: `npm run lint` - passou sem erros
- ✅ Build: `npm run build` - passou sem erros
- ✅ Code Review: endereçadas todas as preocupações de segurança
- ✅ CodeQL Security Scan: 0 vulnerabilidades encontradas

### Checklist de Validação em Produção

Após o deploy, validar:

- [ ] Login com Google funciona corretamente
- [ ] Logs aparecem no Netlify Dashboard → Functions → auth-google
- [ ] Em caso de erro, os logs mostram a etapa específica que falhou
- [ ] Mensagens de erro no frontend são específicas e úteis
- [ ] Nenhum dado pessoal aparece nos logs
- [ ] Usuários são criados/atualizados corretamente em `sv.users`
- [ ] Identidades são criadas/atualizadas em `sv.user_identities`
- [ ] Campo `last_login_at` é atualizado corretamente

## Documentação Adicional

Para mais informações, consulte:

- **[auth-google-troubleshooting.md](./auth-google-troubleshooting.md)** - Guia completo de troubleshooting com todos os erros possíveis e soluções
- **[oauth-flow.md](./oauth-flow.md)** - Documentação técnica completa do fluxo OAuth
- **[environment-variables.md](./environment-variables.md)** - Lista de variáveis de ambiente necessárias
- **[architecture.md](./architecture.md)** - Decisões arquiteturais do projeto

## Conclusão

A solução implementada transforma um erro 500 genérico e impossível de debugar em um sistema com logging detalhado que permite:

1. **Identificar rapidamente** em qual etapa o erro ocorreu
2. **Diagnosticar a causa** com mensagens de erro específicas
3. **Resolver o problema** seguindo o guia de troubleshooting
4. **Manter a privacidade** dos usuários não logando dados pessoais

Esta abordagem segue as melhores práticas de:
- Observabilidade em produção
- Privacy by design
- Secure by default
- Debuggability sem comprometer segurança

---

**Data da Solução**: 2025-12-26  
**Issue**: #001.01 - Corrigir erro 500 no login Google em produção  
**PR**: copilot/fix-google-login-error
