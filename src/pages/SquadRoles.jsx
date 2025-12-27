import { useState, useEffect } from 'react'
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

  const loadData = async () => {
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
  }

  useEffect(() => {
    if (!workspaceId || !squadId) {
      navigate('/workspaces')
      return
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, squadId, token, navigate])

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
      
      const res = await fetch(`/.netlify/functions/squad-roles`, {
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
                  <div className="role-header">
                    <h3>{squadRole.label}</h3>
                    <span className={`role-badge ${squadRole.source}`}>
                      {squadRole.source === 'global' ? 'Global' : 'Workspace'}
                    </span>
                  </div>
                  {squadRole.description && (
                    <p className="role-description">{squadRole.description}</p>
                  )}
                  {squadRole.responsibilities && (
                    <div className="role-responsibilities">
                      <strong>Responsabilidades:</strong>
                      <p>{squadRole.responsibilities}</p>
                    </div>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleRole(squadRole)}
                    disabled={activating === squadRole.squad_role_id}
                  >
                    {activating === squadRole.squad_role_id ? 'Desativando...' : 'Desativar'}
                  </button>
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
