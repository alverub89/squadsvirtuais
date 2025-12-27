# Decisão Técnica — Evolução do Modelo de Roles, Personas e Matriz de Validação

**Status:** Aprovada  
**Data:** 2025-12-27  
**Contexto:** Squads Virtuais  
**Tipo:** Arquitetura de Dados + Produto  
**Responsável:** Squad Squads Virtuais

---

## 1. Contexto

Com a evolução do produto Squads Virtuais, tornou-se claro que:

- **Squads podem operar em contextos muito distintos** (Angular, React, Go, CX de serviço, CX de experiência, documentação, produto digital, etc.)
- **Personas serão geradas automaticamente por IA** a partir do problema de negócio
- **Papéis (roles) precisam representar especialidades reais**, não apenas rótulos
- **A governança de validação** (quem valida o quê) precisa ser:
  - Contextual por squad
  - Versionada
  - Auditável
  - Explicável para humanos e IA

Inicialmente tentou-se resolver isso apenas com `role_code` e `role_label` em `sv.squad_members`, mas esse modelo não era suficiente para sustentar:

- Especialidades complexas
- Múltiplos contextos por squad
- Associação estruturada entre roles e personas
- Aprendizado futuro da IA

Diante disso, decidiu-se evoluir o banco de dados, priorizando qualidade de produto sobre simplificação prematura.

---

## 2. Decisões Tomadas

### 2.1 Roles como especialidades de verdade

- **Roles passam a ser entidades próprias**, com:
  - Código estável
  - Descrição
  - Responsabilidades
- Elas deixam de ser apenas campos soltos em `squad_members`

### 2.2 Catálogo misto de roles

- **Existe um catálogo global de roles** do produto (`sv.roles`)
- **Workspaces podem estender/criar roles próprias** (`sv.workspace_roles`)
- **Squads escolhem quais roles ativar** (`sv.squad_roles`)

Essa abordagem equilibra:

- Padronização
- Flexibilidade
- Aprendizado da IA

### 2.3 Separação clara entre Role e Persona

- **Persona** representa ponto de vista, impacto e validação
- **Role** representa especialidade, responsabilidade e governança
- **Personas não são ocupadas por pessoas**
- **Pessoas ocupam roles, não personas**

Essa separação evita confusão conceitual e mantém o método claro.

### 2.4 Associação pessoa ↔ role

- **Um usuário humano pode ocupar apenas 1 role ativa por squad**
- Essa decisão:
  - Simplifica governança
  - Deixa claro "quem responde por quê"
  - Evita ambiguidade operacional

### 2.5 Matriz de Validação Role ↔ Persona

- A associação entre roles e personas é:
  - Por squad
  - Versionada
  - Histórica
- **Cada mudança gera uma nova versão**
- A matriz governa:
  - Validações de issues
  - Validações de decisões
  - Validações de fases

Essa matriz é a base para checkpoints humanos e automações futuras da IA.

---

## 3. Modelagem Adotada

### 3.1 Tabelas introduzidas

| Tabela | Responsabilidade |
|--------|------------------|
| `sv.roles` | Catálogo global de especialidades |
| `sv.workspace_roles` | Extensões de roles por workspace |
| `sv.squad_roles` | Roles ativas em uma squad |
| `sv.squad_member_role_assignments` | Associação pessoa ↔ role |
| `sv.squad_validation_matrix_versions` | Versões da matriz |
| `sv.squad_validation_matrix_entries` | Entradas role ↔ persona por versão |

### 3.2 Histórico e versionamento

- **O estado atual da matriz é sempre a maior versão por squad**
- **Versões antigas nunca são alteradas**
- Isso garante:
  - Auditoria
  - Explicabilidade
  - Base sólida para IA

---

## 4. Incidente durante aplicação do DDL

### Problema encontrado

Ao aplicar o DDL completo, ocorreu o erro:

```
ERROR: column "role_id" does not exist (SQLSTATE 42703)
```

### Causa raiz

- A tabela `sv.squad_roles` já existia no banco, criada anteriormente
- O `CREATE TABLE IF NOT EXISTS` não alterou o schema existente
- O script tentou criar índices e constraints usando colunas (`role_id`, `workspace_role_id`) que ainda não existiam

Esse comportamento é esperado no PostgreSQL.

---

## 5. Correção aplicada (patch incremental)

### Estratégia adotada

- Não dropar tabelas
- Não perder dados
- Evoluir o schema de forma incremental e segura

### Ações executadas

1. **Inspeção do schema atual** via `information_schema.columns`
2. **ALTER TABLE** para adicionar colunas ausentes:
   - `role_id`
   - `workspace_role_id`
   - `active`
   - `created_at`
   - `updated_at`
3. **Criação posterior de:**
   - Foreign keys
   - Check constraints
   - Índices únicos condicionais
4. **Somente após isso**, criação dos índices que dependiam das colunas

Essa abordagem garante compatibilidade com ambientes já existentes.

---

## 6. Diretrizes obrigatórias a partir desta decisão

- **Nunca assumir que uma tabela não existe** em ambientes reais
- **Sempre preferir migrações incrementais**
- **Índices e constraints devem ser criados após validação do schema**
- **Roles são especialidades**
- **Personas são mecanismo de validação**
- **A matriz Role ↔ Persona é fonte de verdade** para checkpoints

---

## 7. Impactos esperados

### Positivos

- Produto mais adaptável a contexto
- Base sólida para IA gerar personas e sugerir governança
- Clareza de método para usuários humanos
- Histórico explícito de decisões e validações

### Negativos / Trade-offs

- Mais tabelas e complexidade inicial
- Necessidade de documentação clara (mitigada por este documento)

---

## 8. Implementação

### Backend API

Foram implementados os seguintes endpoints:

- **GET /roles** - Lista roles globais e de workspace
- **POST /workspace-roles** - Cria role customizada no workspace
- **PATCH /workspace-roles** - Atualiza role do workspace
- **GET /squad-roles** - Lista roles ativas na squad
- **POST /squad-roles** - Ativa role na squad
- **PATCH /squad-roles** - Ativa/desativa role da squad
- **POST /squad-member-roles** - Atribui/remove role de membro
- **GET /squad-member-roles** - Lista atribuições de roles
- **GET /squad-validation-matrix** - Obtém versão atual da matriz
- **POST /squad-validation-matrix** - Cria nova versão da matriz

### Frontend UI

Foram criadas 3 novas páginas:

1. **Squad Roles** (`/squads/:id/roles`)
   - Lista roles ativas e disponíveis
   - Permite ativar/desativar roles
   - Distingue roles globais vs workspace

2. **Member Roles** (`/squads/:id/member-roles`)
   - Atribui roles aos membros da squad
   - Garante regra de 1 role ativa por membro
   - UX clara de responsabilidade

3. **Validation Matrix** (`/squads/:id/validation-matrix`)
   - Configura matriz role ↔ persona
   - Define checkpoint type (ISSUE, DECISION, PHASE, MAP)
   - Define requirement level (REQUIRED, OPTIONAL)
   - Versionamento automático

---

## 9. Próximos passos recomendados

1. ✅ Aplicar migrações em ambiente de produção
2. ✅ Atualizar `/docs/database` com as novas tabelas
3. ✅ Criar seed inicial de roles globais
4. ✅ Implementar CRUD básico de roles e squad_roles
5. ✅ Implementar UI da Matriz de Validação
6. 🔲 Integrar matriz ao fluxo de criação/validação de issues
7. 🔲 Integrar matriz ao fluxo de decisões
8. 🔲 Implementar API para IA sugerir roles baseado no contexto
9. 🔲 Implementar checkpoint de validação automática

---

## Resumo final

Esta decisão consolida o Squads Virtuais como um produto orientado a método, governança e aprendizado contínuo — não apenas geração de tarefas.

A evolução do banco de dados é intencional e necessária para sustentar esse posicionamento.

**O modelo de roles + matriz de validação permite:**

- Squads adaptáveis a qualquer contexto técnico ou de negócio
- Governança clara e explícita de responsabilidades
- Base estruturada para IA aprender e sugerir melhores práticas
- Histórico completo e auditável de decisões de validação

---

**Documento versionado em:** 2025-12-27  
**Última atualização:** 2025-12-27
