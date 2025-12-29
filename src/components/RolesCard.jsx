import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './RolesCard.css'

export default function RolesCard({ squadId, workspaceId, onUpdate }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllModal, setShowAllModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [createForm, setCreateForm] = useState({
    code: '',
    label: '',
    description: '',
    responsibilities: ''
  })
  const [availableRoles, setAvailableRoles] = useState([])
  const [adding, setAdding] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const loadRoles = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/squad-roles?squad_id=${squadId}`,
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
      // Filter only active roles
      const activeRoles = (data.roles || []).filter(r => r.active)
      setRoles(activeRoles)
    } catch (err) {
      console.error('Error loading roles:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableRoles = async () => {
    try {
      // Load all available roles
      const rolesRes = await fetch(
        `/.netlify/functions/roles?workspace_id=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!rolesRes.ok) {
        throw new Error('Erro ao carregar roles disponíveis')
      }

      const rolesData = await rolesRes.json()
      const allRoles = rolesData.roles || []

      // Filter out roles that are already active in the squad
      const activeRoleIds = roles.map(r => r.role_id)
      const available = allRoles.filter(role => !activeRoleIds.includes(role.id))
      
      setAvailableRoles(available)
    } catch (err) {
      console.error('Error loading available roles:', err)
    }
  }

  useEffect(() => {
    if (squadId && token) {
      loadRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId, token])

  const handleAddRole = async (role) => {
    try {
      setAdding(role.id)
      
      // Ensure role has a valid source property, default to 'global' if missing
      const roleSource = role.source || 'global'
      
      const body = {
        squad_id: squadId,
        role_id: roleSource === 'global' ? role.id : null,
        workspace_role_id: roleSource === 'workspace' ? role.id : null
      }

      const res = await fetch('/.netlify/functions/squad-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao adicionar role')
      }

      await loadRoles()
      if (onUpdate) onUpdate()
      
      // Refresh available roles
      await loadAvailableRoles()
    } catch (err) {
      console.error('Error adding role:', err)
      // Note: Using alert() temporarily. Consider implementing a toast notification system.
      alert(err.message || 'Erro ao adicionar role')
    } finally {
      setAdding(null)
    }
  }

  const openAddModal = async () => {
    await loadAvailableRoles()
    setShowAddModal(true)
  }

  const handleRemoveRole = async (role) => {
    setConfirmRemove(null)
    
    try {
      setRemoving(role.squad_role_id)
      
      const res = await fetch(
        `/.netlify/functions/squad-roles?squad_role_id=${role.squad_role_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover vínculo')
      }

      await loadRoles()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error removing role:', err)
      alert(err.message || 'Erro ao remover vínculo do papel')
    } finally {
      setRemoving(null)
    }
  }

  const confirmRemoveRole = (role) => {
    setConfirmRemove(role)
  }

  // Open create modal
  const openCreateModal = () => {
    setCreateForm({
      code: '',
      label: '',
      description: '',
      responsibilities: ''
    })
    setShowCreateModal(true)
  }

  // Create new workspace role
  const handleCreateRole = async () => {
    if (!createForm.code || !createForm.label) {
      alert('Código e nome são obrigatórios')
      return
    }

    try {
      setCreating(true)

      const res = await fetch('/.netlify/functions/workspace-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...createForm
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar role')
      }

      setShowCreateModal(false)
      await loadRoles()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error creating role:', err)
      alert(err.message || 'Erro ao criar role')
    } finally {
      setCreating(false)
    }
  }

  // Open detail modal for a role
  const handleRoleClick = (role) => {
    setSelectedRole(role)
    setEditForm({
      label: role.label,
      description: role.description || '',
      responsibilities: role.responsibilities || ''
    })
    setEditMode(role.source === 'workspace')
    setShowDetailModal(true)
  }

  // Save role edits
  const handleSaveRole = async () => {
    if (!editForm.label || !editForm.label.trim()) {
      alert('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)

      const res = await fetch(
        `/.netlify/functions/workspace-roles/${selectedRole.role_id}`,
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
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar role')
      }

      await loadRoles()
      if (onUpdate) onUpdate()
      setShowDetailModal(false)
      setSelectedRole(null)
    } catch (err) {
      console.error('Error saving role:', err)
      alert(err.message || 'Erro ao salvar role')
    } finally {
      setSaving(false)
    }
  }

  // Duplicate global role to workspace and replace in squad
  const handleDuplicateAndReplace = async () => {
    if (!selectedRole || selectedRole.source !== 'global') {
      return
    }

    if (!confirm('Isso criará uma cópia deste papel no workspace e substituirá o vínculo nesta squad. Deseja continuar?')) {
      return
    }

    try {
      setDuplicating(true)

      // Create workspace role
      const createRes = await fetch('/.netlify/functions/workspace-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          code: `${selectedRole.code}_custom`,
          label: selectedRole.label,
          description: selectedRole.description || '',
          responsibilities: selectedRole.responsibilities || ''
        })
      })

      if (!createRes.ok) {
        const data = await createRes.json()
        throw new Error(data.error || 'Erro ao criar role')
      }

      const newRole = await createRes.json()

      // Remove old association
      const removeRes = await fetch(
        `/.netlify/functions/squad-roles?squad_role_id=${selectedRole.squad_role_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!removeRes.ok) {
        throw new Error('Erro ao remover vínculo antigo')
      }

      // Add new association
      const addRes = await fetch('/.netlify/functions/squad-roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          squad_id: squadId,
          workspace_role_id: newRole.role.id
        })
      })

      if (!addRes.ok) {
        throw new Error('Erro ao adicionar novo vínculo')
      }

      // Reload roles
      await loadRoles()
      if (onUpdate) onUpdate()

      // Find the newly added role in the list
      const updatedRoles = await fetch(
        `/.netlify/functions/squad-roles?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ).then(r => r.json())

      const newlyAdded = (updatedRoles.roles || []).find(r => r.role_id === newRole.role.id)
      
      if (newlyAdded) {
        // Open in edit mode
        setSelectedRole(newlyAdded)
        setEditForm({
          label: newlyAdded.label,
          description: newlyAdded.description || '',
          responsibilities: newlyAdded.responsibilities || ''
        })
        setEditMode(true)
      } else {
        setShowDetailModal(false)
      }
    } catch (err) {
      console.error('Error duplicating and replacing role:', err)
      alert(err.message || 'Erro ao duplicar papel')
    } finally {
      setDuplicating(false)
    }
  }

  if (loading) {
    return (
      <div className="roles-card">
        <div className="roles-card-header">
          <h2>Papéis da Squad</h2>
        </div>
        <div className="roles-loading">Carregando...</div>
      </div>
    )
  }

  // Get top 3 roles for display
  const topRoles = roles.slice(0, 3)
  const hasMore = roles.length > 3

  return (
    <>
      <div className="roles-card">
        <div className="roles-card-header">
          <h2>Papéis da Squad</h2>
          <div className="roles-card-actions">
            <button 
              className="btn-link"
              onClick={openAddModal}
              title="Adicionar papel existente"
            >
              + Adicionar
            </button>
            <button 
              className="btn-link"
              onClick={openCreateModal}
              title="Criar novo papel"
            >
              Criar
            </button>
            <button 
              className="btn-link"
              onClick={() => navigate(`/workspaces/${workspaceId}/roles`)}
              title="Gerenciar papéis do workspace"
            >
              Gerenciar
            </button>
          </div>
        </div>
        
        {roles.length === 0 ? (
          <p className="roles-empty-text">Nenhum papel associado</p>
        ) : (
          <>
            <div className="roles-list">
              {topRoles.map((role) => (
                <div 
                  key={role.squad_role_id} 
                  className="role-item role-item-clickable"
                  onClick={() => handleRoleClick(role)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="role-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="role-info">
                    <div className="role-name">{role.label}</div>
                    <div className="role-meta">
                      <span className={`role-source ${role.source}`}>
                        {role.source === 'global' ? 'Global' : 'Workspace'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-remove-role"
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmRemoveRole(role)
                    }}
                    disabled={removing === role.squad_role_id}
                    title="Remover papel da squad"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {hasMore && (
              <button 
                className="btn-view-all"
                onClick={() => setShowAllModal(true)}
              >
                Ver todos ({roles.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal: View All Roles */}
      {showAllModal && (
        <div className="modal-overlay" onClick={() => setShowAllModal(false)}>
          <div className="modal-content roles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Todos os Papéis da Squad</h2>
              <button className="btn-close" onClick={() => setShowAllModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {roles.length === 0 ? (
                <p className="roles-empty-text">Nenhum papel associado</p>
              ) : (
                <div className="roles-list-full">
                  {roles.map((role) => (
                    <div key={role.squad_role_id} className="role-item-full">
                      <div className="role-item-header">
                        <div className="role-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="role-info">
                          <div className="role-name">{role.label}</div>
                          <span className={`role-source ${role.source}`}>
                            {role.source === 'global' ? 'Global' : 'Workspace'}
                          </span>
                        </div>
                        <button
                          className="btn-remove-role"
                          onClick={() => confirmRemoveRole(role)}
                          disabled={removing === role.squad_role_id}
                          title="Remover papel da squad"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAllModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Role */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content roles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionar Papel à Squad</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {availableRoles.length === 0 ? (
                <p className="roles-empty-text">
                  Todos os papéis disponíveis já estão associados a esta squad.
                  <br />
                  <button 
                    className="btn-link"
                    onClick={() => {
                      setShowAddModal(false)
                      navigate(`/workspaces/${workspaceId}/roles`)
                    }}
                  >
                    Criar novo papel
                  </button>
                </p>
              ) : (
                <div className="roles-list-full">
                  {availableRoles.map((role) => (
                    <div key={role.id} className="role-item-full role-item-add">
                      <div className="role-item-header">
                        <div className="role-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="role-info">
                          <div className="role-name">{role.label}</div>
                          <span className={`role-source ${role.source}`}>
                            {role.source === 'global' ? 'Global' : 'Workspace'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm btn-add-role"
                        onClick={() => handleAddRole(role)}
                        disabled={adding === role.id}
                      >
                        {adding === role.id ? 'Adicionando...' : 'Adicionar'}
                      </button>
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Remove Role */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remover Papel da Squad</h2>
              <button className="btn-close" onClick={() => setConfirmRemove(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Tem certeza que deseja remover o papel <strong>{confirmRemove.label}</strong> desta squad?
              </p>
              <p className="confirm-note">
                ⚠️ <strong>Nota:</strong> Apenas o vínculo com esta squad será removido. 
                O papel continuará disponível no sistema e em outras squads.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setConfirmRemove(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleRemoveRole(confirmRemove)}
                disabled={removing === confirmRemove.squad_role_id}
              >
                {removing === confirmRemove.squad_role_id ? 'Removendo...' : 'Remover Vínculo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Role */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal-content roles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Criar Novo Papel</h2>
              <button className="btn-close" onClick={() => !creating && setShowCreateModal(false)} disabled={creating}>×</button>
            </div>
            <div className="modal-body">
              <div className="role-edit-form">
                <div className="form-group">
                  <label htmlFor="create-code">Código *</label>
                  <input
                    id="create-code"
                    type="text"
                    className="form-input"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    placeholder="ex: frontend_dev"
                  />
                  <small>Identificador único (não pode ser alterado após criação)</small>
                </div>
                <div className="form-group">
                  <label htmlFor="create-label">Nome *</label>
                  <input
                    id="create-label"
                    type="text"
                    className="form-input"
                    value={createForm.label}
                    onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                    placeholder="ex: Frontend Developer"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="create-description">Descrição</label>
                  <textarea
                    id="create-description"
                    className="form-textarea"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Descreva o papel desta especialidade"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="create-responsibilities">Responsabilidades</label>
                  <textarea
                    id="create-responsibilities"
                    className="form-textarea"
                    value={createForm.responsibilities}
                    onChange={(e) => setCreateForm({ ...createForm, responsibilities: e.target.value })}
                    placeholder="Liste as principais responsabilidades"
                    rows="4"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateRole}
                disabled={creating}
              >
                {creating ? 'Criando...' : 'Criar Papel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Role Detail */}
      {showDetailModal && selectedRole && (
        <div className="modal-overlay" onClick={() => !saving && !duplicating && setShowDetailModal(false)}>
          <div className="modal-content roles-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Editar Papel' : 'Detalhes do Papel'}</h2>
              <button className="btn-close" onClick={() => !saving && !duplicating && setShowDetailModal(false)} disabled={saving || duplicating}>×</button>
            </div>
            <div className="modal-body">
              {editMode ? (
                <div className="role-edit-form">
                  <div className="form-group">
                    <label htmlFor="edit-label">Nome *</label>
                    <input
                      id="edit-label"
                      type="text"
                      className="form-input"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      placeholder="Nome do papel"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-description">Descrição</label>
                    <textarea
                      id="edit-description"
                      className="form-textarea"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Descrição do papel"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-responsibilities">Responsabilidades</label>
                    <textarea
                      id="edit-responsibilities"
                      className="form-textarea"
                      value={editForm.responsibilities}
                      onChange={(e) => setEditForm({ ...editForm, responsibilities: e.target.value })}
                      placeholder="Responsabilidades do papel"
                      rows="4"
                    />
                  </div>
                </div>
              ) : (
                <div className="role-detail-view">
                  <div className="role-detail-header">
                    <div className="role-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <h3>{selectedRole.label}</h3>
                      <span className={`role-source ${selectedRole.source}`}>
                        {selectedRole.source === 'global' ? 'Global' : 'Workspace'}
                      </span>
                      {selectedRole.code && (
                        <div className="role-code-badge">
                          <code>{selectedRole.code}</code>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedRole.description && (
                    <div className="role-detail-section">
                      <strong>Descrição:</strong>
                      <p>{selectedRole.description}</p>
                    </div>
                  )}
                  
                  {selectedRole.responsibilities && (
                    <div className="role-detail-section">
                      <strong>Responsabilidades:</strong>
                      <p>{selectedRole.responsibilities}</p>
                    </div>
                  )}

                  {selectedRole.source === 'global' && (
                    <div className="duplicate-info-box">
                      <p>
                        Este é um papel global (somente leitura). Para editá-lo, você pode duplicá-lo para o workspace.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
                disabled={saving || duplicating}
              >
                {editMode ? 'Cancelar' : 'Fechar'}
              </button>
              {editMode ? (
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveRole}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              ) : selectedRole.source === 'global' && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleDuplicateAndReplace}
                  disabled={duplicating}
                >
                  {duplicating ? 'Duplicando...' : 'Duplicar para Workspace e Substituir'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
