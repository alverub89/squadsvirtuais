import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './SquadRoles.css'

export default function SquadRoles() {
  const { workspaceId, squadId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [availableRoles, setAvailableRoles] = useState([])
  const [squadRoles, setSquadRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activating, setActivating] = useState(null)
  const [editingRole, setEditingRole] = useState(null)
  const [editFormData, setEditFormData] = useState({ name: '', description: '' })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load available roles (global + workspace)
      const rolesRes = await fetch(
        `/.netlify/functions/roles?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!rolesRes.ok) {
        throw new Error('Erro ao carregar roles disponíveis')
      }

      const rolesData = await rolesRes.json()
      setAvailableRoles(rolesData.roles || [])

      // Load squad roles
      const squadRolesRes = await fetch(
        `/.netlify/functions/squad-roles?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!squadRolesRes.ok) {
        throw new Error('Erro ao carregar roles da squad')
      }

      const squadRolesData = await squadRolesRes.json()
      setSquadRoles(squadRolesData.roles || [])

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

  const handleActivateRole = async (role) => {
    try {
      setActivating(role.id)
      
      const body = {
        squad_id: squadId,
        role_id: role.source === 'global' ? role.id : null,
        workspace_role_id: role.source === 'workspace' ? role.id : null
      }

      const res = await fetch('/.netlify/functions/squad-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao ativar role')
      }

      await loadData()
    } catch (err) {
      console.error('Error activating role:', err)
      alert(err.message || 'Erro ao ativar role')
    } finally {
      setActivating(null)
    }
  }

  const handleToggleRole = async (squadRole) => {
    try {
      setActivating(squadRole.squad_role_id)
      
      const res = await fetch(`/.netlify/functions/squad-roles/${squadRole.squad_role_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          active: !squadRole.active
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar role')
      }

      await loadData()
    } catch (err) {
      console.error('Error toggling role:', err)
      alert(err.message || 'Erro ao atualizar role')
    } finally {
      setActivating(null)
    }
  }

  const handleStartEdit = (squadRole) => {
    setEditingRole(squadRole.squad_role_id)
    setEditFormData({
      name: squadRole.custom_name || '',
      description: squadRole.custom_description || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingRole(null)
    setEditFormData({ name: '', description: '' })
  }

  const handleSaveEdit = async (squadRoleId) => {
    try {
      setActivating(squadRoleId)
      
      const res = await fetch(`/.netlify/functions/squad-roles/${squadRoleId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editFormData.name.trim() || null,
          description: editFormData.description.trim() || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar role')
      }

      setEditingRole(null)
      setEditFormData({ name: '', description: '' })
      await loadData()
    } catch (err) {
      console.error('Error updating role:', err)
      alert(err.message || 'Erro ao atualizar role')
    } finally {
      setActivating(null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="squad-roles-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="squad-roles-container">
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

  // Get IDs of roles already active in squad
  const activeRoleIds = squadRoles
    .filter(sr => sr.active)
    .map(sr => sr.role_id)

  // Filter available roles to show only those not yet active
  const rolesToActivate = availableRoles.filter(
    role => !activeRoleIds.includes(role.id)
  )

  return (
    <Layout>
      <div className="squad-roles-container">
        <div className="squad-roles-header">
          <div>
            <button 
              onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squadId}`)}
              className="btn-back"
            >
              ← Voltar
            </button>
            <h1>Roles da Squad</h1>
            <p>Configure quais especialidades estão ativas nesta squad</p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/workspaces/${workspaceId}/roles`)}
          >
            Gerenciar Roles
          </button>
        </div>

        {/* Active Squad Roles */}
        <section className="roles-section">
          <h2>Roles Ativas</h2>
          {squadRoles.filter(sr => sr.active).length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma role ativa nesta squad.</p>
              <p>Ative roles abaixo para começar.</p>
            </div>
          ) : (
            <div className="roles-grid">
              {squadRoles.filter(sr => sr.active).map(squadRole => (
                <div key={squadRole.squad_role_id} className="role-card active">
                  {editingRole === squadRole.squad_role_id ? (
                    // Edit mode
                    <div className="role-edit-form">
                      <div className="form-group">
                        <label htmlFor={`name-${squadRole.squad_role_id}`}>
                          Nome Customizado
                          {!editFormData.name.trim() && (
                            <span className="label-hint"> (vazio = usar padrão: {squadRole.label})</span>
                          )}
                        </label>
                        <input
                          type="text"
                          id={`name-${squadRole.squad_role_id}`}
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          placeholder={squadRole.label}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`description-${squadRole.squad_role_id}`}>
                          Descrição Customizada
                          {!editFormData.description.trim() && (
                            <span className="label-hint"> (vazio = usar padrão)</span>
                          )}
                        </label>
                        <textarea
                          id={`description-${squadRole.squad_role_id}`}
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          placeholder="Descrição personalizada para esta role na squad"
                          rows="4"
                          className="form-textarea"
                        />
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveEdit(squadRole.squad_role_id)}
                          disabled={activating === squadRole.squad_role_id}
                        >
                          {activating === squadRole.squad_role_id ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={handleCancelEdit}
                          disabled={activating === squadRole.squad_role_id}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <>
                      <div className="role-header">
                        <h3>
                          {squadRole.name}
                          {squadRole.custom_name && (
                            <span className="custom-indicator" title="Nome customizado para esta squad">
                              ✏️
                            </span>
                          )}
                        </h3>
                        <span className={`role-badge ${squadRole.source}`}>
                          {squadRole.source === 'global' ? 'Global' : 'Workspace'}
                        </span>
                      </div>
                      {squadRole.description && (
                        <p className="role-description">
                          {squadRole.description}
                          {squadRole.custom_description && (
                            <span className="custom-indicator" title="Descrição customizada para esta squad">
                              {' ✏️'}
                            </span>
                          )}
                        </p>
                      )}
                      {squadRole.responsibilities && (
                        <div className="role-responsibilities">
                          <strong>Responsabilidades:</strong>
                          <p>{squadRole.responsibilities}</p>
                        </div>
                      )}
                      <div className="role-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStartEdit(squadRole)}
                        >
                          Customizar
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleRole(squadRole)}
                          disabled={activating === squadRole.squad_role_id}
                        >
                          {activating === squadRole.squad_role_id ? 'Desativando...' : 'Desativar'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Available Roles to Activate */}
        <section className="roles-section">
          <h2>Roles Disponíveis</h2>
          {rolesToActivate.length === 0 ? (
            <div className="empty-state">
              <p>Todas as roles disponíveis já estão ativas.</p>
            </div>
          ) : (
            <div className="roles-grid">
              {rolesToActivate.map(role => (
                <div key={role.id} className="role-card">
                  <div className="role-header">
                    <h3>{role.label}</h3>
                    <span className={`role-badge ${role.source}`}>
                      {role.source === 'global' ? 'Global' : 'Workspace'}
                    </span>
                  </div>
                  {role.description && (
                    <p className="role-description">{role.description}</p>
                  )}
                  {role.responsibilities && (
                    <div className="role-responsibilities">
                      <strong>Responsabilidades:</strong>
                      <p>{role.responsibilities}</p>
                    </div>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleActivateRole(role)}
                    disabled={activating === role.id}
                  >
                    {activating === role.id ? 'Ativando...' : 'Ativar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inactive Squad Roles */}
        {squadRoles.filter(sr => !sr.active).length > 0 && (
          <section className="roles-section">
            <h2>Roles Desativadas</h2>
            <div className="roles-grid">
              {squadRoles.filter(sr => !sr.active).map(squadRole => (
                <div key={squadRole.squad_role_id} className="role-card inactive">
                  <div className="role-header">
                    <h3>{squadRole.label}</h3>
                    <span className={`role-badge ${squadRole.source}`}>
                      {squadRole.source === 'global' ? 'Global' : 'Workspace'}
                    </span>
                  </div>
                  {squadRole.description && (
                    <p className="role-description">{squadRole.description}</p>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleToggleRole(squadRole)}
                    disabled={activating === squadRole.squad_role_id}
                  >
                    {activating === squadRole.squad_role_id ? 'Reativando...' : 'Reativar'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
