import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        placeItems: 'center', 
        minHeight: '100vh',
        color: '#64748b'
      }}>
        Carregando...
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}
