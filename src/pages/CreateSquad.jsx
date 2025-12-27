import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Layout from '../components/Layout'
import './CreateSquad.css'

export default function CreateSquad() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Nome da squad é obrigatório')
      return
    }

    try {
      setCreating(true)
      setError(null)
      
      const res = await fetch('/.netlify/functions/squads-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: formData.name,
          description: formData.description
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar squad')
      }

      const data = await res.json()
      
      if (data.ok && data.squad) {
        // Navigate back to squads list
        navigate(`/workspaces/${workspaceId}/squads`)
      }
    } catch (err) {
      console.error('Error creating squad:', err)
      setError(err.message || 'Erro ao criar squad. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  function handleCancel() {
    navigate(`/workspaces/${workspaceId}/squads`)
  }

  return (
    <Layout>
      <div className="create-squad-container">
        <div className="create-squad-content">
          <div className="page-header">
            <div className="context-info">
              <span className="context-label">Workspace</span>
              <h2 className="context-value">{activeWorkspace?.name || 'Carregando...'}</h2>
            </div>
          </div>

          <div className="form-card">
            <h1>Criar Squad</h1>
            <p className="form-description">
              Uma squad organiza o método completo: problema de negócio, personas, fases e backlog.
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nome da squad</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Onboarding de Usuários"
                  required
                  disabled={creating}
                  autoFocus
                />
                <span className="field-hint">
                  Use um nome claro que identifique o propósito da squad.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do objetivo desta squad (opcional)"
                  rows="4"
                  disabled={creating}
                />
                <span className="field-hint">
                  Ajuda você e sua equipe a lembrar o contexto desta squad.
                </span>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancel}
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
                  {creating ? 'Criando squad...' : 'Criar squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
