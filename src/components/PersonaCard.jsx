// PersonaCard.jsx - Component for displaying squad personas
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './PersonaCard.css'

export default function PersonaCard({ squadId, workspaceId, onUpdate }) {
  const { token } = useAuth()
  const [personas, setPersonas] = useState([])
  const [availablePersonas, setAvailablePersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('')
  const [contextForm, setContextForm] = useState({
    context_description: '',
    focus: ''
  })

  // Load squad personas
  const loadSquadPersonas = async () => {
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
  }

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
      // Filter out personas already in this squad
      const squadPersonaIds = personas.map(p => p.persona_id)
      const available = data.personas.filter(p => !squadPersonaIds.includes(p.id))
      setAvailablePersonas(available)
    } catch (err) {
      console.error('Error loading available personas:', err)
    }
  }

  // Add persona to squad
  const handleAddPersona = async () => {
    if (!selectedPersona) {
      alert('Selecione uma persona')
      return
    }

    try {
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
            persona_id: selectedPersona,
            context_description: contextForm.context_description,
            focus: contextForm.focus
          })
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao adicionar persona')
      }

      setShowAddForm(false)
      setSelectedPersona('')
      setContextForm({ context_description: '', focus: '' })
      await loadSquadPersonas()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error adding persona:', err)
      alert(err.message)
    }
  }

  // Remove persona from squad
  const handleRemovePersona = async (associationId) => {
    if (!confirm('Tem certeza que deseja remover esta persona da squad?')) {
      return
    }

    try {
      const res = await fetch(
        `/.netlify/functions/squad-personas/${associationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao remover persona')
      }

      await loadSquadPersonas()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error removing persona:', err)
      alert(err.message)
    }
  }

  // Initialize
  useState(() => {
    loadSquadPersonas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId, token])

  if (loading && personas.length === 0) {
    return (
      <div className="persona-card">
        <div className="loading">Carregando personas...</div>
      </div>
    )
  }

  // Type labels
  const typeLabels = {
    'cliente': 'Cliente',
    'stakeholder': 'Stakeholder',
    'membro_squad': 'Membro da Squad'
  }

  return (
    <div className="persona-card">
      <div className="persona-card-header">
        <h2>Personas da Squad</h2>
        <button 
          className="btn-add-persona"
          onClick={() => {
            setShowAddForm(!showAddForm)
            if (!showAddForm) {
              loadAvailablePersonas()
            }
          }}
        >
          {showAddForm ? '✕ Cancelar' : '+ Adicionar Persona'}
        </button>
      </div>

      <p className="persona-guidance">
        Essas personas existem para validar decisões relacionadas a este problema.
      </p>

      {/* Add persona form */}
      {showAddForm && (
        <div className="add-persona-form">
          <div className="form-group">
            <label>Persona do Workspace</label>
            <select 
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="form-select"
            >
              <option value="">Selecione uma persona...</option>
              {availablePersonas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({typeLabels[p.type] || p.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Foco nesta Squad</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: risco, experiência, custo, governança"
              value={contextForm.focus}
              onChange={(e) => setContextForm({ ...contextForm, focus: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Contexto de Atuação</label>
            <textarea
              className="form-textarea"
              placeholder="Explique como essa persona atua neste problema específico..."
              value={contextForm.context_description}
              onChange={(e) => setContextForm({ ...contextForm, context_description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddPersona}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Personas list */}
      {personas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma persona associada ainda.</p>
          <p className="empty-hint">
            Adicione personas para validar decisões e backlog desta squad.
          </p>
        </div>
      ) : (
        <div className="personas-list">
          {personas.map((persona) => (
            <div key={persona.association_id} className="persona-item">
              <div className="persona-header">
                <div className="persona-title-section">
                  <h3>{persona.name}</h3>
                  <div className="persona-badges">
                    <span className="persona-type-badge">
                      {typeLabels[persona.type] || persona.type}
                    </span>
                    {persona.subtype && (
                      <span className="persona-subtype-badge">
                        {persona.subtype}
                      </span>
                    )}
                    {persona.influence_level && (
                      <span className="persona-influence-badge">
                        Influência: {persona.influence_level}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  className="btn-remove-persona"
                  onClick={() => handleRemovePersona(persona.association_id)}
                  title="Remover persona da squad"
                >
                  ✕
                </button>
              </div>

              {persona.focus && (
                <div className="persona-focus">
                  <strong>Foco:</strong> {persona.focus}
                </div>
              )}

              {persona.context_description && (
                <div className="persona-context">
                  {persona.context_description}
                </div>
              )}

              <div className="persona-details">
                {persona.goals && (
                  <div className="persona-detail-item">
                    <strong>Objetivos:</strong>
                    <p>{persona.goals}</p>
                  </div>
                )}
                {persona.pain_points && (
                  <div className="persona-detail-item">
                    <strong>Dores:</strong>
                    <p>{persona.pain_points}</p>
                  </div>
                )}
                {persona.behaviors && (
                  <div className="persona-detail-item">
                    <strong>Comportamentos:</strong>
                    <p>{persona.behaviors}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
