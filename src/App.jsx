import './App.css'
import { GoogleLogin } from '@react-oauth/google'
import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    // Handle OAuth callback with token from GitHub
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const error = urlParams.get('error')

    if (token) {
      console.log('Login GitHub bem-sucedido. Token recebido:', token)
      // Store token and redirect to main app
      localStorage.setItem('authToken', token)
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
      // TODO: Redirect to dashboard or update UI
    }

    if (error) {
      console.error('Erro no login GitHub:', error)
      // Clear error from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleGithubLogin = () => {
    window.location.href = '/.netlify/functions/auth-github'
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential

    if (!idToken) {
      console.error('ID Token não veio do Google.')
      return
    }

    try {
      const res = await fetch('/.netlify/functions/auth-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await res.json()
      
      if (data.ok && data.token) {
        console.log('Login Google bem-sucedido')
        localStorage.setItem('authToken', data.token)
        // TODO: Redirect to dashboard or update UI
      } else {
        console.error('Erro na resposta:', data)
      }
    } catch (err) {
      console.error('Erro chamando backend:', err)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="logo">SV</div>
          <div>
            <h1>Squads Virtuais</h1>
            <p>Entre para criar e gerenciar seus squads.</p>
          </div>
        </div>

        <div className="actions">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Erro no login Google')
            }}
            useOneTap={false}
          />

          <button 
            className="btn btn-github" 
            type="button" 
            onClick={handleGithubLogin}
          >
            Entrar com GitHub
          </button>
        </div>

        <p className="hint">
          Ao continuar, você concorda com os termos e a política de privacidade.
        </p>
      </div>
    </div>
  )
}
