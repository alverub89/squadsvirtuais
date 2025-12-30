import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './ProblemStatementsList.css'

export default function ProblemStatementsList() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [problemStatements, setProblemStatements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProblemStatements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/problem-statements?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Você não tem acesso a este workspace')
        }
        throw new Error('Erro ao carregar problemas')
      }

      const data = await res.json()
      setProblemStatements(data.problem_statements || [])
    } catch (err) {
      console.error('Error loading problem statements:', err)
      setError(err.message || 'Erro ao carregar problemas')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, token])

  useEffect(() => {
    if (!workspaceId) {
      navigate('/workspaces')
      return
    }

    loadProblemStatements()
  }, [workspaceId, navigate, loadProblemStatements])

  const handleDelete = async (psId) => {
    if (!window.confirm('Tem certeza que deseja remover este problema?')) {
      return
    }

    try {
      const res = await fetch(
        `/.netlify/functions/problem-statements/${psId}`,
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

      await loadProblemStatements()
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
      month: 'short',
      year: 'numeric'
    })
  }

  const truncate = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <Layout>
      <div className="problems-page-container">
        <div className="problems-page-header">
          <div className="problems-header-content">
            <h1>Problemas</h1>
            <p className="problems-subtitle">
              O problema de negócio é a unidade principal do sistema. 
              Defina os problemas que orientam o trabalho das squads.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/workspaces/${workspaceId}/problems/create`)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo Problema
          </button>
        </div>

        {loading && (
          <div className="problems-loading">
            <div className="loading-spinner"></div>
            <p>Carregando problemas...</p>
          </div>
        )}

        {error && (
          <div className="problems-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && problemStatements.length === 0 && (
          <div className="problems-empty">
            <div className="problems-empty-icon">🎯</div>
            <h3>Nenhum problema definido ainda</h3>
            <p>
              Comece criando um problema de negócio que será o foco do trabalho.
              Um problema bem definido orienta todas as decisões.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems/create`)}
            >
              Criar Primeiro Problema
            </button>
          </div>
        )}

        {!loading && !error && problemStatements.length > 0 && (
          <div className="problems-grid">
            {problemStatements.map((ps) => (
              <div key={ps.id} className="problem-card">
                <div className="problem-card-header">
                  <h3 className="problem-card-title">
                    {ps.title || 'Sem título'}
                  </h3>
                  <div className="problem-card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/workspaces/${workspaceId}/problems/${ps.id}`)}
                      title="Ver detalhes"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/workspaces/${workspaceId}/problems/${ps.id}/edit`)}
                      title="Editar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDelete(ps.id)}
                      title="Excluir"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="problem-card-content">
                  <p className="problem-card-narrative">
                    {truncate(ps.narrative, 200)}
                  </p>
                  {ps.squad_id && (
                    <div className="problem-card-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Associado a squad
                    </div>
                  )}
                </div>

                <div className="problem-card-footer">
                  <span className="problem-card-date">
                    {formatDate(ps.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
