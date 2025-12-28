import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './PersonasList.css'

export default function PersonasList() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('todos')

  const loadPersonas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/personas?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Você não tem acesso a este workspace')
        }
        throw new Error('Erro ao carregar personas')
      }

      const data = await res.json()
      setPersonas(data.personas || [])
    } catch (err) {
      console.error('Error loading personas:', err)
      setError(err.message || 'Erro ao carregar personas')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, token])

  useEffect(() => {
    // If no workspace ID in URL, redirect to workspaces list
    if (!workspaceId) {
      navigate('/workspaces')
      return
    }

    loadPersonas()
  }, [workspaceId, navigate, loadPersonas])

  // Toggle persona active state
  const handleTogglePersona = async (personaId, currentActive) => {
    try {
      const res = await fetch(
        `/.netlify/functions/personas/${personaId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            active: !currentActive
          })
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao atualizar persona')
      }

      // Reload personas
      await loadPersonas()
    } catch (err) {
      console.error('Error toggling persona:', err)
      alert(err.message)
    }
  }

  // Type labels mapping
  const typeLabels = {
    'cliente': 'Usuário',
    'stakeholder': 'Stakeholder',
    'membro_squad': 'Técnico'
  }

  // Filter personas based on active filter
  const getFilteredPersonas = () => {
    if (activeFilter === 'todos') {
      return personas
    }
    return personas.filter(p => p.type === activeFilter)
  }

  // Count personas by type
  const getPersonaCount = (type) => {
    if (type === 'todos') return personas.length
    return personas.filter(p => p.type === type).length
  }

  if (loading) {
    return (
      <Layout>
        <div className="personas-page-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="personas-page-container">
          <div className="error">{error}</div>
          <button onClick={() => navigate('/workspaces')} className="btn btn-primary">
            Voltar para Workspaces
          </button>
        </div>
      </Layout>
    )
  }

  const filteredPersonas = getFilteredPersonas()

  return (
    <Layout>
      <div className="personas-page-container">
        <div className="personas-page-header">
          <h1>Personas Digitais</h1>
          <p className="personas-subtitle">Personas que validam as decisões do produto</p>
          <button 
            className="btn btn-primary btn-large"
            onClick={() => navigate(`/workspaces/${workspaceId}/personas/create`)}
          >
            + Nova Persona
          </button>
        </div>

        {/* Filter tabs */}
        <div className="personas-filters">
          <button 
            className={`filter-tab ${activeFilter === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveFilter('todos')}
          >
            Todos ({getPersonaCount('todos')})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'cliente' ? 'active' : ''}`}
            onClick={() => setActiveFilter('cliente')}
          >
            Usuário ({getPersonaCount('cliente')})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'stakeholder' ? 'active' : ''}`}
            onClick={() => setActiveFilter('stakeholder')}
          >
            Stakeholder ({getPersonaCount('stakeholder')})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'membro_squad' ? 'active' : ''}`}
            onClick={() => setActiveFilter('membro_squad')}
          >
            Técnico ({getPersonaCount('membro_squad')})
          </button>
        </div>

        {filteredPersonas.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma persona encontrada neste workspace.</p>
            <p>Crie sua primeira persona para começar!</p>
          </div>
        ) : (
          <div className="personas-grid">
            {filteredPersonas.map((persona) => (
              <div 
                key={persona.id} 
                className={`persona-card-item ${!persona.active ? 'inactive' : ''}`}
                onClick={() => navigate(`/workspaces/${workspaceId}/personas/${persona.id}/edit`)}
              >
                <div className="persona-card-header-row">
                  <div className="persona-icon">
                    {persona.type === 'cliente' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                    {persona.type === 'stakeholder' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18" />
                      </svg>
                    )}
                    {persona.type === 'membro_squad' && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    )}
                  </div>
                  <div className="persona-toggle">
                    <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={persona.active}
                        onChange={() => handleTogglePersona(persona.id, persona.active)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="persona-card-content">
                  <h3>{persona.name}</h3>
                  <div className="persona-type-label">
                    {typeLabels[persona.type] || persona.type}
                  </div>

                  {persona.goals && (
                    <p className="persona-description">{persona.goals}</p>
                  )}

                  {/* Show squad count if available */}
                  {typeof persona.squad_count === 'number' && persona.squad_count > 0 && (
                    <div className="persona-squad-count">
                      Usado em {persona.squad_count} {persona.squad_count === 1 ? 'squad' : 'squads'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
