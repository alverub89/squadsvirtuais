import './DecisionModal.css'

// Primary fields to show first (in order) - defined outside component to avoid recreation
const PRIMARY_FIELDS = ['title', 'context', 'narrative', 'options', 'recommendation', 'decision', 'tradeoffs', 'impact']

// Field name translation mapping - defined outside component to avoid recreation
const FIELD_LABELS = {
  title: 'Título',
  context: 'Contexto',
  options: 'Opções Consideradas',
  recommendation: 'Recomendação',
  decision: 'Decisão',
  tradeoffs: 'Trade-offs',
  impact: 'Impacto',
  impacts: 'Impactos',
  narrative: 'Narrativa',
  success_metrics: 'Métricas de Sucesso',
  constraints: 'Restrições',
  why_now: 'Por que Agora',
  what_is_at_risk: 'O que Está em Risco',
  decision_horizon: 'Horizonte de Decisão',
  decision_rules: 'Regras de Decisão',
  non_negotiables: 'Não Negociáveis',
  question: 'Questão',
  why_it_matters: 'Por que Importa',
  how_to_reduce: 'Como Reduzir',
  approach: 'Abordagem',
  responsibilities: 'Responsabilidades',
  signals_to_stop: 'Sinais para Parar',
  signals_of_confidence: 'Sinais de Confiança',
  before: 'Antes',
  after: 'Depois',
  changed_at: 'Alterado em',
  proposal: 'Proposta',
  confirmed_at: 'Confirmado em'
}

export default function DecisionModal({ decision, onClose }) {
  if (!decision) return null

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Data inválida'
      }
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  // Get translated label or capitalize the key
  const getFieldLabel = (key) => {
    if (FIELD_LABELS[key]) {
      return FIELD_LABELS[key]
    }
    // Capitalize and replace underscores with spaces
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Helper to check if a value is empty
  const isEmpty = (value) => {
    if (value === null || value === undefined || value === '') {
      return true
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return true
    }
    return false
  }

  // Helper to render a single field value
  const renderFieldValue = (value) => {
    if (isEmpty(value)) {
      return <span className="empty-field">Campo não preenchido</span>
    }

    if (typeof value === 'object') {
      // Check if it's a nested object with multiple fields
      if (Object.keys(value).length > 0) {
        return (
          <div className="nested-fields">
            {Object.entries(value).map(([nestedKey, nestedValue]) => (
              <div key={`nested-${nestedKey}`} className="nested-field">
                <strong className="nested-field-label">{getFieldLabel(nestedKey)}:</strong>
                <div className="nested-field-value">
                  {renderFieldValue(nestedValue)}
                </div>
              </div>
            ))}
          </div>
        )
      }
      return JSON.stringify(value, null, 2)
    }

    return String(value)
  }

  // Helper to render decision content in organized sections
  const renderDecisionContent = () => {
    if (!decision.decision) {
      return <div className="empty-field">Nenhum conteúdo disponível</div>
    }

    // If it's a simple string, just display it
    if (typeof decision.decision !== 'object') {
      return <div className="decision-text">{String(decision.decision)}</div>
    }

    const decisionData = decision.decision
    const allKeys = Object.keys(decisionData)
    
    // Separate primary fields from other fields
    const primaryToShow = PRIMARY_FIELDS.filter(key => allKeys.includes(key))
    const otherFields = allKeys.filter(key => !PRIMARY_FIELDS.includes(key))

    return (
      <div className="decision-structured">
        {/* Primary fields */}
        {primaryToShow.map((key) => {
          const value = decisionData[key]
          if (isEmpty(value)) return null // Skip empty primary fields
          
          return (
            <div key={key} className="decision-field">
              <div className="decision-field-label">{getFieldLabel(key)}</div>
              <div className="decision-field-value">
                {renderFieldValue(value)}
              </div>
            </div>
          )
        })}

        {/* Other fields */}
        {otherFields.map((key) => {
          const value = decisionData[key]
          if (isEmpty(value)) return null // Skip empty fields
          
          return (
            <div key={key} className="decision-field">
              <div className="decision-field-label">{getFieldLabel(key)}</div>
              <div className="decision-field-value">
                {renderFieldValue(value)}
              </div>
            </div>
          )
        })}

        {/* Show message if all fields are empty */}
        {allKeys.every(key => isEmpty(decisionData[key])) && (
          <div className="empty-field">Todos os campos estão vazios</div>
        )}
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{decision.title}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Meta information section */}
          <div className="decision-meta-info">
            {/* User who made the decision */}
            {(decision.created_by_user_name || decision.created_by_user_email) && (
              <div className="decision-meta-item">
                <span className="meta-label">Decisão tomada por:</span>
                <span className="meta-value">
                  {decision.created_by_user_name || decision.created_by_user_email}
                </span>
              </div>
            )}
            
            {/* Role */}
            {decision.created_by_role && (
              <div className="decision-meta-item">
                <span className="meta-label">Papel:</span>
                <span className="meta-value role-badge">{decision.created_by_role}</span>
              </div>
            )}
            
            {/* Date */}
            {decision.created_at && (
              <div className="decision-meta-item">
                <span className="meta-label">Quando foi decidido:</span>
                <span className="meta-value">{formatDate(decision.created_at)}</span>
              </div>
            )}
            
            {/* Updated date if different from created */}
            {decision.updated_at && decision.updated_at !== decision.created_at && (
              <div className="decision-meta-item">
                <span className="meta-label">Última atualização:</span>
                <span className="meta-value">{formatDate(decision.updated_at)}</span>
              </div>
            )}
          </div>

          {/* Decision content section */}
          <div className="decision-content">
            <h3>Detalhes da Decisão</h3>
            {renderDecisionContent()}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
