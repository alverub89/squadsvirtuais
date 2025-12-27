import './DecisionModal.css'

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

  // Helper to render decision content
  const renderDecisionContent = () => {
    if (!decision.decision) return null

    // If it's an object, try to display it in a structured way
    if (typeof decision.decision === 'object') {
      return (
        <div className="decision-structured">
          {Object.entries(decision.decision).map(([key, value], index) => {
            // Sanitize the key for display
            const sanitizedKey = String(key).replace(/[<>]/g, '')
            
            return (
              <div key={`field-${index}`} className="decision-field">
                <strong className="decision-field-label">{sanitizedKey}:</strong>
                <div className="decision-field-value">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Otherwise display as text
    return <div className="decision-text">{String(decision.decision)}</div>
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
          <div className="decision-meta-info">
            {decision.created_by_role && (
              <div className="decision-meta-item">
                <span className="meta-label">Criado por:</span>
                <span className="meta-value role-badge">{decision.created_by_role}</span>
              </div>
            )}
            {decision.created_at && (
              <div className="decision-meta-item">
                <span className="meta-label">Data:</span>
                <span className="meta-value">{formatDate(decision.created_at)}</span>
              </div>
            )}
          </div>

          <div className="decision-content">
            <h3>Conteúdo da Decisão</h3>
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
