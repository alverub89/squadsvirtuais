import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './SquadDetail.css'

export default function SquadDetail() {
  const { workspaceId, squadId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [squadData, setSquadData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: '' })

  const loadSquadOverview = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/squads/${squadId}/overview`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Você não tem acesso a esta squad')
        }
        if (res.status === 404) {
          throw new Error('Squad não encontrada')
        }
        throw new Error('Erro ao carregar squad')
      }

      const data = await res.json()
      setSquadData(data)
      setEditForm({
        name: data.squad.name,
        description: data.squad.description || '',
        status: data.squad.status
      })
    } catch (err) {
      console.error('Error loading squad:', err)
      setError(err.message || 'Erro ao carregar squad')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    try {
      const res = await fetch(
        `/.netlify/functions/squads/${squadId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editForm)
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao atualizar squad')
      }

      setIsEditing(false)
      loadSquadOverview()
    } catch (err) {
      console.error('Error updating squad:', err)
      alert(err.message || 'Erro ao atualizar squad')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta squad? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const res = await fetch(
        `/.netlify/functions/squads/${squadId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao excluir squad')
      }

      navigate(`/workspaces/${workspaceId}/squads`)
    } catch (err) {
      console.error('Error deleting squad:', err)
      alert(err.message || 'Erro ao excluir squad')
    }
  }

  useEffect(() => {
    if (!workspaceId || !squadId) {
      navigate('/workspaces')
      return
    }

    loadSquadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, squadId, token, navigate])

  if (loading) {
    return (
      <Layout>
        <div className="squad-detail-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="squad-detail-container">
          <div className="error">{error}</div>
          <button onClick={() => navigate(`/workspaces/${workspaceId}/squads`)} className="btn btn-primary">
            Voltar para Squads
          </button>
        </div>
      </Layout>
    )
  }

  if (!squadData) {
    return null
  }

  const { squad, counts, timeline, membersPreview, recentDecisions } = squadData

  return (
    <Layout>
      <div className="squad-detail-container">
        {/* Header */}
        <div className="squad-header">
          <button 
            className="btn-back"
            onClick={() => navigate(`/workspaces/${workspaceId}/squads`)}
          >
            ← Voltar
          </button>
          <div className="squad-title-section">
            {isEditing ? (
              <input
                type="text"
                className="edit-title-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            ) : (
              <h1>{squad.name}</h1>
            )}
            {isEditing ? (
              <textarea
                className="edit-description-input"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrição da squad"
              />
            ) : (
              squad.description && <p className="squad-subtitle">{squad.description}</p>
            )}
          </div>
          <div className="squad-actions">
            <button className="btn btn-secondary" onClick={handleEdit}>
              {isEditing ? 'Salvar' : 'Editar'}
            </button>
            {isEditing && (
              <button className="btn btn-secondary" onClick={() => {
                setIsEditing(false)
                setEditForm({
                  name: squad.name,
                  description: squad.description || '',
                  status: squad.status
                })
              }}>
                Cancelar
              </button>
            )}
            {!isEditing && (
              <button className="btn btn-danger" onClick={handleDelete}>
                Excluir
              </button>
            )}
          </div>
        </div>

        {/* Indicator Cards */}
        <div className="indicators-grid">
          <div className="indicator-card">
            <div className="indicator-icon issues-icon">📋</div>
            <div className="indicator-content">
              <div className="indicator-value">{counts.issues}</div>
              <div className="indicator-label">Issues</div>
            </div>
          </div>
          <div className="indicator-card">
            <div className="indicator-icon phases-icon">📊</div>
            <div className="indicator-content">
              <div className="indicator-value">{counts.phase.current}/{counts.phase.total}</div>
              <div className="indicator-label">Etapas</div>
            </div>
          </div>
          <div className="indicator-card">
            <div className="indicator-icon members-icon">👥</div>
            <div className="indicator-content">
              <div className="indicator-value">{counts.members}</div>
              <div className="indicator-label">Membros</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Timeline Section */}
          <div className="timeline-section">
            <h2>Linha do Tempo</h2>
            <div className="timeline">
              {timeline.map((item, index) => (
                <div key={item.key} className={`timeline-item timeline-${item.state}`}>
                  <div className="timeline-marker">
                    {item.state === 'done' && <span className="marker-done">✓</span>}
                    {item.state === 'current' && <span className="marker-current">{index + 1}</span>}
                    {(item.state === 'next' || item.state === 'future') && <span className="marker-pending">{index + 1}</span>}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">{item.title}</div>
                    {item.relativeTime && (
                      <div className="timeline-time">{item.relativeTime}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Decisions Card */}
            <div className="sidebar-card">
              <h3>Decisões Recentes</h3>
              {recentDecisions.length === 0 ? (
                <p className="empty-text">Nenhuma decisão registrada</p>
              ) : (
                <div className="decisions-list">
                  {recentDecisions.map((decision, index) => (
                    <div key={index} className="decision-item">
                      <div className="decision-title">{decision.title}</div>
                      <div className="decision-summary">{decision.summary}</div>
                      <div className="decision-meta">
                        <span className="decision-role">{decision.role}</span>
                        <span className="decision-time">{decision.relativeTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members Card */}
            <div className="sidebar-card">
              <h3>Membros da Squad</h3>
              {membersPreview.length === 0 ? (
                <p className="empty-text">Nenhum membro atribuído</p>
              ) : (
                <div className="members-list">
                  {membersPreview.map((member, index) => (
                    <div key={index} className="member-item">
                      <div className="member-avatar">{member.initials}</div>
                      <div className="member-info">
                        <div className="member-name">{member.name}</div>
                        <div className="member-role">{member.role}</div>
                      </div>
                    </div>
                  ))}
                  {counts.members > 3 && (
                    <div className="members-more">
                      +{counts.members - 3} mais {counts.members - 3 === 1 ? 'membro' : 'membros'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
