import './App.css'
import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useState } from 'react'

export default function App() {
  const [errorMessage, setErrorMessage] = useState(null)

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
      
      // Map error codes to user-friendly messages in Portuguese
      const errorMessages = {
        'github_config_error': 'GitHub OAuth não configurado corretamente. Entre em contato com o administrador.',
        'github_auth_failed': 'Falha na autenticação com GitHub. Tente novamente.',
        'github_email_missing': 'Não foi possível obter seu email do GitHub. Verifique suas configurações de privacidade.',
        'internal_error': 'Erro interno do servidor. Tente novamente mais tarde.',
        'github_oauth_error': 'Erro no processo de autenticação GitHub.',
        'github_code_missing': 'Código de autenticação não recebido.',
        'github_state_missing': 'Estado de autenticação inválido.',
        'github_invalid_state': 'Estado de autenticação inválido.',
        'github_token_exchange_failed': 'Falha ao trocar código de autenticação.',
        'github_user_fetch_failed': 'Falha ao buscar dados do usuário GitHub.',
        'github_db_error': 'Erro ao salvar conexão GitHub.',
        'github_internal_error': 'Erro interno ao processar autenticação GitHub.'
      }
      
      const message = errorMessages[error] || 'Erro desconhecido no login.'
      
      // Use a microtask to avoid setState in effect
      Promise.resolve().then(() => {
        setErrorMessage(message)
      })
      
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

        {errorMessage && (
          <div className="error-message" style={{
            backgroundColor: '#fee',
            border: '1px solid #c33',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            color: '#c33'
          }}>
            {errorMessage}
          </div>
        )}

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
