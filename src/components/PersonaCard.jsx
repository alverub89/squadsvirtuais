import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './PersonaCard.css'

export default function PersonaCard({ squadId, workspaceId, onUpdate }) {
  const { token } = useAuth()
  const [personas, setPersonas] = useState([])
  const [availablePersonas, setAvailablePersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllModal, setShowAllModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('')
  const [adding, setAdding] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [contextForm, setContextForm] = useState({
    context_description: '',
    focus: ''
  })

  // Load squad personas
  const loadSquadPersonas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/squad-personas?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao carregar personas da squad')
      }

      const data = await res.json()
      setPersonas(data.personas || [])
    } catch (err) {
      console.error('Error loading squad personas:', err)
    } finally {
      setLoading(false)
    }
  }, [squadId, token])

  // Load available workspace personas
  const loadAvailablePersonas = async () => {
    try {
      const res = await fetch(
        `/.netlify/functions/personas?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao carregar personas do workspace')
      }

      const data = await res.json()
      // Filter out personas already in this squad and inactive personas
      const squadPersonaIds = new Set(personas.map(p => p.persona_id))
      const available = data.personas.filter(p => 
        !squadPersonaIds.has(p.id) && (p.active !== false)
      )
      setAvailablePersonas(available)
    } catch (err) {
      console.error('Error loading available personas:', err)
    }
  }

  const openAddModal = async () => {
    await loadAvailablePersonas()
    setShowAddModal(true)
  }

  // Add persona to squad
  const handleAddPersona = async (persona) => {
    try {
      setAdding(persona.id)
      
      const res = await fetch(
        '/.netlify/functions/squad-personas',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            squad_id: squadId,
            persona_id: persona.id,
            context_description: contextForm.context_description,
            focus: contextForm.focus
          })
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao adicionar persona')
      }

      await loadSquadPersonas()
      if (onUpdate) onUpdate()
      
      // Refresh available personas list
      await loadAvailablePersonas()
    } catch (err) {
      console.error('Error adding persona:', err)
      alert(err.message || 'Erro ao adicionar persona')
    } finally {
      setAdding(null)
    }
  }

  // Remove persona from squad
  const handleRemovePersona = async (persona) => {
    setConfirmRemove(null)
    
    try {
      setRemoving(persona.association_id)
      
      const res = await fetch(
        `/.netlify/functions/squad-personas/${persona.association_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover persona')
      }

      await loadSquadPersonas()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error removing persona:', err)
      alert(err.message || 'Erro ao remover persona')
    } finally {
      setRemoving(null)
    }
  }

  const confirmRemovePersona = (persona) => {
    setConfirmRemove(persona)
  }

  // Initialize
  useEffect(() => {
    loadSquadPersonas()
  }, [loadSquadPersonas])

  // Helper function to get persona source display
  const getPersonaSource = (persona) => {
    const source = persona.source || 'workspace'
    return {
      value: source,
      label: source === 'global' ? 'Global' : 'Workspace'
    }
  }

  if (loading) {
    return (
      <div className="persona-card">
        <div className="persona-card-header">
          <h2>Personas da Squad</h2>
        </div>
        <div className="persona-loading">Carregando...</div>
      </div>
    )
  }

  // Type labels
  const typeLabels = {
    'cliente': 'Cliente',
    'stakeholder': 'Stakeholder',
    'membro_squad': 'Membro da Squad'
  }

  // Get top 3 personas for display
  const topPersonas = personas.slice(0, 3)
  const hasMore = personas.length > 3

  return (
    <>
      <div className="persona-card">
        <div className="persona-card-header">
          <h2>Personas da Squad</h2>
          <div className="persona-card-actions">
            <button 
              className="btn-link"
              onClick={openAddModal}
              title="Adicionar persona existente"
            >
              + Adicionar
            </button>
          </div>
        </div>
        
        {personas.length === 0 ? (
          <p className="persona-empty-text">Nenhuma persona associada</p>
        ) : (
          <>
            <div className="persona-list">
              {topPersonas.map((persona) => (
                <div key={persona.association_id} className="persona-item">
                  <div className="persona-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="persona-info">
                    <div className="persona-name">{persona.name}</div>
                    <div className="persona-meta">
                      <span className={`persona-source ${getPersonaSource(persona).value}`}>
                        {getPersonaSource(persona).label}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-remove-persona"
                    onClick={() => confirmRemovePersona(persona)}
                    disabled={removing === persona.association_id}
                    title="Remover persona da squad"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {hasMore && (
              <button 
                className="btn-view-all"
                onClick={() => setShowAllModal(true)}
              >
                Ver todos ({personas.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal: View All Personas */}
      {showAllModal && (
        <div className="modal-overlay" onClick={() => setShowAllModal(false)}>
          <div className="modal-content persona-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Todas as Personas da Squad</h2>
              <button className="btn-close" onClick={() => setShowAllModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {personas.length === 0 ? (
                <p className="persona-empty-text">Nenhuma persona associada</p>
              ) : (
                <div className="persona-list-full">
                  {personas.map((persona) => (
                    <div key={persona.association_id} className="persona-item-full">
                      <div className="persona-item-header">
                        <div className="persona-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="persona-info">
                          <div className="persona-name">{persona.name}</div>
                          <span className={`persona-source ${getPersonaSource(persona).value}`}>
                            {getPersonaSource(persona).label}
                          </span>
                        </div>
                        <button
                          className="btn-remove-persona"
                          onClick={() => confirmRemovePersona(persona)}
                          disabled={removing === persona.association_id}
                          title="Remover persona da squad"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      {persona.focus && (
                        <div className="persona-focus-full">
                          <strong>Foco:</strong> {persona.focus}
                        </div>
                      )}
                      {persona.context_description && (
                        <p className="persona-description">{persona.context_description}</p>
                      )}
                      {(persona.goals || persona.pain_points || persona.behaviors) && (
                        <div className="persona-details-full">
                          {persona.goals && (
                            <div className="persona-detail-section">
                              <strong>Objetivos:</strong>
                              <p>{persona.goals}</p>
                            </div>
                          )}
                          {persona.pain_points && (
                            <div className="persona-detail-section">
                              <strong>Dores:</strong>
                              <p>{persona.pain_points}</p>
                            </div>
                          )}
                          {persona.behaviors && (
                            <div className="persona-detail-section">
                              <strong>Comportamentos:</strong>
                              <p>{persona.behaviors}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAllModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Persona */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content persona-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionar Persona à Squad</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {availablePersonas.length === 0 ? (
                <p className="persona-empty-text">
                  Todas as personas disponíveis já estão associadas a esta squad.
                </p>
              ) : (
                <div className="persona-list-full">
                  {availablePersonas.map((persona) => (
                    <div key={persona.id} className="persona-item-full persona-item-add">
                      <div className="persona-item-header">
                        <div className="persona-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="persona-info">
                          <div className="persona-name">{persona.name}</div>
                          <span className={`persona-source ${getPersonaSource(persona).value}`}>
                            {getPersonaSource(persona).label}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm btn-add-persona"
                        onClick={() => handleAddPersona(persona)}
                        disabled={adding === persona.id}
                      >
                        {adding === persona.id ? 'Adicionando...' : 'Adicionar'}
                      </button>
                      {persona.goals && (
                        <p className="persona-description">{persona.goals}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Remove Persona */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remover Persona da Squad</h2>
              <button className="btn-close" onClick={() => setConfirmRemove(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Tem certeza que deseja remover a persona <strong>{confirmRemove.name}</strong> desta squad?
              </p>
              <p className="confirm-note">
                ⚠️ <strong>Nota:</strong> Apenas o vínculo com esta squad será removido. 
                A persona continuará disponível no sistema e em outras squads.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setConfirmRemove(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleRemovePersona(confirmRemove)}
                disabled={removing === confirmRemove.association_id}
              >
                {removing === confirmRemove.association_id ? 'Removendo...' : 'Remover Vínculo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
