import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './ProblemStatementDetail.css'

export default function ProblemStatementDetail() {
  const { workspaceId, problemId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [problemStatement, setProblemStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadProblemStatement = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `/.netlify/functions/problem-statements/${problemId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Problema não encontrado')
          }
          throw new Error('Erro ao carregar problema')
        }

        const data = await res.json()
        setProblemStatement(data.problem_statement)
      } catch (err) {
        console.error('Error loading problem statement:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (problemId) {
      loadProblemStatement()
    }
  }, [problemId, token])

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja remover este problema?')) {
      return
    }

    try {
      const res = await fetch(
        `/.netlify/functions/problem-statements/${problemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao remover problema')
      }

      navigate(`/workspaces/${workspaceId}/problems`)
    } catch (err) {
      console.error('Error deleting problem statement:', err)
      alert(err.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Data inválida'
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const renderArray = (arr) => {
    if (!arr || arr.length === 0) {
      return <p className="empty-text">Nenhum item definido</p>
    }

    return (
      <ul className="detail-list">
        {arr.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="problem-detail-container">
          <div className="loading-state">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="problem-detail-container">
          <div className="error-state">
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems`)}
            >
              Voltar para Problemas
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!problemStatement) {
    return (
      <Layout>
        <div className="problem-detail-container">
          <div className="error-state">
            <p>Problema não encontrado</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems`)}
            >
              Voltar para Problemas
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="problem-detail-container">
        <div className="problem-detail-header">
          <div className="header-content">
            <button
              className="btn-back"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems`)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <h1>{problemStatement.title || 'Sem título'}</h1>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems/${problemId}/edit`)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Excluir
            </button>
          </div>
        </div>

        <div className="problem-detail-content">
          <div className="detail-section">
            <h2>Narrativa</h2>
            <p className="narrative-text">{problemStatement.narrative}</p>
          </div>

          {problemStatement.success_metrics && problemStatement.success_metrics.length > 0 && (
            <div className="detail-section">
              <h2>Métricas de Sucesso</h2>
              {renderArray(problemStatement.success_metrics)}
            </div>
          )}

          {problemStatement.constraints && problemStatement.constraints.length > 0 && (
            <div className="detail-section">
              <h2>Restrições</h2>
              {renderArray(problemStatement.constraints)}
            </div>
          )}

          {problemStatement.assumptions && problemStatement.assumptions.length > 0 && (
            <div className="detail-section">
              <h2>Premissas</h2>
              {renderArray(problemStatement.assumptions)}
            </div>
          )}

          {problemStatement.open_questions && problemStatement.open_questions.length > 0 && (
            <div className="detail-section">
              <h2>Perguntas em Aberto</h2>
              {renderArray(problemStatement.open_questions)}
            </div>
          )}

          <div className="detail-meta">
            <div className="meta-item">
              <span className="meta-label">Criado em:</span>
              <span className="meta-value">{formatDate(problemStatement.created_at)}</span>
            </div>
            {problemStatement.updated_at && (
              <div className="meta-item">
                <span className="meta-label">Última atualização:</span>
                <span className="meta-value">{formatDate(problemStatement.updated_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
