import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './SuggestionApprovalModal.css'

export default function SuggestionApprovalModal({ 
  suggestion, 
  onApprove, 
  onReject, 
  onClose,
  children 
}) {
  const { token } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState(null)

  const handleApprove = async (editedPayload = null) => {
    try {
      setProcessing(true)
      setError(null)

      const res = await fetch(
        `/.netlify/functions/suggestion-approvals/${suggestion.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            edited_payload: editedPayload
          })
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao aprovar sugestão')
      }

      if (onApprove) onApprove(suggestion.id, editedPayload)
      if (onClose) onClose()
    } catch (err) {
      console.error('Error approving suggestion:', err)
      setError(err.message || 'Erro ao aprovar sugestão')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    try {
      setProcessing(true)
      setError(null)

      const res = await fetch(
        `/.netlify/functions/suggestion-approvals/${suggestion.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: rejectReason.trim() || null
          })
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao rejeitar sugestão')
      }

      // Close the rejection modal and return to the previous flow
      setShowRejectReason(false)
      if (onReject) onReject(suggestion.id, rejectReason)
      if (onClose) onClose()
    } catch (err) {
      console.error('Error rejecting suggestion:', err)
      setError(err.message || 'Erro ao rejeitar sugestão')
    } finally {
      setProcessing(false)
    }
  }

  const getSuggestionTypeLabel = (type) => {
    const labels = {
      'decision_context': 'Contexto de Decisão',
      'problem_maturity': 'Maturidade do Problema',
      'persona': 'Persona',
      'governance': 'Governança',
      'squad_structure_role': 'Papel da Squad',
      'phase': 'Fases do Roteiro',
      'critical_unknown': 'Incerteza Crítica',
      'execution_model': 'Modelo de Execução',
      'validation_strategy': 'Estratégia de Validação',
      'readiness_assessment': 'Avaliação de Prontidão'
    }
    return labels[type] || type
  }

  if (showRejectReason) {
    return (
      <div className="suggestion-modal-overlay" onClick={(e) => {
        if (e.target.className === 'suggestion-modal-overlay') {
          setShowRejectReason(false)
        }
      }}>
        <div className="suggestion-modal reject-reason-modal">
          <div className="suggestion-modal-header">
            <h2>Rejeitar Sugestão</h2>
            <button 
              className="suggestion-modal-close" 
              onClick={() => setShowRejectReason(false)}
              aria-label="Voltar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="suggestion-modal-body">
            <p className="reject-reason-prompt">
              Por que você está rejeitando esta sugestão? (opcional)
            </p>
            <textarea
              className="reject-reason-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva brevemente o motivo da rejeição..."
              rows="4"
            />
          </div>
          <div className="suggestion-modal-footer">
            <button
              className="suggestion-modal-button suggestion-modal-button-secondary"
              onClick={() => setShowRejectReason(false)}
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              className="suggestion-modal-button suggestion-modal-button-danger"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="suggestion-modal-overlay" onClick={(e) => {
      if (e.target.className === 'suggestion-modal-overlay') onClose()
    }}>
      <div className="suggestion-modal">
        <div className="suggestion-modal-header">
          <div className="suggestion-modal-header-content">
            <h2 className="suggestion-modal-title">
              <span className="suggestion-modal-badge">
                <span>✨</span>
                <span>IA</span>
              </span>
              {getSuggestionTypeLabel(suggestion.type)}
            </h2>
            <p className="suggestion-modal-subtitle">
              Revise a sugestão da IA e decida se deseja aprovar, ajustar ou rejeitar
            </p>
          </div>
          <button 
            className="suggestion-modal-close" 
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="suggestion-modal-body">
          {error && (
            <div className="suggestion-modal-error">
              <strong>Erro:</strong> {error}
            </div>
          )}

          <div className="suggestion-modal-info-box">
            <div className="suggestion-modal-info-icon">ℹ️</div>
            <div className="suggestion-modal-info-content">
              <strong>O que acontece ao aprovar?</strong>
              <p>Esta sugestão será persistida no banco de dados e passará a fazer parte da configuração da squad. Um registro de decisão será criado automaticamente.</p>
            </div>
          </div>

          {children}
        </div>

        <div className="suggestion-modal-footer">
          <button
            className="suggestion-modal-button suggestion-modal-button-danger"
            onClick={() => setShowRejectReason(true)}
            disabled={processing}
          >
            Rejeitar
          </button>
          <button
            className="suggestion-modal-button suggestion-modal-button-secondary"
            onClick={onClose}
            disabled={processing}
          >
            Revisar Depois
          </button>
          <button
            className="suggestion-modal-button suggestion-modal-button-primary"
            onClick={() => handleApprove()}
            disabled={processing}
          >
            {processing ? 'Aprovando...' : 'Aprovar'}
          </button>
        </div>
      </div>
    </div>
  )
}
