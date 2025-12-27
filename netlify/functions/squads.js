// netlify/functions/squads.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

exports.handler = async (event) => {
  try {
    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[squads] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    
    // Get workspace_id from query params
    const workspaceId = event.queryStringParameters?.workspace_id;
    
    if (!workspaceId) {
      return json(400, { error: "workspace_id é obrigatório" });
    }

    console.log("[squads] Listando squads para workspace:", workspaceId);

    // Verify user is member of workspace
    const memberCheck = await query(
      `
      SELECT 1 FROM sv.workspace_members
      WHERE workspace_id = $1 AND user_id = $2
      `,
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      console.log("[squads] Usuário não é membro do workspace");
      return json(403, { error: "Acesso negado ao workspace" });
    }

    // Get squads for workspace
    const result = await query(
      `
      SELECT 
        id,
        name,
        description,
        workspace_id,
        created_at
      FROM sv.squads
      WHERE workspace_id = $1
      ORDER BY name
      `,
      [workspaceId]
    );

    console.log("[squads] Encontrados", result.rows.length, "squads");

    return json(200, {
      ok: true,
      squads: result.rows
    });

  } catch (error) {
    console.error("[squads] Erro ao listar squads:", error.message);
    console.error("[squads] Stack:", error.stack);
    return json(500, { error: "Erro ao listar squads" });
  }
};
