import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import './WorkspaceRoles.css'

export default function WorkspaceRoles() {
  const { workspaceId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [globalRoles, setGlobalRoles] = useState([])
  const [workspaceRoles, setWorkspaceRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState('all') // all, global, workspace
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // create, edit, duplicate
  const [selectedRole, setSelectedRole] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    responsibilities: ''
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch(
        `/.netlify/functions/roles?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao carregar roles')
      }

      const data = await res.json()
      const roles = data.roles || []
      
      setGlobalRoles(roles.filter(r => r.source === 'global'))
      setWorkspaceRoles(roles.filter(r => r.source === 'workspace'))

    } catch (err) {
      console.error('Error loading roles:', err)
      setError(err.message || 'Erro ao carregar roles')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, token])

  useEffect(() => {
    if (!workspaceId) {
      navigate('/workspaces')
      return
    }
    loadRoles()
  }, [workspaceId, navigate, loadRoles])

  const openCreateModal = () => {
    setModalMode('create')
    setSelectedRole(null)
    setFormData({
      code: '',
      label: '',
      description: '',
      responsibilities: ''
    })
    setShowModal(true)
  }

  const openEditModal = (role) => {
    setModalMode('edit')
    setSelectedRole(role)
    setFormData({
      code: role.code,
      label: role.label,
      description: role.description || '',
      responsibilities: role.responsibilities || ''
    })
    setShowModal(true)
  }

  const openDuplicateModal = (role) => {
    setModalMode('duplicate')
    setSelectedRole(role)
    setFormData({
      code: `${role.code}_custom`,
      label: `${role.label} (Customizado)`,
      description: role.description || '',
      responsibilities: role.responsibilities || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRole(null)
    setFormData({
      code: '',
      label: '',
      description: '',
      responsibilities: ''
    })
  }

  const handleSave = async () => {
    if (!formData.code || !formData.label) {
      alert('Código e nome são obrigatórios')
      return
    }

    try {
      setSaving(true)

      if (modalMode === 'create' || modalMode === 'duplicate') {
        // Create new workspace role
        const res = await fetch('/.netlify/functions/workspace-roles', {
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
          throw new Error(data.error || 'Erro ao criar role')
        }
      } else if (modalMode === 'edit') {
        // Update existing workspace role
        const res = await fetch(`/.netlify/functions/workspace-roles/${selectedRole.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao atualizar role')
        }
      }

      closeModal()
      await loadRoles()
    } catch (err) {
      console.error('Error saving role:', err)
      alert(err.message || 'Erro ao salvar role')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role) => {
    if (!confirm(`Tem certeza que deseja excluir a role "${role.label}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setDeleting(role.id)
      
      const res = await fetch(`/.netlify/functions/workspace-roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir role')
      }

      await loadRoles()
    } catch (err) {
      console.error('Error deleting role:', err)
      alert(err.message || 'Erro ao excluir role')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="workspace-roles-container">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="workspace-roles-container">
          <div className="error">{error}</div>
          <button 
            onClick={() => navigate(`/workspaces/${workspaceId}/squads`)} 
            className="btn btn-primary"
          >
            Voltar para Squads
          </button>
        </div>
      </Layout>
    )
  }

  // Combine and filter roles
  const allRoles = [...globalRoles, ...workspaceRoles]
  const filteredRoles = allRoles.filter(role => {
    const matchesSearch = role.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterSource === 'all' || role.source === filterSource
    
    return matchesSearch && matchesFilter
  })

  return (
    <Layout>
      <div className="workspace-roles-container">
        <button 
          onClick={() => navigate(`/workspaces/${workspaceId}/squads`)}
          className="btn-back"
        >
          ← Voltar
        </button>
        <div className="workspace-roles-header">
          <h1>Gerenciar Roles</h1>
          <p className="workspace-roles-subtitle">Defina especialidades disponíveis para este workspace</p>
          <button className="btn btn-primary btn-large" onClick={openCreateModal}>
            + Criar Role
          </button>
        </div>

        {/* Search and Filter */}
        <div className="roles-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome, código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-buttons">
            <button 
              className={`btn-filter ${filterSource === 'all' ? 'active' : ''}`}
              onClick={() => setFilterSource('all')}
            >
              Todas
            </button>
            <button 
              className={`btn-filter ${filterSource === 'global' ? 'active' : ''}`}
              onClick={() => setFilterSource('global')}
            >
              Globais
            </button>
            <button 
              className={`btn-filter ${filterSource === 'workspace' ? 'active' : ''}`}
              onClick={() => setFilterSource('workspace')}
            >
              Customizadas
            </button>
          </div>
        </div>

        {/* Roles Grid */}
        {filteredRoles.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma role encontrada.</p>
            {searchTerm && <p>Tente ajustar os filtros ou criar uma nova role.</p>}
          </div>
        ) : (
          <div className="roles-grid">
            {filteredRoles.map(role => (
              <div key={role.id} className={`role-card role-${role.source}`}>
                <div className="role-header">
                  <div className="role-title-section">
                    <h3>{role.label}</h3>
                    <span className={`role-badge ${role.source}`}>
                      {role.source === 'global' ? 'Global' : 'Customizada'}
                    </span>
                  </div>
                  <div className="role-actions">
                    {role.source === 'global' ? (
                      <button
                        className="btn-icon"
                        onClick={() => openDuplicateModal(role)}
                        title="Duplicar e personalizar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(role)}
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(role)}
                          disabled={deleting === role.id}
                          title="Excluir"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="role-code">Código: <code>{role.code}</code></div>
                {role.description && (
                  <p className="role-description">{role.description}</p>
                )}
                {role.responsibilities && (
                  <div className="role-responsibilities">
                    <strong>Responsabilidades:</strong>
                    <p>{role.responsibilities}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="info-box">
          <h3>ℹ️ Sobre Roles</h3>
          <ul>
            <li><strong>Roles Globais:</strong> Fixas, disponíveis para todos. Apenas administradores podem editar.</li>
            <li><strong>Roles Customizadas:</strong> Criadas por você para este workspace. Podem ser editadas ou excluídas.</li>
            <li><strong>Duplicar:</strong> Clone uma role global para criar sua versão personalizada.</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'create' && 'Criar Nova Role'}
                {modalMode === 'edit' && 'Editar Role'}
                {modalMode === 'duplicate' && 'Duplicar Role'}
              </h2>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="code">Código *</label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ex: frontend_dev"
                  disabled={modalMode === 'edit'}
                />
                <small>Identificador único (não pode ser alterado após criação)</small>
              </div>
              <div className="form-group">
                <label htmlFor="label">Nome *</label>
                <input
                  id="label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: Frontend Developer"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o papel desta especialidade"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label htmlFor="responsibilities">Responsabilidades</label>
                <textarea
                  id="responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="Liste as principais responsabilidades"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
