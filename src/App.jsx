import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import WorkspacesList from './pages/WorkspacesList'
import SquadsList from './pages/SquadsList'
import CreateSquad from './pages/CreateSquad'
import SquadDetail from './pages/SquadDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/workspaces" 
              element={
                <ProtectedRoute>
                  <WorkspacesList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspaces/:workspaceId/squads" 
              element={
                <ProtectedRoute>
                  <SquadsList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspaces/:workspaceId/squads/create" 
              element={
                <ProtectedRoute>
                  <CreateSquad />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspaces/:workspaceId/squads/:squadId" 
              element={
                <ProtectedRoute>
                  <SquadDetail />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/workspaces" replace />} />
            <Route path="*" element={<Navigate to="/workspaces" replace />} />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
