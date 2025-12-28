import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Layout from '../components/Layout'
import './SquadsList.css'

export default function SquadsList() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [squads, setSquads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSquads = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/squads?workspace_id=${workspaceId}`,
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
        throw new Error('Erro ao carregar squads')
      }

      const data = await res.json()
      setSquads(data.squads || [])
    } catch (err) {
      console.error('Error loading squads:', err)
      setError(err.message || 'Erro ao carregar squads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If no workspace ID in URL, redirect to workspaces list
    if (!workspaceId) {
      navigate('/workspaces')
      return
    }

    loadSquads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, token, navigate])

  if (loading) {
    return (
      <Layout>
        <div className="squads-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="squads-container">
          <div className="error">{error}</div>
          <button onClick={() => navigate('/workspaces')} className="btn btn-primary">
            Voltar para Workspaces
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="squads-container">
        <div className="squads-header">
          <div>
            <h1>{activeWorkspace?.name || 'Squads'}</h1>
            {activeWorkspace?.description && (
              <p className="workspace-description">{activeWorkspace.description}</p>
            )}
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/workspaces/${workspaceId}/squads/create`)}
            >
              + Criar Squad
            </button>
          </div>
        </div>

        {squads.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum squad criado ainda neste workspace.</p>
            <p>Crie seu primeiro squad para começar!</p>
          </div>
        ) : (
          <div className="squads-grid">
            {squads.map((squad) => (
              <div 
                key={squad.id} 
                className="squad-card"
                onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squad.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/workspaces/${workspaceId}/squads/${squad.id}`)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View squad ${squad.name}`}
              >
                <div className="squad-icon">
                  {squad.name.charAt(0).toUpperCase()}
                </div>
                <div className="squad-info">
                  <h3>{squad.name}</h3>
                  {squad.description && (
                    <p className="squad-description">{squad.description}</p>
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
