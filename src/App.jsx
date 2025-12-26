import './App.css'
import { GoogleLogin } from '@react-oauth/google'

export default function App() {
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
            onSuccess={async (credentialResponse) => {
              const idToken = credentialResponse?.credential

              if (!idToken) {
                console.error('ID Token não veio do Google.')
                return
              }

              try {
                const res = await fetch('/.netlify/functions/auth-google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_token: idToken }),
                })

                const data = await res.json()
                console.log('Resposta backend:', data)
              } catch (err) {
                console.error('Erro chamando backend:', err)
              }
            }}
            onError={() => {
              console.log('Erro no login Google')
            }}
            useOneTap={false}
          />

          <button className="btn btn-github" type="button" disabled>
            Entrar com GitHub (em breve)
          </button>
        </div>

        <p className="hint">
          Ao continuar, você concorda com os termos e a política de privacidade.
        </p>
      </div>
    </div>
  )
}
