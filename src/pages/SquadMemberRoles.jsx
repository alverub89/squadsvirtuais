import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './SquadMemberRoles.css'

export default function SquadMemberRoles() {
  const { workspaceId, squadId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [squadRoles, setSquadRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assigning, setAssigning] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load squad members
      const membersRes = await fetch(
        `/.netlify/functions/squads-detail?id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!membersRes.ok) {
        throw new Error('Erro ao carregar membros')
      }

      const membersData = await membersRes.json()
      const squadMembers = membersData.squad?.members || []
      setMembers(squadMembers.filter(m => m.active))

      // Load member role assignments
      const assignmentsRes = await fetch(
        `/.netlify/functions/squad-member-roles?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!assignmentsRes.ok) {
        throw new Error('Erro ao carregar atribuições de roles')
      }

      const assignmentsData = await assignmentsRes.json()
      setAssignments(assignmentsData.assignments || [])

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

  const handleAssignRole = async (memberId, squadRoleId) => {
    try {
      setAssigning(memberId)
      
      const res = await fetch('/.netlify/functions/squad-member-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          squad_member_id: memberId,
          squad_role_id: squadRoleId,
          action: 'assign'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atribuir role')
      }

      await loadData()
    } catch (err) {
      console.error('Error assigning role:', err)
      alert(err.message || 'Erro ao atribuir role')
    } finally {
      setAssigning(null)
    }
  }

  const handleUnassignRole = async (memberId) => {
    try {
      setAssigning(memberId)
      
      const res = await fetch('/.netlify/functions/squad-member-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          squad_member_id: memberId,
          action: 'unassign'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover role')
      }

      await loadData()
    } catch (err) {
      console.error('Error unassigning role:', err)
      alert(err.message || 'Erro ao remover role')
    } finally {
      setAssigning(null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="squad-member-roles-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="squad-member-roles-container">
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

  // Create a map of user_id to assignment
  const assignmentsByUserId = {}
  assignments.forEach(assignment => {
    assignmentsByUserId[assignment.user_id] = assignment
  })

  return (
    <Layout>
      <div className="squad-member-roles-container">
        <div className="squad-member-roles-header">
          <div>
            <button 
              onClick={() => navigate(`/workspaces/${workspaceId}/squads/${squadId}`)}
              className="btn-back"
            >
              ← Voltar
            </button>
            <h1>Atribuição de Roles</h1>
            <p>Defina qual especialidade cada membro possui nesta squad</p>
          </div>
        </div>

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
        ) : members.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum membro na squad ainda.</p>
          </div>
        ) : (
          <div className="members-list">
            {members.map(member => {
              const assignment = assignmentsByUserId[member.user_id]
              
              return (
                <div key={member.id} className="member-card">
                  <div className="member-info">
                    {member.avatar_url && (
                      <img 
                        src={member.avatar_url} 
                        alt={member.name}
                        className="member-avatar"
                      />
                    )}
                    <div className="member-details">
                      <h3>{member.name}</h3>
                      <p className="member-email">{member.email}</p>
                    </div>
                  </div>

                  <div className="member-role-section">
                    {assignment ? (
                      <div className="current-role">
                        <div className="role-info">
                          <span className="role-label">{assignment.role_label}</span>
                          <span className={`role-badge ${assignment.role_source}`}>
                            {assignment.role_source === 'global' ? 'Global' : 'Workspace'}
                          </span>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUnassignRole(member.id)}
                          disabled={assigning === member.id}
                        >
                          {assigning === member.id ? 'Removendo...' : 'Remover Role'}
                        </button>
                      </div>
                    ) : (
                      <div className="no-role">
                        <span className="no-role-text">Sem role atribuída</span>
                      </div>
                    )}

                    <div className="role-select">
                      <label>Atribuir nova role:</label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignRole(member.id, e.target.value)
                            e.target.value = ''
                          }
                        }}
                        disabled={assigning === member.id}
                        value=""
                      >
                        <option value="">Selecione uma role...</option>
                        {squadRoles.map(role => (
                          <option key={role.squad_role_id} value={role.squad_role_id}>
                            {role.label} ({role.source === 'global' ? 'Global' : 'Workspace'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="info-box">
          <h3>ℹ️ Regra Importante</h3>
          <p>
            Cada membro pode ter apenas <strong>1 role ativa</strong> por squad.
            Ao atribuir uma nova role, a role anterior será automaticamente removida.
          </p>
        </div>
      </div>
    </Layout>
  )
}
