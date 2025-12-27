import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import './Layout.css'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { workspaceId } = useParams()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { activeWorkspace, clearWorkspace } = useWorkspace()
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

  const handleLogout = () => {
    logout()
    clearWorkspace()
    navigate('/login')
  }

  const handleWorkspacesClick = () => {
    clearWorkspace()
    navigate('/workspaces')
  }

  const handleWorkspaceSwitch = () => {
    setShowWorkspaceMenu(false)
    clearWorkspace()
    navigate('/workspaces')
  }

  const isInWorkspace = workspaceId && activeWorkspace
  const currentPath = location.pathname

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          {/* Workspace selector for desktop */}
          {isInWorkspace ? (
            <div className="workspace-selector" onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}>
              <div className="workspace-avatar">
                {activeWorkspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="workspace-info">
                <span className="workspace-name">{activeWorkspace.name}</span>
                <span className="workspace-type">Produto</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6l4 4 4-4" />
              </svg>
              {showWorkspaceMenu && (
                <div className="workspace-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={handleWorkspaceSwitch} className="workspace-menu-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Trocar workspace
                  </button>
                  <button onClick={handleWorkspaceSwitch} className="workspace-menu-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
                    </svg>
                    Configurações do workspace
                  </button>
                  <button onClick={handleWorkspaceSwitch} className="workspace-menu-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Criar novo workspace
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="brand-small">
              <div className="logo-small">SV</div>
              <span>Squads Virtuais</span>
            </div>
          )}
          <div className="header-actions">
            {user && (
              <>
                <span className="user-name">{user.name}</span>
                <button onClick={handleLogout} className="btn-logout">
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="layout-body">
        {/* Desktop sidebar */}
        {isInWorkspace && (
          <aside className="sidebar-nav">
            <button 
              className="btn-create-squad"
              onClick={() => navigate(`/workspaces/${workspaceId}/squads/create`)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Criar nova Squad
            </button>
            <nav className="sidebar-menu">
              <button 
                className="sidebar-item"
                onClick={() => navigate('/')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Início
              </button>
              <button 
                className={`sidebar-item ${currentPath.includes('/squads') ? 'active' : ''}`}
                onClick={() => navigate(`/workspaces/${workspaceId}/squads`)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
                Squads
              </button>
              <button className="sidebar-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Personas
              </button>
              <button className="sidebar-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
                Backlog
              </button>
              <button className="sidebar-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Issues
              </button>
            </nav>
            <div className="sidebar-footer">
              <button className="sidebar-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
                </svg>
                Configurações
              </button>
            </div>
          </aside>
        )}

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav">
        <button 
          className="nav-item"
          onClick={handleWorkspacesClick}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>Workspaces</span>
        </button>
      </nav>
    </div>
  )
}
