import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './CreatePersona.css'

export default function CreatePersona() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'cliente',
    subtype: '',
    goals: '',
    pain_points: '',
    behaviors: '',
    influence_level: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      alert('Nome é obrigatório')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/.netlify/functions/personas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...formData
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar persona')
      }

      // Success - redirect to personas list
      navigate(`/workspaces/${workspaceId}/personas`)
    } catch (err) {
      console.error('Error creating persona:', err)
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

  return (
    <Layout>
      <div className="create-persona-container">
        <div className="create-persona-header">
          <h1>Nova Persona</h1>
          <p className="create-persona-subtitle">
            Crie uma persona digital para validar decisões do produto
          </p>
        </div>

        <form onSubmit={handleSubmit} className="create-persona-form">
          <div className="form-section">
            <h2>Informações Básicas</h2>
            
            <div className="form-group">
              <label htmlFor="name">Nome da Persona *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Maria Estudante"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Tipo *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="cliente">Usuário</option>
                <option value="stakeholder">Stakeholder</option>
                <option value="membro_squad">Técnico</option>
              </select>
              <p className="form-help">
                Usuário: pessoa que usa o produto | Stakeholder: parte interessada no resultado | Técnico: membro da squad
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="subtype">Subtipo</label>
              <input
                type="text"
                id="subtype"
                name="subtype"
                value={formData.subtype}
                onChange={handleChange}
                placeholder="Ex: Estudante, Instrutor, Empresário, Tech Lead"
                className="form-input"
              />
              <p className="form-help">
                Classificação adicional específica para o contexto do seu produto
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="influence_level">Nível de Influência</label>
              <input
                type="text"
                id="influence_level"
                name="influence_level"
                value={formData.influence_level}
                onChange={handleChange}
                placeholder="Ex: Alto, Médio, Baixo"
                className="form-input"
              />
              <p className="form-help">
                Quanto esta persona influencia nas decisões do produto
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2>Características</h2>

            <div className="form-group">
              <label htmlFor="goals">Objetivos</label>
              <textarea
                id="goals"
                name="goals"
                value={formData.goals}
                onChange={handleChange}
                placeholder="O que esta persona quer alcançar?"
                rows={4}
                className="form-textarea"
              />
              <p className="form-help">
                Descreva os principais objetivos e motivações desta persona
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="pain_points">Dores</label>
              <textarea
                id="pain_points"
                name="pain_points"
                value={formData.pain_points}
                onChange={handleChange}
                placeholder="Quais são os problemas e frustrações desta persona?"
                rows={4}
                className="form-textarea"
              />
              <p className="form-help">
                Identifique os principais problemas que a persona enfrenta
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="behaviors">Comportamentos</label>
              <textarea
                id="behaviors"
                name="behaviors"
                value={formData.behaviors}
                onChange={handleChange}
                placeholder="Como esta persona se comporta? Quais são seus hábitos?"
                rows={4}
                className="form-textarea"
              />
              <p className="form-help">
                Descreva padrões de comportamento e hábitos relevantes
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate(`/workspaces/${workspaceId}/personas`)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Persona'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
