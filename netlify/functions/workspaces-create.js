// netlify/functions/workspaces-create.js
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
      console.error("[workspaces-create] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    console.log("[workspaces-create] Criando workspace para usuário");

    // Parse body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Body JSON inválido" });
    }

    const { name, description, type } = body;

    // Validate required field
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return json(400, { error: "Nome do workspace é obrigatório" });
    }

    console.log("[workspaces-create] Criando workspace:", name.trim());

    // Create workspace
    const workspaceResult = await query(
      `
      INSERT INTO sv.workspaces (name, description, type, owner_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, type, owner_user_id
      `,
      [name.trim(), description?.trim() || null, type?.trim() || null, userId]
    );

    const workspace = workspaceResult.rows[0];
    console.log("[workspaces-create] Workspace criado com ID:", workspace.id);

    // Add creator as member
    await query(
      `
      INSERT INTO sv.workspace_members (workspace_id, user_id)
      VALUES ($1, $2)
      `,
      [workspace.id, userId]
    );

    console.log("[workspaces-create] Membro adicionado ao workspace");

    return json(201, {
      ok: true,
      workspace: {
        ...workspace,
        member_count: 1,
        squad_count: 0
      }
    });

  } catch (error) {
    console.error("[workspaces-create] Erro ao criar workspace:", error.message);
    console.error("[workspaces-create] Stack:", error.stack);
    return json(500, { error: "Erro ao criar workspace" });
  }
};
