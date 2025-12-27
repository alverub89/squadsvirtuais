import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AIStructureProposalModal.css'

export default function AIStructureProposalModal({ squadId, onClose, onConfirm }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [editedProposal, setEditedProposal] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    generateProposal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId, token])

  const generateProposal = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/.netlify/functions/ai-structure-proposal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ squad_id: squadId })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao gerar proposta')
      }

      const data = await res.json()
      setProposal(data.proposal)
      setEditedProposal(data.proposal.proposal_payload)
    } catch (err) {
      console.error('Error generating proposal:', err)
      setError(err.message || 'Erro ao gerar proposta com IA')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setConfirming(true)

      const res = await fetch(
        `/.netlify/functions/ai-structure-proposal/${proposal.id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            edited_proposal: editedProposal
          })
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao confirmar proposta')
      }

      if (onConfirm) onConfirm()
      onClose()
    } catch (err) {
      console.error('Error confirming proposal:', err)
      alert(err.message || 'Erro ao confirmar proposta')
    } finally {
      setConfirming(false)
    }
  }

  const handleDiscard = async () => {
    if (!confirm('Tem certeza que deseja descartar esta proposta?')) {
      return
    }

    try {
      await fetch(
        `/.netlify/functions/ai-structure-proposal/${proposal.id}/discard`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      onClose()
    } catch (err) {
      console.error('Error discarding proposal:', err)
    }
  }

  const renderWorkflow = () => {
    const workflow = editedProposal.suggested_workflow || []
    
    return (
      <div className="ai-proposal-workflow">
        {workflow.map((step, index) => (
          <div key={index} className="ai-proposal-workflow-step">
            <div className="ai-proposal-workflow-step-header">
              <div className="ai-proposal-workflow-step-number">{step.order}</div>
              <h4 className="ai-proposal-workflow-step-name">{step.name}</h4>
            </div>
            <p className="ai-proposal-workflow-step-description">{step.description}</p>
            {step.key_activities && step.key_activities.length > 0 && (
              <ul className="ai-proposal-workflow-step-activities">
                {step.key_activities.map((activity, idx) => (
                  <li key={idx} className="ai-proposal-workflow-step-activity">
                    {activity}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderRoles = () => {
    const roles = editedProposal.suggested_roles || []
    
    return (
      <div className="ai-proposal-roles">
        {roles.map((role, index) => (
          <div key={index} className="ai-proposal-role-card">
            <h4 className="ai-proposal-role-label">{role.label}</h4>
            <p className="ai-proposal-role-description">{role.description}</p>
            {role.why_needed && (
              <div className="ai-proposal-role-why">
                <span className="ai-proposal-role-why-label">Por que este papel?</span>
                {role.why_needed}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderPersonas = () => {
    const personas = editedProposal.suggested_personas || []
    
    return (
      <div className="ai-proposal-personas">
        {personas.map((persona, index) => (
          <div key={index} className="ai-proposal-persona-card">
            <div className="ai-proposal-persona-header">
              <h4 className="ai-proposal-persona-name">{persona.name}</h4>
              <span className="ai-proposal-persona-type">{persona.type}</span>
            </div>
            <p className="ai-proposal-persona-description">{persona.description}</p>
            <div className="ai-proposal-persona-details">
              {persona.goals && (
                <div className="ai-proposal-persona-detail">
                  <span className="ai-proposal-persona-detail-label">Objetivos</span>
                  <div className="ai-proposal-persona-detail-value">{persona.goals}</div>
                </div>
              )}
              {persona.pain_points && (
                <div className="ai-proposal-persona-detail">
                  <span className="ai-proposal-persona-detail-label">Dores</span>
                  <div className="ai-proposal-persona-detail-value">{persona.pain_points}</div>
                </div>
              )}
            </div>
            {persona.why_relevant && (
              <div className="ai-proposal-persona-why">
                <span className="ai-proposal-persona-why-label">Relevância para o problema:</span>
                {persona.why_relevant}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderJustifications = () => {
    const justifications = editedProposal.justifications || {}
    
    return (
      <div className="ai-proposal-justifications">
        <h4 className="ai-proposal-justifications-title">
          💡 Justificativas da IA
        </h4>
        {justifications.workflow && (
          <div className="ai-proposal-justification">
            <div className="ai-proposal-justification-label">Roteiro</div>
            <p className="ai-proposal-justification-text">{justifications.workflow}</p>
          </div>
        )}
        {justifications.roles && (
          <div className="ai-proposal-justification">
            <div className="ai-proposal-justification-label">Papéis</div>
            <p className="ai-proposal-justification-text">{justifications.roles}</p>
          </div>
        )}
        {justifications.personas && (
          <div className="ai-proposal-justification">
            <div className="ai-proposal-justification-label">Personas</div>
            <p className="ai-proposal-justification-text">{justifications.personas}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ai-proposal-overlay" onClick={(e) => {
      if (e.target.className === 'ai-proposal-overlay') onClose()
    }}>
      <div className="ai-proposal-modal">
        <div className="ai-proposal-header">
          <div className="ai-proposal-header-content">
            <h2 className="ai-proposal-title">
              <span className="ai-proposal-badge">
                <span>✨</span>
                <span>IA</span>
              </span>
              Proposta de Estrutura
            </h2>
            <p className="ai-proposal-subtitle">
              A IA analisou o problema de negócio e gerou uma proposta de trabalho editável
            </p>
          </div>
          <button className="ai-proposal-close" onClick={onClose} aria-label="Fechar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="ai-proposal-body">
          {loading && (
            <div className="ai-proposal-loading">
              <div className="ai-proposal-loading-spinner"></div>
              <p className="ai-proposal-loading-text">
                A IA está analisando o problema e gerando a proposta...
              </p>
            </div>
          )}

          {error && (
            <div className="ai-proposal-error">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {!loading && !error && proposal && editedProposal && (
            <>
              {/* Uncertainties Alert */}
              {proposal.uncertainties && proposal.uncertainties.length > 0 && (
                <div className="ai-proposal-uncertainties">
                  <h4 className="ai-proposal-uncertainties-title">
                    ⚠️ Pontos de Incerteza
                  </h4>
                  <ul className="ai-proposal-uncertainties-list">
                    {proposal.uncertainties.map((uncertainty, index) => (
                      <li key={index} className="ai-proposal-uncertainties-item">
                        {uncertainty}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Workflow Section */}
              <div className="ai-proposal-section">
                <div className="ai-proposal-section-header">
                  <h3 className="ai-proposal-section-title">
                    <span className="ai-proposal-section-icon">🗺️</span>
                    Roteiro de Trabalho
                  </h3>
                </div>
                {renderWorkflow()}
              </div>

              {/* Roles Section */}
              <div className="ai-proposal-section">
                <div className="ai-proposal-section-header">
                  <h3 className="ai-proposal-section-title">
                    <span className="ai-proposal-section-icon">👥</span>
                    Papéis Sugeridos
                  </h3>
                </div>
                {renderRoles()}
              </div>

              {/* Personas Section */}
              <div className="ai-proposal-section">
                <div className="ai-proposal-section-header">
                  <h3 className="ai-proposal-section-title">
                    <span className="ai-proposal-section-icon">🎭</span>
                    Personas Sugeridas
                  </h3>
                </div>
                {renderPersonas()}
              </div>

              {/* Justifications Section */}
              <div className="ai-proposal-section">
                {renderJustifications()}
              </div>
            </>
          )}
        </div>

        {!loading && !error && proposal && (
          <div className="ai-proposal-footer">
            <button
              className="ai-proposal-footer-button ai-proposal-footer-button-danger"
              onClick={handleDiscard}
              disabled={confirming}
            >
              Descartar
            </button>
            <button
              className="ai-proposal-footer-button ai-proposal-footer-button-secondary"
              onClick={onClose}
              disabled={confirming}
            >
              Revisar Depois
            </button>
            <button
              className="ai-proposal-footer-button ai-proposal-footer-button-primary"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? 'Confirmando...' : 'Confirmar Proposta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
