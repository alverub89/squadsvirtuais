# Correção: Fases do roteiro estão sendo duplicadas

## Problema Identificado

As fases do roteiro estavam sendo duplicadas no sistema, aparecendo mais de uma vez para o mesmo fluxo de squad/projeto. Isso causava confusão na visualização e poderia gerar inconsistências em operações futuras.

## Causa Raiz

O problema foi identificado no arquivo `netlify/functions/suggestion-approvals.js`, especificamente na função `persistSuggestion`, no caso `'phase'`. O código estava inserindo fases diretamente na tabela `sv.phases` sem verificar se a fase já existia para aquela squad.

## Solução Implementada

### 1. Correção no Código Backend

**Arquivo**: `netlify/functions/suggestion-approvals.js` (linhas 680-733)

**Mudanças**:
- Adicionada consulta para buscar fases existentes antes de inserir novas
- Implementada comparação case-insensitive dos nomes das fases usando `toLowerCase().trim()`
- Skip automático de fases duplicadas
- Cálculo correto do `order_index`: continua a partir do valor máximo existente
- Logs detalhados para facilitar debugging e monitoramento

**Lógica**:
```javascript
1. Busca todas as fases existentes para a squad
2. Cria um Set com nomes normalizados (lowercase + trim) para lookup rápido
3. Para cada fase a ser inserida:
   a. Normaliza o nome
   b. Verifica se já existe no Set
   c. Se existir, skip (log e continua)
   d. Se não existir, insere com order_index correto
4. Log final com estatísticas (inseridas vs. duplicadas)
```

### 2. Constraint de Banco de Dados

**Arquivo**: `docs/migrations/015-add-unique-constraint-phases.sql`

**Mudanças**:
- Adicionado constraint único `phases_squad_name_unique` na tabela `sv.phases`
- Constraint garante unicidade na combinação `(squad_id, name)`
- Previne duplicatas a nível de banco de dados, mesmo que o código falhe

**SQL**:
```sql
ALTER TABLE sv.phases 
  ADD CONSTRAINT phases_squad_name_unique 
  UNIQUE (squad_id, name);
```

### 3. Script de Limpeza

**Arquivo**: `docs/cleanup-duplicate-phases.sql`

**Funcionalidade**:
1. **Identificação**: Query para listar todas as fases duplicadas
2. **Remoção**: Query para deletar duplicatas mantendo apenas a mais antiga (por `created_at`)
3. **Verificação**: Query para confirmar que não há mais duplicatas

**Uso**:
```bash
# Executar contra o banco de dados antes de aplicar a migration 015
psql -U usuario -d database -f docs/cleanup-duplicate-phases.sql
```

## Validação

### Testes Realizados

1. ✅ **Linting**: Executado `npm run lint` - sem erros
2. ✅ **Code Review**: Revisão automatizada concluída - apenas nitpicks sobre logging
3. ✅ **CodeQL Security**: Executado scanner de segurança - 0 alertas
4. ✅ **Lógica de Negócio**: Verificada correção do cálculo de `order_index`

### Resultados Esperados

- Uma mesma fase não pode aparecer duas vezes no roteiro da mesma squad
- Novas fases criadas são exibidas apenas uma vez
- Fases existentes são preservadas e não duplicadas
- Ordem das fases é mantida corretamente

## Instruções para Aplicar

### 1. Limpar Duplicatas Existentes (se houver)

```sql
-- 1. Verificar se há duplicatas
SELECT squad_id, name, COUNT(*) as count
FROM sv.phases
GROUP BY squad_id, name
HAVING COUNT(*) > 1;

-- 2. Executar limpeza (se necessário)
\i docs/cleanup-duplicate-phases.sql
```

### 2. Aplicar Migration

```sql
\i docs/migrations/015-add-unique-constraint-phases.sql
```

### 3. Deploy do Código

O código corrigido já está no branch `copilot/fix-duplicate-phases-issue` e pronto para merge.

## Impacto

### Benefícios

1. **Integridade de Dados**: Garante consistência dos dados de fases
2. **Melhor UX**: Usuários não veem fases duplicadas
3. **Prevenção**: Constraint de banco previne duplicatas futuras
4. **Manutenibilidade**: Código mais robusto e com melhor logging

### Riscos

- **Baixo**: A mudança é cirúrgica e focada apenas no caso de fases
- **Compatibilidade**: Não quebra funcionalidades existentes
- **Performance**: Impacto mínimo - apenas uma query adicional por operação de fases

## Critérios de Aceitação

- ✅ Uma mesma fase não pode aparecer duas vezes no roteiro da squad/projeto
- ✅ Garantir que novas fases criadas sejam exibidas apenas uma vez
- ✅ Corrigir registros duplicados atuais (script fornecido)

## Arquivos Modificados

1. `netlify/functions/suggestion-approvals.js` - Lógica de persistência de fases
2. `docs/migrations/015-add-unique-constraint-phases.sql` - Nova migration
3. `docs/cleanup-duplicate-phases.sql` - Script de limpeza (novo)

## Notas Técnicas

- A comparação de nomes é case-insensitive para evitar duplicatas por diferença de capitalização
- O `order_index` continua a partir do valor máximo existente para evitar conflitos
- Logs detalhados foram adicionados para facilitar debugging em produção
- A solução é defensiva: verificação em código + constraint em banco
