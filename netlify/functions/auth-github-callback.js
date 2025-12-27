// netlify/functions/auth-github-callback.js
// Handle GitHub OAuth callback and persist connection

const { query } = require("./_lib/db");
const { json, redirect } = require("./_lib/response");
const { exchangeCodeForToken, getGithubUser, getGithubUserEmail } = require("./_lib/github-api");

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRETS_OAUTH;
const frontendUrl = process.env.FRONTEND_URL || "https://squadsvirtuais.com";

exports.handler = async (event) => {
  try {
    console.log("[auth-github-callback] Processando callback OAuth");

    // Only allow GET
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method Not Allowed" });
    }

    const { code, state, error: oauthError } = event.queryStringParameters || {};

    // Handle OAuth errors
    if (oauthError) {
      console.error("[auth-github-callback] Erro OAuth:", oauthError);
      return redirect(`${frontendUrl}?error=github_oauth_error&details=${encodeURIComponent(oauthError)}`);
    }

    // Validate code
    if (!code) {
      console.error("[auth-github-callback] Code ausente");
      return redirect(`${frontendUrl}?error=github_code_missing`);
    }

    // Validate state and extract workspace_id
    if (!state) {
      console.error("[auth-github-callback] State ausente");
      return redirect(`${frontendUrl}?error=github_state_missing`);
    }

    let workspaceId;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      workspaceId = stateData.workspace_id;
      if (!workspaceId) {
        throw new Error("workspace_id not found in state");
      }
      console.log("[auth-github-callback] workspace_id extraído do state:", workspaceId);
    } catch (stateError) {
      console.error("[auth-github-callback] Erro ao processar state:", stateError.message);
      return redirect(`${frontendUrl}?error=github_invalid_state`);
    }

    // Check environment variables
    if (!githubClientId || !githubClientSecret) {
      console.error("[auth-github-callback] GitHub OAuth não configurado");
      return redirect(`${frontendUrl}?error=github_config_error`);
    }

    // Exchange code for access token
    let accessToken;
    try {
      console.log("[auth-github-callback] Trocando code por access_token...");
      accessToken = await exchangeCodeForToken(code, githubClientId, githubClientSecret);
      console.log("[auth-github-callback] ✓ Access token obtido");
    } catch (tokenError) {
      console.error("[auth-github-callback] Erro ao trocar code:", tokenError.message);
      return redirect(`${frontendUrl}?error=github_token_exchange_failed`);
    }

    // Get user info from GitHub
    let githubUser;
    try {
      console.log("[auth-github-callback] Buscando dados do usuário GitHub...");
      githubUser = await getGithubUser(accessToken);
      console.log("[auth-github-callback] ✓ Dados do usuário obtidos, login:", githubUser.login);
    } catch (userError) {
      console.error("[auth-github-callback] Erro ao buscar usuário:", userError.message);
      return redirect(`${frontendUrl}?error=github_user_fetch_failed`);
    }

    // Get email if not public
    let email = githubUser.email;
    if (!email) {
      try {
        console.log("[auth-github-callback] Email não público, buscando email primário...");
        email = await getGithubUserEmail(accessToken);
      } catch (emailError) {
        console.error("[auth-github-callback] Erro ao buscar email:", emailError.message);
      }
    }

    // Extract user data
    const providerUserId = String(githubUser.id);
    const login = githubUser.login;
    const avatarUrl = githubUser.avatar_url || "";
    const now = new Date().toISOString();

    console.log("[auth-github-callback] Dados extraídos - provider_user_id:", providerUserId, "login:", login);

    // Persist GitHub connection
    try {
      console.log("[auth-github-callback] Persistindo conexão GitHub...");
      
      // Upsert github_connections
      await query(
        `
        INSERT INTO sv.github_connections (
          workspace_id, 
          provider_user_id, 
          login, 
          avatar_url, 
          access_token, 
          connected_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (workspace_id, provider_user_id)
        DO UPDATE SET
          login = EXCLUDED.login,
          avatar_url = EXCLUDED.avatar_url,
          access_token = EXCLUDED.access_token,
          connected_at = EXCLUDED.connected_at
        `,
        [workspaceId, providerUserId, login, avatarUrl, accessToken, now]
      );

      console.log("[auth-github-callback] ✓ Conexão GitHub persistida com sucesso");
    } catch (dbError) {
      console.error("[auth-github-callback] Erro ao persistir conexão:", dbError.message);
      console.error("[auth-github-callback] Stack:", dbError.stack);
      console.error("[auth-github-callback] Código:", dbError.code);
      console.error("[auth-github-callback] Detalhes:", dbError.detail);
      return redirect(`${frontendUrl}?error=github_db_error`);
    }

    // Redirect to frontend with success
    console.log("[auth-github-callback] OAuth concluído com sucesso");
    return redirect(`${frontendUrl}?github_connected=true&workspace_id=${encodeURIComponent(workspaceId)}`);
  } catch (error) {
    console.error("[auth-github-callback] Erro inesperado:", error.message);
    console.error("[auth-github-callback] Stack:", error.stack);
    return redirect(`${frontendUrl}?error=github_internal_error`);
  }
};
