// netlify/functions/auth-github-start.js
// Initiate GitHub OAuth flow for workspace connection

const { json, corsResponse } = require("./_lib/response");

const githubClientId = process.env.GITHUB_CLIENT_ID;
const frontendUrl = process.env.FRONTEND_URL || "https://squadsvirtuais.com";

exports.handler = async (event) => {
  try {
    console.log("[auth-github-start] Iniciando fluxo OAuth GitHub");

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return corsResponse();
    }

    // Only allow POST
    if (event.httpMethod !== "POST") {
      console.log("[auth-github-start] Método não permitido:", event.httpMethod);
      return json(405, { error: "Method Not Allowed" });
    }

    // Check environment variables
    if (!githubClientId) {
      console.error("[auth-github-start] GITHUB_CLIENT_ID não configurado");
      return json(500, { error: "GITHUB_CLIENT_ID não configurado" });
    }

    // Parse request body
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (parseError) {
      console.error("[auth-github-start] Erro ao fazer parse do body:", parseError.message);
      return json(400, { error: "Body JSON inválido" });
    }

    // Get workspace_id from request
    const workspaceId = body.workspace_id;
    if (!workspaceId) {
      console.error("[auth-github-start] workspace_id ausente no body");
      return json(400, { error: "workspace_id é obrigatório" });
    }

    console.log("[auth-github-start] workspace_id:", workspaceId);

    // Build OAuth redirect URI
    const redirectUri = `${frontendUrl}/.netlify/functions/auth-github-callback`;
    
    // Request repo scope for repository access
    const scope = "read:user user:email repo";
    
    // Build state parameter with workspace_id
    const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64');
    
    // Build GitHub authorization URL
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

    console.log("[auth-github-start] URL OAuth gerada com sucesso");

    return json(200, {
      ok: true,
      authorization_url: githubAuthUrl,
    });
  } catch (error) {
    console.error("[auth-github-start] Erro inesperado:", error.message);
    console.error("[auth-github-start] Stack:", error.stack);
    return json(500, { error: "Erro interno ao iniciar OAuth" });
  }
};
