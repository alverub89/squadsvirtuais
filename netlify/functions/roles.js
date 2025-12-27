// netlify/functions/roles.js
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
      console.error("[roles] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    // Get workspace_id from query params (optional)
    const workspaceId = event.queryStringParameters?.workspace_id;
    
    console.log("[roles] Listando roles", workspaceId ? `para workspace ${workspaceId}` : "globais");

    // Get global roles
    const globalRolesResult = await query(
      `
      SELECT 
        id,
        code,
        label,
        description,
        responsibilities,
        default_active,
        'global' as source,
        created_at
      FROM sv.roles
      ORDER BY label
      `
    );

    let workspaceRoles = [];
    
    // If workspace_id is provided, also get workspace-specific roles
    if (workspaceId) {
      // Verify user is member of workspace
      const memberCheck = await query(
        `
        SELECT 1 FROM sv.workspace_members
        WHERE workspace_id = $1 AND user_id = $2
        `,
        [workspaceId, decoded.userId]
      );

      if (memberCheck.rows.length === 0) {
        console.log("[roles] Usuário não é membro do workspace");
        return json(403, { error: "Acesso negado ao workspace" });
      }

      const workspaceRolesResult = await query(
        `
        SELECT 
          id,
          workspace_id,
          code,
          label,
          description,
          responsibilities,
          active,
          'workspace' as source,
          created_at
        FROM sv.workspace_roles
        WHERE workspace_id = $1 AND active = true
        ORDER BY label
        `,
        [workspaceId]
      );

      workspaceRoles = workspaceRolesResult.rows;
    }

    const allRoles = [...globalRolesResult.rows, ...workspaceRoles];

    console.log("[roles] Encontrados", allRoles.length, "roles");

    return json(200, {
      ok: true,
      roles: allRoles
    });

  } catch (error) {
    console.error("[roles] Erro ao listar roles:", error.message);
    console.error("[roles] Stack:", error.stack);
    return json(500, { error: "Erro ao listar roles" });
  }
};
