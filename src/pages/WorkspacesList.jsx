import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Layout from '../components/Layout'
import './WorkspacesList.css'

export default function WorkspacesList() {
  const { token } = useAuth()
  const { selectWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: ''
  })
  const [formError, setFormError] = useState(null)

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      const res = await fetch('/.netlify/functions/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Erro ao carregar workspaces')
      }

      const data = await res.json()
      setWorkspaces(data.workspaces || [])
    } catch (err) {
      console.error('Error loading workspaces:', err)
      setError('Erro ao carregar workspaces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleCreateWorkspace(e) {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setFormError('Nome do workspace é obrigatório')
      return
    }

    try {
      setCreating(true)
      setFormError(null)
      const res = await fetch('/.netlify/functions/workspaces-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Erro ao criar workspace')
      }

      const data = await res.json()
      
      if (data.ok && data.workspace) {
        // Select the new workspace and navigate to squads
        selectWorkspace(data.workspace)
        navigate(`/workspaces/${data.workspace.id}/squads`)
      }
    } catch (err) {
      console.error('Error creating workspace:', err)
      setFormError('Erro ao criar workspace. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  function handleWorkspaceClick(workspace) {
    selectWorkspace(workspace)
    navigate(`/workspaces/${workspace.id}/squads`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="workspaces-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="workspaces-container">
          <div className="error">{error}</div>
          <button onClick={loadWorkspaces} className="btn btn-primary">
            Tentar novamente
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="workspaces-container">
        <div className="workspaces-header">
          <h1>Seus Workspaces</h1>
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="btn btn-primary"
          >
            + Criar Workspace
          </button>
        </div>

        {showCreateForm && (
          <div className="modal-overlay" onClick={() => !creating && setShowCreateForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Criar Novo Workspace</h2>
              
              {formError && (
                <div className="error-message" style={{
                  backgroundColor: '#fee',
                  border: '1px solid #c33',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#c33',
                  fontSize: '14px'
                }}>
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleCreateWorkspace}>
                <div className="form-group">
                  <label htmlFor="name">Nome *</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do workspace"
                    required
                    disabled={creating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Descrição</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição curta (opcional)"
                    rows="3"
                    disabled={creating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Tipo</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={creating}
                  >
                    <option value="">Selecione (opcional)</option>
                    <option value="Produto">Produto</option>
                    <option value="Cliente">Cliente</option>
                    <option value="Experimento">Experimento</option>
                    <option value="Interno">Interno</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateForm(false)}
                    className="btn btn-secondary"
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {workspaces.length === 0 ? (
          <div className="empty-state">
            <p>Você ainda não tem workspaces.</p>
            <p>Crie seu primeiro workspace para começar!</p>
          </div>
        ) : (
          <div className="workspaces-grid">
            {workspaces.map((workspace) => (
              <div 
                key={workspace.id} 
                className="workspace-card"
                onClick={() => handleWorkspaceClick(workspace)}
              >
                <div className="workspace-icon">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="workspace-info">
                  <h3>{workspace.name}</h3>
                  {workspace.type && (
                    <span className="workspace-type">{workspace.type}</span>
                  )}
                  {workspace.description && (
                    <p className="workspace-description">{workspace.description}</p>
                  )}
                  <div className="workspace-stats">
                    <span>{workspace.squad_count || 0} squads</span>
                    <span>•</span>
                    <span>{workspace.member_count || 0} membros</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
