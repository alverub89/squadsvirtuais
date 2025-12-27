import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './CreatePersona.css'

export default function EditPersona() {
  const { workspaceId, personaId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'cliente',
    subtype: '',
    goals: '',
    pain_points: '',
    behaviors: '',
    influence_level: '',
    active: true
  })
  const [squadAssociations, setSquadAssociations] = useState([])
  const [decisions, setDecisions] = useState([])

  useEffect(() => {
    const loadPersona = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `/.netlify/functions/personas/${personaId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!res.ok) {
          throw new Error('Erro ao carregar persona')
        }

        const data = await res.json()
        setFormData({
          name: data.persona.name || '',
          type: data.persona.type || 'cliente',
          subtype: data.persona.subtype || '',
          goals: data.persona.goals || '',
          pain_points: data.persona.pain_points || '',
          behaviors: data.persona.behaviors || '',
          influence_level: data.persona.influence_level || '',
          active: data.persona.active !== false
        })
        setSquadAssociations(data.squad_associations || [])

        // Load decisions for this persona (if needed)
        // For now we'll show squad associations
      } catch (err) {
        console.error('Error loading persona:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (personaId && token) {
      loadPersona()
    }
  }, [personaId, token])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/.netlify/functions/personas/${personaId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar persona')
      }

      navigate(`/workspaces/${workspaceId}/personas`)
    } catch (err) {
      console.error('Error updating persona:', err)
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta persona? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const res = await fetch(`/.netlify/functions/personas/${personaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir persona')
      }

      navigate(`/workspaces/${workspaceId}/personas`)
    } catch (err) {
      console.error('Error deleting persona:', err)
      alert(err.message)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <Layout>
        <div className="create-persona-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="create-persona-container">
          <div className="error">{error}</div>
          <button 
            onClick={() => navigate(`/workspaces/${workspaceId}/personas`)} 
            className="btn btn-primary"
          >
            Voltar para Personas
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="create-persona-container">
        <div className="create-persona-header">
          <h1>Editar Persona</h1>
          <p className="create-persona-subtitle">
            Edite as informações da persona digital
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
              <select
                id="influence_level"
                name="influence_level"
                value={formData.influence_level}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Selecione...</option>
                <option value="Alto">Alto</option>
                <option value="Médio">Médio</option>
                <option value="Baixo">Baixo</option>
              </select>
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

          {/* Squad Associations Section */}
          {squadAssociations.length > 0 && (
            <div className="form-section">
              <h2>Squads Associadas</h2>
              <div className="associations-list">
                {squadAssociations.map((assoc) => (
                  <div key={assoc.id} className="association-item">
                    <div className="association-icon">🏆</div>
                    <div className="association-info">
                      <div className="association-name">{assoc.squad_name}</div>
                      {assoc.problem_statement && (
                        <div className="association-subtitle">{assoc.problem_statement}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={saving}
            >
              Excluir Persona
            </button>
            <div className="form-actions-right">
              <button 
                type="button" 
                onClick={() => navigate(`/workspaces/${workspaceId}/personas`)}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}
