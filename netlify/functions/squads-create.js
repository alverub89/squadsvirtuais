// netlify/functions/squads-create.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

exports.handler = async (event) => {
  try {
    // Only POST method allowed
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Método não permitido" });
    }

    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[squads-create] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    console.log("[squads-create] Criando squad para usuário");

    // Parse body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Body JSON inválido" });
    }

    const { workspace_id, name, description } = body;

    // Validate required fields
    if (!workspace_id || typeof workspace_id !== "string" || workspace_id.trim().length === 0) {
      return json(400, { error: "workspace_id é obrigatório" });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return json(400, { error: "Nome da squad é obrigatório" });
    }

    console.log("[squads-create] Validando workspace:", workspace_id);

    // Verify workspace exists
    const workspaceCheck = await query(
      `
      SELECT id FROM sv.workspaces
      WHERE id = $1
      `,
      [workspace_id]
    );

    if (workspaceCheck.rows.length === 0) {
      console.log("[squads-create] Workspace não encontrado");
      return json(404, { error: "Workspace não encontrado" });
    }

    // Verify user is member of workspace
    const memberCheck = await query(
      `
      SELECT 1 FROM sv.workspace_members
      WHERE workspace_id = $1 AND user_id = $2
      `,
      [workspace_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      console.log("[squads-create] Usuário não é membro do workspace");
      return json(403, { error: "Você não tem permissão para criar squads neste workspace" });
    }

    console.log("[squads-create] Criando squad:", name.trim());

    // Create squad with default status 'rascunho'
    const squadResult = await query(
      `
      INSERT INTO sv.squads (workspace_id, name, description, status)
      VALUES ($1, $2, $3, 'rascunho')
      RETURNING id, workspace_id, name, description, status, created_at, updated_at
      `,
      [workspace_id, name.trim(), description?.trim() || null]
    );

    const squad = squadResult.rows[0];
    console.log("[squads-create] Squad criada com ID:", squad.id);

    return json(201, {
      ok: true,
      squad
    });

  } catch (error) {
    console.error("[squads-create] Erro ao criar squad:", error.message);
    console.error("[squads-create] Stack:", error.stack);
    return json(500, { error: "Erro ao criar squad" });
  }
};
