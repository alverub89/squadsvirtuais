import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import ProblemStatementCard from '../components/ProblemStatementCard'
import PersonaCard from '../components/PersonaCard'
import DecisionModal from '../components/DecisionModal'
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
  const [selectedDecision, setSelectedDecision] = useState(null)

  const loadSquadOverview = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/squad-overview?id=${squadId}`,
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
        `/.netlify/functions/squads-detail?id=${squadId}`,
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
        `/.netlify/functions/squads-detail?id=${squadId}`,
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

  const { squad, counts, timeline, membersPreview, recentDecisions, nextPhase } = squadData
  
  // Map status to display labels
  const statusLabels = {
    'rascunho': 'Rascunho',
    'ativa': 'Ativa',
    'aguardando_execucao': 'Aguardando Execução',
    'em_revisao': 'Em Revisão',
    'concluida': 'Concluída',
    'pausada': 'Pausada'
  }

  return (
    <Layout>
      <div className="squad-detail-container">
        {/* Header */}
        <div className="squad-header">
          <div className="squad-title-section">
            <div className="title-with-badge-and-actions">
              <button 
                className="btn-back"
                onClick={() => navigate(`/workspaces/${workspaceId}/squads`)}
              >
                ← 
              </button>
              <div className="title-with-badge">
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-title-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                ) : (
                  <>
                    <h1>{squad.name}</h1>
                    <span className={`status-badge status-${squad.status}`}>
                      {statusLabels[squad.status] || squad.status}
                    </span>
                  </>
                )}
              </div>
              <div className="squad-actions-inline">
                <button className="btn-icon" onClick={handleEdit} title={isEditing ? 'Salvar' : 'Editar'}>
                  {isEditing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                </button>
                {isEditing ? (
                  <button className="btn-icon" onClick={() => {
                    setIsEditing(false)
                    setEditForm({
                      name: squad.name,
                      description: squad.description || '',
                      status: squad.status
                    })
                  }} title="Cancelar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : (
                  <button className="btn-icon btn-icon-danger" onClick={handleDelete} title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
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
        </div>

        {/* Indicator Cards */}
        <div className="indicators-grid">
          <div className="indicator-card">
            <div className="indicator-icon members-icon">👥</div>
            <div className="indicator-content">
              <div className="indicator-label">Membros</div>
              <div className="indicator-value">{counts.members}</div>
            </div>
          </div>
          <div className="indicator-card">
            <div className="indicator-icon issues-icon">📋</div>
            <div className="indicator-content">
              <div className="indicator-label">Issues</div>
              <div className="indicator-value">{counts.issues}</div>
            </div>
          </div>
          <div className="indicator-card">
            <div className="indicator-icon phases-icon">⏱️</div>
            <div className="indicator-content">
              <div className="indicator-label">Etapa</div>
              <div className="indicator-value">{counts.phase.current}/{counts.phase.total}</div>
            </div>
          </div>
        </div>

        {/* Problem Statement Card */}
        <ProblemStatementCard 
          squadId={squadId} 
          onUpdate={loadSquadOverview}
        />

        {/* Personas Card */}
        <PersonaCard 
          squadId={squadId}
          workspaceId={workspaceId}
          onUpdate={loadSquadOverview}
        />

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Timeline Section */}
          <div className="timeline-section">
            <h2>Linha do Tempo</h2>
            <div className="timeline">
              {timeline.map((item, index) => (
                <div key={item.key} className={`timeline-item timeline-${item.state}`}>
                  <div className="timeline-marker">
                    {/* Using different markers for different states to match reference design */}
                    {item.state === 'done' && <span className="marker-done">✓</span>}
                    {item.state === 'current' && <span className="marker-current">▶</span>}
                    {(item.state === 'next' || item.state === 'future') && <span className="marker-pending">{index + 1}</span>}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-title">{item.title}</div>
                      {item.relativeTime && (
                        <div className="timeline-time">{item.relativeTime}</div>
                      )}
                    </div>
                    {item.description && (
                      <div className="timeline-description">{item.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Members Card */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <h3>Membros da Squad</h3>
                {counts.members > 0 && (
                  <button className="btn-link">Ver todos →</button>
                )}
              </div>
              {membersPreview.length === 0 ? (
                <p className="empty-text">Nenhum membro atribuído</p>
              ) : (
                <div className="members-list">
                  {membersPreview.map((member, index) => (
                    <div key={index} className="member-item">
                      <div className="member-avatar-wrapper">
                        <div className="member-avatar">{member.initials}</div>
                        {member.online && <div className="member-status-indicator"></div>}
                      </div>
                      <div className="member-info">
                        <div className="member-name">{member.name}</div>
                        <div className="member-role">{member.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decisions Card */}
            <div className="sidebar-card">
              <h3>Decisões Recentes</h3>
              {recentDecisions.length === 0 ? (
                <p className="empty-text">Nenhuma decisão registrada</p>
              ) : (
                <div className="decisions-list">
                  {recentDecisions.map((decision, index) => (
                    <div 
                      key={index} 
                      className="decision-item"
                      onClick={() => setSelectedDecision(decision)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="decision-icon">💬</div>
                      <div className="decision-content">
                        <div className="decision-title">{decision.title}</div>
                        <div className="decision-summary">{decision.summary}</div>
                        <div className="decision-meta">
                          <span className="decision-role">{decision.role}</span>
                          <span className="decision-time">{decision.relativeTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Phase Card */}
        {nextPhase && (
          <div className="next-phase-card">
            <div className="next-phase-content">
              <h3>Próxima etapa disponível</h3>
              <p>{nextPhase.description}</p>
            </div>
            <button className="btn btn-primary btn-advance">
              ▶ Avançar
            </button>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedDecision && (
        <DecisionModal 
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </Layout>
  )
}
