// netlify/functions/github-repos.js
// List GitHub repositories accessible to the workspace

const { query } = require("./_lib/db");
const { json, corsResponse } = require("./_lib/response");
const { listRepositories } = require("./_lib/github-api");

exports.handler = async (event) => {
  try {
    console.log("[github-repos] Listando repositórios GitHub");

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return corsResponse();
    }

    // Only allow GET
    if (event.httpMethod !== "GET") {
      console.log("[github-repos] Método não permitido:", event.httpMethod);
      return json(405, { error: "Method Not Allowed" });
    }

    // Get workspace_id from query parameters
    const { workspace_id } = event.queryStringParameters || {};
    
    if (!workspace_id) {
      console.error("[github-repos] workspace_id ausente");
      return json(400, { error: "workspace_id é obrigatório" });
    }

    console.log("[github-repos] workspace_id:", workspace_id);

    // Get GitHub connection for workspace
    let connection;
    try {
      console.log("[github-repos] Buscando conexão GitHub...");
      const result = await query(
        `
        SELECT id, provider_user_id, login, access_token, connected_at
        FROM sv.github_connections
        WHERE workspace_id = $1
        ORDER BY connected_at DESC
        LIMIT 1
        `,
        [workspace_id]
      );

      if (!result.rows || result.rows.length === 0) {
        console.error("[github-repos] Conexão GitHub não encontrada para workspace");
        return json(404, { error: "Workspace não possui conexão GitHub ativa" });
      }

      connection = result.rows[0];
      console.log("[github-repos] ✓ Conexão encontrada, login:", connection.login);
    } catch (dbError) {
      console.error("[github-repos] Erro ao buscar conexão:", dbError.message);
      return json(500, { error: "Erro ao buscar conexão GitHub" });
    }

    // List repositories from GitHub API
    let repositories;
    try {
      console.log("[github-repos] Listando repositórios da API GitHub...");
      const rawRepos = await listRepositories(connection.access_token, {
        visibility: "all",
        sort: "updated",
        per_page: 100,
      });

      // Transform to include only necessary metadata
      repositories = rawRepos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        private: repo.private,
        description: repo.description || "",
        html_url: repo.html_url,
        default_branch: repo.default_branch || "main",
        permissions: {
          admin: repo.permissions?.admin || false,
          push: repo.permissions?.push || false,
          pull: repo.permissions?.pull || false,
        },
        updated_at: repo.updated_at,
        language: repo.language,
      }));

      console.log("[github-repos] ✓ Listados", repositories.length, "repositórios");
    } catch (apiError) {
      console.error("[github-repos] Erro ao listar repositórios:", apiError.message);
      
      // Check if it's an authentication error (token expired/revoked)
      if (apiError.message.includes("401")) {
        return json(401, { error: "Token GitHub expirado ou revogado. Reconecte a conta." });
      }
      
      return json(500, { error: "Erro ao listar repositórios GitHub" });
    }

    // Return repositories
    return json(200, {
      ok: true,
      workspace_id: workspace_id,
      github_login: connection.login,
      repositories: repositories,
      total: repositories.length,
    });
  } catch (error) {
    console.error("[github-repos] Erro inesperado:", error.message);
    console.error("[github-repos] Stack:", error.stack);
    return json(500, { error: "Erro interno ao listar repositórios" });
  }
};
