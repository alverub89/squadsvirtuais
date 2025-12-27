import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './SquadValidationMatrix.css'

export default function SquadValidationMatrix() {
  const { workspaceId, squadId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [currentVersion, setCurrentVersion] = useState(null)
  const [currentEntries, setCurrentEntries] = useState([])
  const [squadRoles, setSquadRoles] = useState([])
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // New version state
  const [newEntries, setNewEntries] = useState([])
  const [description, setDescription] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load current validation matrix
      const matrixRes = await fetch(
        `/.netlify/functions/squad-validation-matrix?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!matrixRes.ok) {
        throw new Error('Erro ao carregar matriz de validação')
      }

      const matrixData = await matrixRes.json()
      setCurrentVersion(matrixData.version)
      setCurrentEntries(matrixData.entries || [])

      // Load active squad roles
      const rolesRes = await fetch(
        `/.netlify/functions/squad-roles?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!rolesRes.ok) {
        throw new Error('Erro ao carregar roles da squad')
      }

      const rolesData = await rolesRes.json()
      setSquadRoles(rolesData.roles.filter(r => r.active) || [])

      // Load workspace personas
      const personasRes = await fetch(
        `/.netlify/functions/personas?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!personasRes.ok) {
        throw new Error('Erro ao carregar personas')
      }

      const personasData = await personasRes.json()
      setPersonas(personasData.personas || [])

    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, squadId, token])

  useEffect(() => {
    if (!workspaceId || !squadId) {
      navigate('/workspaces')
      return
    }
    loadData()
  }, [workspaceId, squadId, navigate, loadData])

  const handleAddEntry = () => {
    setNewEntries([
      ...newEntries,
      {
        id: `temp-${Date.now()}`,
        squad_role_id: '',
        persona_id: '',
        checkpoint_type: 'ISSUE',
        requirement_level: 'REQUIRED'
      }
    ])
  }

  const handleUpdateEntry = (id, field, value) => {
    setNewEntries(newEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  const handleRemoveEntry = (id) => {
    setNewEntries(newEntries.filter(entry => entry.id !== id))
  }

  const handleSaveMatrix = async () => {
    if (newEntries.length === 0) {
      alert('Adicione pelo menos uma entrada à matriz')
      return
    }

    // Validate entries
    for (const entry of newEntries) {
      if (!entry.squad_role_id || !entry.persona_id) {
        alert('Todas as entradas devem ter role e persona selecionadas')
        return
      }
    }

    try {
      setSaving(true)

      const res = await fetch('/.netlify/functions/squad-validation-matrix', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          squad_id: squadId,
          description: description || undefined,
          entries: newEntries.map(e => ({
            squad_role_id: e.squad_role_id,
            persona_id: e.persona_id,
            checkpoint_type: e.checkpoint_type,
            requirement_level: e.requirement_level
          }))
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar matriz')
      }

      // Reload data and reset form
      await loadData()
      setNewEntries([])
      setDescription('')
      alert('Matriz de validação salva com sucesso!')

    } catch (err) {
      console.error('Error saving matrix:', err)
      alert(err.message || 'Erro ao salvar matriz')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="validation-matrix-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="validation-matrix-container">
          <div className="error">{error}</div>
          <button 
            onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squadId}`)} 
            className="btn btn-primary"
          >
            Voltar para Squad
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="validation-matrix-container">
        <div className="validation-matrix-header">
          <div>
            <button 
              onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squadId}`)}
              className="btn-back"
            >
              ← Voltar
            </button>
            <h1>Matriz de Validação</h1>
            <p>Configure quais roles validam quais personas em cada checkpoint</p>
          </div>
        </div>

        {/* Current Version */}
        {currentVersion && (
          <section className="matrix-section">
            <h2>
              Versão Atual: v{currentVersion.version}
              {currentVersion.description && (
                <span className="version-description"> — {currentVersion.description}</span>
              )}
            </h2>
            
            {currentEntries.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma entrada na matriz atual.</p>
              </div>
            ) : (
              <div className="matrix-table">
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Persona</th>
                      <th>Checkpoint</th>
                      <th>Obrigatoriedade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEntries.map(entry => (
                      <tr key={entry.id}>
                        <td>
                          <span className="role-name">{entry.role_label}</span>
                          <span className={`role-badge ${entry.role_source}`}>
                            {entry.role_source === 'global' ? 'G' : 'W'}
                          </span>
                        </td>
                        <td>
                          <span className="persona-name">{entry.persona_name}</span>
                          <span className="persona-type">({entry.persona_type})</span>
                        </td>
                        <td>
                          <span className={`checkpoint-badge ${entry.checkpoint_type.toLowerCase()}`}>
                            {entry.checkpoint_type}
                          </span>
                        </td>
                        <td>
                          <span className={`requirement-badge ${entry.requirement_level.toLowerCase()}`}>
                            {entry.requirement_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* New Version Form */}
        <section className="matrix-section">
          <h2>Nova Versão da Matriz</h2>
          
          {squadRoles.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma role ativa nesta squad.</p>
              <p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squadId}/roles`)}
                >
                  Ativar Roles
                </button>
              </p>
            </div>
          ) : personas.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma persona disponível neste workspace.</p>
              <p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/workspaces/${workspaceId}/personas`)}
                >
                  Criar Personas
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Descrição da versão (opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Adicionar validação para Designer UX"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="entries-list">
                {newEntries.map(entry => (
                  <div key={entry.id} className="entry-row">
                    <div className="entry-field">
                      <label>Role</label>
                      <select
                        className="form-control"
                        value={entry.squad_role_id}
                        onChange={(e) => handleUpdateEntry(entry.id, 'squad_role_id', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {squadRoles.map(role => (
                          <option key={role.squad_role_id} value={role.squad_role_id}>
                            {role.label} ({role.source === 'global' ? 'Global' : 'Workspace'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="entry-field">
                      <label>Persona</label>
                      <select
                        className="form-control"
                        value={entry.persona_id}
                        onChange={(e) => handleUpdateEntry(entry.id, 'persona_id', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {personas.map(persona => (
                          <option key={persona.id} value={persona.id}>
                            {persona.name} ({persona.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="entry-field">
                      <label>Checkpoint</label>
                      <select
                        className="form-control"
                        value={entry.checkpoint_type}
                        onChange={(e) => handleUpdateEntry(entry.id, 'checkpoint_type', e.target.value)}
                      >
                        <option value="ISSUE">ISSUE</option>
                        <option value="DECISION">DECISION</option>
                        <option value="PHASE">PHASE</option>
                        <option value="MAP">MAP</option>
                      </select>
                    </div>

                    <div className="entry-field">
                      <label>Obrigatoriedade</label>
                      <select
                        className="form-control"
                        value={entry.requirement_level}
                        onChange={(e) => handleUpdateEntry(entry.id, 'requirement_level', e.target.value)}
                      >
                        <option value="REQUIRED">REQUIRED</option>
                        <option value="OPTIONAL">OPTIONAL</option>
                      </select>
                    </div>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveEntry(entry.id)}
                      title="Remover entrada"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleAddEntry}
                >
                  + Adicionar Entrada
                </button>
                
                {newEntries.length > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveMatrix}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar Nova Versão'}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <div className="info-box">
          <h3>ℹ️ Como Funciona</h3>
          <ul>
            <li><strong>Role:</strong> Especialidade responsável pela validação</li>
            <li><strong>Persona:</strong> Ponto de vista que precisa ser validado</li>
            <li><strong>Checkpoint:</strong> Momento em que a validação acontece (Issue, Decision, Phase, Map)</li>
            <li><strong>REQUIRED:</strong> Validação obrigatória</li>
            <li><strong>OPTIONAL:</strong> Validação opcional/recomendada</li>
          </ul>
          <p className="info-highlight">
            💡 Ao salvar, uma nova versão será criada. Versões antigas nunca são editadas.
          </p>
        </div>
      </div>
    </Layout>
  )
}
