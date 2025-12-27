import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AIStructureProposalModal from './AIStructureProposalModal'
import './ProblemStatementCard.css'

export default function ProblemStatementCard({ squadId, onUpdate }) {
  const { token } = useAuth()
  const [problemStatement, setProblemStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [showAIProposal, setShowAIProposal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    narrative: '',
    success_metrics: '',
    constraints: '',
    assumptions: '',
    open_questions: ''
  })

  const loadProblemStatement = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/problem-statements?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao carregar Problem Statement')
      }

      const data = await res.json()
      setProblemStatement(data.problem_statement)
      
      if (data.problem_statement) {
        setFormData({
          title: data.problem_statement.title || '',
          narrative: data.problem_statement.narrative || '',
          success_metrics: data.problem_statement.success_metrics || '',
          constraints: data.problem_statement.constraints || '',
          assumptions: data.problem_statement.assumptions || '',
          open_questions: data.problem_statement.open_questions || ''
        })
      }
    } catch (err) {
      console.error('Error loading problem statement:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await fetch(
        `/.netlify/functions/decisions?squad_id=${squadId}&filter=problem_statement`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (res.ok) {
        const data = await res.json()
        // Filter only history entries (those with "atualizado" in title)
        const historyEntries = data.decisions.filter(d => d.title.includes('atualizado'))
        setHistory(historyEntries)
      }
    } catch (err) {
      console.error('Error loading history:', err)
    }
  }

  useEffect(() => {
    if (squadId) {
      loadProblemStatement()
    }
  }, [squadId, token])

  const handleCreate = async () => {
    try {
      const res = await fetch('/.netlify/functions/problem-statements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          squad_id: squadId,
          ...formData
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar Problem Statement')
      }

      await loadProblemStatement()
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error creating problem statement:', err)
      alert(err.message || 'Erro ao criar Problem Statement')
    }
  }

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `/.netlify/functions/problem-statements/${problemStatement.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao atualizar Problem Statement')
      }

      await loadProblemStatement()
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error updating problem statement:', err)
      alert(err.message || 'Erro ao atualizar Problem Statement')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.narrative.trim()) {
      alert('Título e Narrativa são obrigatórios')
      return
    }

    if (problemStatement) {
      await handleUpdate()
    } else {
      await handleCreate()
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (problemStatement) {
      setFormData({
        title: problemStatement.title || '',
        narrative: problemStatement.narrative || '',
        success_metrics: problemStatement.success_metrics || '',
        constraints: problemStatement.constraints || '',
        assumptions: problemStatement.assumptions || '',
        open_questions: problemStatement.open_questions || ''
      })
    }
  }

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory()
    }
    setShowHistory(!showHistory)
  }

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? "Há 1 minuto" : `Há ${diffMinutes} minutos`
    } else if (diffHours < 24) {
      return diffHours === 1 ? "Há 1 hora" : `Há ${diffHours} horas`
    } else {
      return diffDays === 1 ? "Há 1 dia" : `Há ${diffDays} dias`
    }
  }

  if (loading) {
    return (
      <div className="problem-statement-card">
        <div className="loading">Carregando...</div>
      </div>
    )
  }

  // Editing mode (create or update)
  if (isEditing) {
    return (
      <div className="problem-statement-card">
        <div className="problem-statement-header">
          <div className="problem-statement-title-section">
            <h3>{problemStatement ? 'Editar' : 'Definir'} Problema de Negócio</h3>
            <p className="problem-statement-subtitle">
              Tudo que essa squad faz existe para resolver este problema.
            </p>
          </div>
        </div>

        <form className="problem-statement-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ps-title">
              Título do Problema <span style={{color: '#ef4444'}}>*</span>
            </label>
            <input
              id="ps-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Usuários não conseguem encontrar produtos rapidamente"
              required
            />
            <span className="field-hint">Um título claro e conciso do problema</span>
          </div>

          <div className="form-group">
            <label htmlFor="ps-narrative">
              Narrativa <span style={{color: '#ef4444'}}>*</span>
            </label>
            <textarea
              id="ps-narrative"
              value={formData.narrative}
              onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
              placeholder="Descreva o problema em detalhes: contexto, impacto, stakeholders afetados..."
              rows={6}
              required
            />
            <span className="field-hint">Mínimo 280 caracteres para uma descrição completa</span>
          </div>

          <div className="form-group">
            <label htmlFor="ps-metrics">Métricas de Sucesso</label>
            <textarea
              id="ps-metrics"
              value={formData.success_metrics}
              onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
              placeholder="Como saberemos que o problema foi resolvido? Ex: Tempo de busca < 3s, taxa de conversão > 25%"
              rows={4}
            />
            <span className="field-hint">Defina critérios mensuráveis de sucesso</span>
          </div>

          <div className="form-group">
            <label htmlFor="ps-constraints">Restrições</label>
            <textarea
              id="ps-constraints"
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="Limitações técnicas, orçamentárias, de tempo ou regulatórias..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ps-assumptions">Premissas</label>
            <textarea
              id="ps-assumptions"
              value={formData.assumptions}
              onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
              placeholder="O que estamos assumindo como verdadeiro?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ps-questions">Perguntas em Aberto</label>
            <textarea
              id="ps-questions"
              value={formData.open_questions}
              onChange={(e) => setFormData({ ...formData, open_questions: e.target.value })}
              placeholder="O que ainda precisamos descobrir ou validar?"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {problemStatement ? 'Salvar Alterações' : 'Criar Problem Statement'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Empty state
  if (!problemStatement) {
    return (
      <div className="problem-statement-card">
        <div className="problem-statement-empty">
          <div className="problem-statement-empty-icon">🎯</div>
          <h3 className="problem-statement-empty-title">Problema de Negócio não definido</h3>
          <p className="problem-statement-empty-text">
            Defina o problema que esta squad existe para resolver. Um problema bem definido 
            orienta todas as decisões e melhora a qualidade das sugestões.
          </p>
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Definir Problema
          </button>
        </div>
      </div>
    )
  }

  // Display mode
  const quality = problemStatement.quality || {}
  
  return (
    <div className="problem-statement-card">
      <div className="problem-statement-header">
        <div className="problem-statement-title-section">
          <h3>Problema de Negócio</h3>
          <p className="problem-statement-subtitle">
            Tudo que essa squad faz existe para resolver este problema.
          </p>
        </div>
        <div className="problem-statement-actions">
          <button className="btn-icon" onClick={() => setIsEditing(true)} title="Editar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="problem-statement-content">
        <div className="problem-statement-field">
          <div className="problem-statement-field-label">Título</div>
          <div className="problem-statement-field-value">{problemStatement.title}</div>
        </div>

        <div className="problem-statement-field">
          <div className="problem-statement-field-label">Narrativa</div>
          <div className="problem-statement-field-value">{problemStatement.narrative}</div>
        </div>

        {problemStatement.success_metrics && (
          <div className="problem-statement-field">
            <div className="problem-statement-field-label">Métricas de Sucesso</div>
            <div className="problem-statement-field-value">{problemStatement.success_metrics}</div>
          </div>
        )}

        {problemStatement.constraints && (
          <div className="problem-statement-field">
            <div className="problem-statement-field-label">Restrições</div>
            <div className="problem-statement-field-value">{problemStatement.constraints}</div>
          </div>
        )}

        {problemStatement.assumptions && (
          <div className="problem-statement-field">
            <div className="problem-statement-field-label">Premissas</div>
            <div className="problem-statement-field-value">{problemStatement.assumptions}</div>
          </div>
        )}

        {problemStatement.open_questions && (
          <div className="problem-statement-field">
            <div className="problem-statement-field-label">Perguntas em Aberto</div>
            <div className="problem-statement-field-value">{problemStatement.open_questions}</div>
          </div>
        )}
      </div>

      {/* Quality Alert */}
      {quality.message && (
        <div className={`problem-statement-quality-alert ${quality.status === 'good' ? 'good' : ''}`}>
          <div className="problem-statement-quality-icon">
            {quality.status === 'good' ? '✓' : '💡'}
          </div>
          <div className="problem-statement-quality-content">
            <p className="problem-statement-quality-message">{quality.message}</p>
            {quality.issues && quality.issues.length > 0 && (
              <ul className="problem-statement-quality-items">
                {quality.issues.map((issue, idx) => (
                  <li key={idx} className="problem-statement-quality-item">{issue}</li>
                ))}
              </ul>
            )}
            {quality.suggestions && quality.suggestions.length > 0 && (
              <ul className="problem-statement-quality-items">
                {quality.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="problem-statement-quality-item">{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* AI Proposal CTA */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '8px', 
        padding: '16px',
        marginTop: '16px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <strong style={{ fontSize: '16px' }}>Gerar Proposta de Estrutura com IA</strong>
            </div>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
              A IA pode sugerir um roteiro de trabalho, papéis e personas baseados neste problema
            </p>
          </div>
          <button
            onClick={() => setShowAIProposal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            Gerar com IA
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="problem-statement-meta">
        <span>
          Última atualização: {formatRelativeTime(problemStatement.updated_at)}
        </span>
        <button 
          className="problem-statement-meta-link" 
          onClick={toggleHistory}
          type="button"
        >
          {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
        </button>
      </div>

      {/* History */}
      {showHistory && (
        <div className="problem-statement-history">
          <h4>Histórico de Alterações</h4>
          {history.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma alteração registrada ainda</p>
          ) : (
            <div className="history-timeline">
              {history.map((item) => {
                const changes = item.decision
                return (
                  <div key={item.id} className="history-item">
                    <div className="history-item-header">Problem Statement atualizado</div>
                    <div className="history-item-time">{formatRelativeTime(item.created_at)}</div>
                    {changes.before && changes.after && (
                      <div className="history-item-changes">
                        Alterações registradas no sistema
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Structure Proposal Modal */}
      {showAIProposal && (
        <AIStructureProposalModal
          squadId={squadId}
          onClose={() => setShowAIProposal(false)}
          onConfirm={() => {
            setShowAIProposal(false)
            if (onUpdate) onUpdate()
          }}
        />
      )}
    </div>
  )
}
