// netlify/functions/workspaces.js
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
      console.error("[workspaces] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    console.log("[workspaces] Listando workspaces para usuário");

    // Query workspaces where user is a member
    const result = await query(
      `
      SELECT 
        w.id,
        w.name,
        w.description,
        w.type,
        (SELECT COUNT(*) FROM sv.workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM sv.squads s WHERE s.workspace_id = w.id) as squad_count
      FROM sv.workspaces w
      INNER JOIN sv.workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      ORDER BY w.name
      `,
      [userId]
    );

    console.log("[workspaces] Encontrados", result.rows.length, "workspaces");

    return json(200, { 
      ok: true,
      workspaces: result.rows 
    });

  } catch (error) {
    console.error("[workspaces] Erro ao listar workspaces:", error.message);
    console.error("[workspaces] Stack:", error.stack);
    return json(500, { error: "Erro ao listar workspaces" });
  }
};
