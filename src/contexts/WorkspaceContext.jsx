/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    // Initialize from sessionStorage if available
    const stored = sessionStorage.getItem('activeWorkspace')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Error parsing stored workspace:', e)
        return null
      }
    }
    return null
  })

  const selectWorkspace = (workspace) => {
    setActiveWorkspace(workspace)
    // Store in sessionStorage for session-level persistence (cleared when tab closes)
    if (workspace) {
      sessionStorage.setItem('activeWorkspace', JSON.stringify(workspace))
    } else {
      sessionStorage.removeItem('activeWorkspace')
    }
  }

  const clearWorkspace = () => {
    setActiveWorkspace(null)
    sessionStorage.removeItem('activeWorkspace')
  }

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, selectWorkspace, clearWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
