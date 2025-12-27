/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('authToken')
      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/.netlify/functions/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        })

        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setToken(storedToken)
        } else {
          // Token invalid, clear it
          localStorage.removeItem('authToken')
          setToken(null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        localStorage.removeItem('authToken')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = (newToken) => {
    localStorage.setItem('authToken', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
