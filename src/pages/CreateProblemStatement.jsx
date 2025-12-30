import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './CreateProblemStatement.css'

export default function CreateProblemStatement() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    narrative: '',
    success_metrics: [''],
    constraints: [''],
    assumptions: [''],
    open_questions: ['']
  })

  // We need a squad_id - but it's now optional
  const [squads, setSquads] = useState([])
  const [selectedSquadId, setSelectedSquadId] = useState('')
  const [loadingSquads, setLoadingSquads] = useState(true)

  // Load squads on mount
  useEffect(() => {
    const loadSquads = async () => {
      try {
        const res = await fetch(
          `/.netlify/functions/squads?workspace_id=${workspaceId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (res.ok) {
          const data = await res.json()
          setSquads(data.squads || [])
          // Don't auto-select the first squad anymore
        }
      } catch (err) {
        console.error('Error loading squads:', err)
      } finally {
        setLoadingSquads(false)
      }
    }
    loadSquads()
  }, [workspaceId, token])

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
      
      const requestBody = {
        workspace_id: workspaceId,
        title: formData.title,
        narrative: formData.narrative,
        success_metrics: cleanArray(formData.success_metrics),
        constraints: cleanArray(formData.constraints),
        assumptions: cleanArray(formData.assumptions),
        open_questions: cleanArray(formData.open_questions)
      }
      
      // Only include squad_id if one is selected
      if (selectedSquadId) {
        requestBody.squad_id = selectedSquadId
      }
      
      const res = await fetch('/.netlify/functions/problem-statements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar problema')
      }

      navigate(`/workspaces/${workspaceId}/problems`)
    } catch (err) {
      console.error('Error creating problem statement:', err)
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

  if (loadingSquads) {
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
          <h1>Novo Problema</h1>
          <p className="create-problem-subtitle">
            Defina o problema de negócio que orienta o trabalho da squad
          </p>
        </div>

        <form onSubmit={handleSubmit} className="create-problem-form">
          <div className="form-section">
            {squads.length > 0 && (
              <div className="form-group">
                <label htmlFor="squad">Squad Associada</label>
                <select
                  id="squad"
                  value={selectedSquadId}
                  onChange={(e) => setSelectedSquadId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Nenhuma squad (associar depois)</option>
                  {squads.map(squad => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name || 'Squad sem nome'}
                    </option>
                  ))}
                </select>
                <p className="form-help">
                  O problema pode ser associado a uma squad agora ou posteriormente
                </p>
              </div>
            )}

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
              onClick={() => navigate(`/workspaces/${workspaceId}/problems`)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Problema'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
