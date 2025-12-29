import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './CreateProblemStatement.css'

export default function EditProblemStatement() {
  const { workspaceId, problemId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    narrative: '',
    success_metrics: [''],
    constraints: [''],
    assumptions: [''],
    open_questions: ['']
  })

  useEffect(() => {
    const loadProblemStatement = async () => {
      try {
        setLoadingData(true)
        const res = await fetch(
          `/.netlify/functions/problem-statements/${problemId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!res.ok) {
          throw new Error('Erro ao carregar problema')
        }

        const data = await res.json()
        const ps = data.problem_statement

        // Ensure arrays have at least one empty item for the UI
        const ensureArray = (arr) => {
          if (!arr || arr.length === 0) return ['']
          return arr
        }

        setFormData({
          title: ps.title || '',
          narrative: ps.narrative || '',
          success_metrics: ensureArray(ps.success_metrics),
          constraints: ensureArray(ps.constraints),
          assumptions: ensureArray(ps.assumptions),
          open_questions: ensureArray(ps.open_questions)
        })
      } catch (err) {
        console.error('Error loading problem statement:', err)
        alert(err.message)
        navigate(`/workspaces/${workspaceId}/problems`)
      } finally {
        setLoadingData(false)
      }
    }

    if (problemId) {
      loadProblemStatement()
    }
  }, [problemId, token, navigate, workspaceId])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.narrative.trim()) {
      alert('Narrativa é obrigatória')
      return
    }

    try {
      setLoading(true)
      
      // Filter out empty items from arrays
      const cleanArray = (arr) => arr.filter(item => item && item.trim().length > 0)
      
      const res = await fetch(
        `/.netlify/functions/problem-statements/${problemId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formData.title,
            narrative: formData.narrative,
            success_metrics: cleanArray(formData.success_metrics),
            constraints: cleanArray(formData.constraints),
            assumptions: cleanArray(formData.assumptions),
            open_questions: cleanArray(formData.open_questions)
          })
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar problema')
      }

      navigate(`/workspaces/${workspaceId}/problems/${problemId}`)
    } catch (err) {
      console.error('Error updating problem statement:', err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleArrayItemChange = (fieldName, index, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], '']
    }))
  }

  const removeArrayItem = (fieldName, index) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, i) => i !== index)
    }))
  }

  if (loadingData) {
    return (
      <Layout>
        <div className="create-problem-container">
          <div className="loading-state">Carregando...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="create-problem-container">
        <div className="create-problem-header">
          <h1>Editar Problema</h1>
          <p className="create-problem-subtitle">
            Atualize as informações do problema de negócio
          </p>
        </div>

        <form onSubmit={handleSubmit} className="create-problem-form">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Usuários não conseguem encontrar produtos rapidamente"
                className="form-input"
              />
              <p className="form-help">
                Um título claro e conciso do problema (opcional)
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="narrative">Narrativa *</label>
              <textarea
                id="narrative"
                name="narrative"
                value={formData.narrative}
                onChange={handleChange}
                placeholder="Descreva o problema em detalhes: contexto, impacto, stakeholders afetados..."
                rows={6}
                required
                className="form-textarea"
              />
              <p className="form-help">
                Descrição completa do problema (obrigatório)
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2>Métricas de Sucesso</h2>
            <p className="section-description">Como saberemos que o problema foi resolvido?</p>
            
            <div className="array-field">
              {formData.success_metrics.map((metric, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={metric}
                    onChange={(e) => handleArrayItemChange('success_metrics', index, e.target.value)}
                    placeholder="Ex: Tempo de busca < 3s"
                    className="form-input"
                  />
                  {formData.success_metrics.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeArrayItem('success_metrics', index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-add"
                onClick={() => addArrayItem('success_metrics')}
              >
                + Adicionar métrica
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2>Restrições</h2>
            <p className="section-description">Limitações técnicas, orçamentárias, de tempo ou regulatórias</p>
            
            <div className="array-field">
              {formData.constraints.map((constraint, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={constraint}
                    onChange={(e) => handleArrayItemChange('constraints', index, e.target.value)}
                    placeholder="Ex: Orçamento limitado a R$ 50k"
                    className="form-input"
                  />
                  {formData.constraints.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeArrayItem('constraints', index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-add"
                onClick={() => addArrayItem('constraints')}
              >
                + Adicionar restrição
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2>Premissas</h2>
            <p className="section-description">O que estamos assumindo como verdadeiro?</p>
            
            <div className="array-field">
              {formData.assumptions.map((assumption, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={assumption}
                    onChange={(e) => handleArrayItemChange('assumptions', index, e.target.value)}
                    placeholder="Ex: Usuários têm smartphones"
                    className="form-input"
                  />
                  {formData.assumptions.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeArrayItem('assumptions', index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-add"
                onClick={() => addArrayItem('assumptions')}
              >
                + Adicionar premissa
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2>Perguntas em Aberto</h2>
            <p className="section-description">O que ainda precisamos descobrir ou validar?</p>
            
            <div className="array-field">
              {formData.open_questions.map((question, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => handleArrayItemChange('open_questions', index, e.target.value)}
                    placeholder="Ex: Qual o tempo de resposta aceitável?"
                    className="form-input"
                  />
                  {formData.open_questions.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeArrayItem('open_questions', index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-add"
                onClick={() => addArrayItem('open_questions')}
              >
                + Adicionar pergunta
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/workspaces/${workspaceId}/problems/${problemId}`)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
