// netlify/functions/github-repos-connect.js
// Connect a GitHub repository to a workspace

const { query } = require("./_lib/db");
const { json, corsResponse } = require("./_lib/response");
const { getRepository } = require("./_lib/github-api");

exports.handler = async (event) => {
  try {
    console.log("[github-repos-connect] Conectando repositório ao workspace");

    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return corsResponse();
    }

    // Only allow POST
    if (event.httpMethod !== "POST") {
      console.log("[github-repos-connect] Método não permitido:", event.httpMethod);
      return json(405, { error: "Method Not Allowed" });
    }

    // Parse request body
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (parseError) {
      console.error("[github-repos-connect] Erro ao fazer parse do body:", parseError.message);
      return json(400, { error: "Body JSON inválido" });
    }

    // Extract required fields
    const { workspace_id, repo_full_name } = body;

    if (!workspace_id) {
      console.error("[github-repos-connect] workspace_id ausente");
      return json(400, { error: "workspace_id é obrigatório" });
    }

    if (!repo_full_name) {
      console.error("[github-repos-connect] repo_full_name ausente");
      return json(400, { error: "repo_full_name é obrigatório (formato: owner/repo)" });
    }

    // Validate repo_full_name format
    const parts = repo_full_name.split('/');
    if (parts.length !== 2) {
      console.error("[github-repos-connect] repo_full_name inválido:", repo_full_name);
      return json(400, { error: "repo_full_name deve estar no formato 'owner/repo'" });
    }

    const [owner, repo] = parts;
    console.log("[github-repos-connect] workspace_id:", workspace_id, "repo:", repo_full_name);

    // Get GitHub connection for workspace
    let connection;
    try {
      console.log("[github-repos-connect] Buscando conexão GitHub...");
      const result = await query(
        `
        SELECT id, provider_user_id, login, access_token
        FROM sv.github_connections
        WHERE workspace_id = $1
        ORDER BY connected_at DESC
        LIMIT 1
        `,
        [workspace_id]
      );

      if (!result.rows || result.rows.length === 0) {
        console.error("[github-repos-connect] Conexão GitHub não encontrada");
        return json(404, { error: "Workspace não possui conexão GitHub ativa" });
      }

      connection = result.rows[0];
      console.log("[github-repos-connect] ✓ Conexão encontrada");
    } catch (dbError) {
      console.error("[github-repos-connect] Erro ao buscar conexão:", dbError.message);
      return json(500, { error: "Erro ao buscar conexão GitHub" });
    }

    // Fetch repository details from GitHub
    let repoData;
    try {
      console.log("[github-repos-connect] Buscando detalhes do repositório da API GitHub...");
      repoData = await getRepository(connection.access_token, owner, repo);
      console.log("[github-repos-connect] ✓ Repositório encontrado:", repoData.full_name);
    } catch (apiError) {
      console.error("[github-repos-connect] Erro ao buscar repositório:", apiError.message);
      
      if (apiError.message.includes("404")) {
        return json(404, { error: "Repositório não encontrado ou sem acesso" });
      }
      
      if (apiError.message.includes("401")) {
        return json(401, { error: "Token GitHub expirado ou revogado. Reconecte a conta." });
      }
      
      return json(500, { error: "Erro ao verificar repositório no GitHub" });
    }

    // Determine permission level
    const permissions = repoData.permissions || {};
    let permissionsLevel = "read";
    if (permissions.admin) {
      permissionsLevel = "admin";
    } else if (permissions.push) {
      permissionsLevel = "write";
    }

    const defaultBranch = repoData.default_branch || "main";
    const now = new Date().toISOString();

    // Connect repository to workspace
    try {
      console.log("[github-repos-connect] Conectando repositório ao workspace...");
      
      const result = await query(
        `
        INSERT INTO sv.repo_connections (
          workspace_id,
          repo_full_name,
          default_branch,
          permissions_level,
          connected_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (workspace_id, repo_full_name)
        DO UPDATE SET
          default_branch = EXCLUDED.default_branch,
          permissions_level = EXCLUDED.permissions_level,
          connected_at = EXCLUDED.connected_at
        RETURNING id, workspace_id, repo_full_name, default_branch, permissions_level, connected_at
        `,
        [workspace_id, repo_full_name, defaultBranch, permissionsLevel, now]
      );

      const repoConnection = result.rows[0];
      console.log("[github-repos-connect] ✓ Repositório conectado com sucesso, id:", repoConnection.id);

      return json(200, {
        ok: true,
        message: "Repositório conectado com sucesso",
        connection: {
          id: repoConnection.id,
          workspace_id: repoConnection.workspace_id,
          repo_full_name: repoConnection.repo_full_name,
          default_branch: repoConnection.default_branch,
          permissions_level: repoConnection.permissions_level,
          connected_at: repoConnection.connected_at,
        },
      });
    } catch (dbError) {
      console.error("[github-repos-connect] Erro ao conectar repositório:", dbError.message);
      console.error("[github-repos-connect] Código:", dbError.code);
      console.error("[github-repos-connect] Detalhes:", dbError.detail);
      
      // Check for unique constraint violation (duplicate)
      if (dbError.code === '23505') {
        return json(409, { error: "Repositório já conectado ao workspace" });
      }
      
      return json(500, { error: "Erro ao conectar repositório ao workspace" });
    }
  } catch (error) {
    console.error("[github-repos-connect] Erro inesperado:", error.message);
    console.error("[github-repos-connect] Stack:", error.stack);
    return json(500, { error: "Erro interno ao conectar repositório" });
  }
};
