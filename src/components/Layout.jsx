import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import './Layout.css'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { clearWorkspace } = useWorkspace()

  const handleLogout = () => {
    logout()
    clearWorkspace()
    navigate('/login')
  }

  const handleWorkspacesClick = () => {
    clearWorkspace()
    navigate('/workspaces')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="brand-small">
            <div className="logo-small">SV</div>
            <span>Squads Virtuais</span>
          </div>
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

      <main className="main-content">
        {children}
      </main>

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
