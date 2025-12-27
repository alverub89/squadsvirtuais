-- Migration: Seed Initial Global Roles
-- Date: 2025-12-27
-- Purpose: Populate the global roles catalog with common specialties
-- Note: Uses INSERT ... ON CONFLICT to be idempotent

-- Common technical roles
INSERT INTO sv.roles (code, label, description, responsibilities, default_active)
VALUES 
  (
    'tech_lead',
    'Tech Lead',
    'Líder técnico responsável por arquitetura e decisões de implementação',
    'Definir arquitetura, revisar código, orientar equipe técnica, tomar decisões técnicas críticas',
    true
  ),
  (
    'backend_dev',
    'Backend Developer',
    'Desenvolvedor especializado em lógica de servidor e APIs',
    'Implementar APIs, serviços, integrações, banco de dados, garantir segurança e performance do backend',
    true
  ),
  (
    'frontend_dev',
    'Frontend Developer',
    'Desenvolvedor especializado em interfaces de usuário',
    'Implementar interfaces, garantir acessibilidade, performance e experiência do usuário',
    true
  ),
  (
    'fullstack_dev',
    'Fullstack Developer',
    'Desenvolvedor com domínio em frontend e backend',
    'Implementar features completas (frontend + backend), garantir integração end-to-end',
    true
  ),
  (
    'devops',
    'DevOps Engineer',
    'Especialista em infraestrutura, CI/CD e operações',
    'Configurar pipelines, gerenciar infraestrutura, monitoramento, garantir disponibilidade e deploy',
    false
  ),
  (
    'qa',
    'QA Engineer',
    'Especialista em qualidade e testes',
    'Definir estratégia de testes, implementar testes automatizados, garantir qualidade do produto',
    false
  ),
  (
    'ux_designer',
    'UX Designer',
    'Designer de experiência do usuário',
    'Definir fluxos, prototipar, validar usabilidade, garantir experiência consistente',
    false
  ),
  (
    'ui_designer',
    'UI Designer',
    'Designer de interfaces visuais',
    'Criar layouts, definir identidade visual, garantir consistência estética',
    false
  ),
  (
    'product_owner',
    'Product Owner',
    'Responsável por priorização e visão de produto',
    'Definir prioridades, validar valor de negócio, gerenciar backlog, representar stakeholders',
    false
  ),
  (
    'scrum_master',
    'Scrum Master',
    'Facilitador de processos ágeis',
    'Facilitar cerimônias, remover impedimentos, garantir saúde do processo',
    false
  ),
  (
    'data_engineer',
    'Data Engineer',
    'Engenheiro de dados e pipelines',
    'Implementar pipelines de dados, ETL, garantir qualidade e disponibilidade dos dados',
    false
  ),
  (
    'security_engineer',
    'Security Engineer',
    'Especialista em segurança da informação',
    'Revisar código para vulnerabilidades, definir políticas de segurança, responder a incidentes',
    false
  ),
  (
    'tech_writer',
    'Technical Writer',
    'Especialista em documentação técnica',
    'Escrever documentação, manter conhecimento atualizado, garantir clareza para diferentes públicos',
    false
  )
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  responsibilities = EXCLUDED.responsibilities,
  default_active = EXCLUDED.default_active,
  updated_at = NOW();
