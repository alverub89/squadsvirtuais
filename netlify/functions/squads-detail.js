// netlify/functions/squads-detail.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * PATCH /squads/:id
 * Update squad details
 */
async function updateSquad(event, squadId, userId) {
  console.log("[squads-detail] Updating squad:", squadId);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }

  const { name, description, status } = body;

  // Validate at least one field to update
  if (!name && description === undefined && !status) {
    return json(400, {
      error: "Ao menos um campo deve ser fornecido (name, description, status)",
    });
  }

  // Get squad to verify workspace
  const squadResult = await query(
    `SELECT workspace_id FROM sv.squads WHERE id = $1`,
    [squadId]
  );

  if (squadResult.rows.length === 0) {
    return json(404, { error: "Squad não encontrada" });
  }

  const workspaceId = squadResult.rows[0].workspace_id;

  // Verify user is member of workspace
  const memberCheck = await query(
    `
    SELECT 1 FROM sv.workspace_members
    WHERE workspace_id = $1 AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name && name.trim().length > 0) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name.trim());
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description?.trim() || null);
  }

  if (status) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  updates.push(`updated_at = NOW()`);
  values.push(squadId);

  const updateQuery = `
    UPDATE sv.squads
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING id, workspace_id, name, description, status, created_at, updated_at
  `;

  const result = await query(updateQuery, values);

  console.log("[squads-detail] Squad atualizada:", result.rows[0].id);

  return json(200, {
    ok: true,
    squad: result.rows[0],
  });
}

/**
 * DELETE /squads/:id
 * Delete squad
 */
async function deleteSquad(event, squadId, userId) {
  console.log("[squads-detail] Deleting squad:", squadId);

  // Get squad to verify workspace
  const squadResult = await query(
    `SELECT workspace_id FROM sv.squads WHERE id = $1`,
    [squadId]
  );

  if (squadResult.rows.length === 0) {
    return json(404, { error: "Squad não encontrada" });
  }

  const workspaceId = squadResult.rows[0].workspace_id;

  // Verify user is member of workspace
  const memberCheck = await query(
    `
    SELECT 1 FROM sv.workspace_members
    WHERE workspace_id = $1 AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Delete squad (cascades to related tables)
  await query(`DELETE FROM sv.squads WHERE id = $1`, [squadId]);

  console.log("[squads-detail] Squad excluída:", squadId);

  return json(200, {
    ok: true,
    message: "Squad excluída com sucesso",
  });
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  try {
    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[squads-detail] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Extract squad ID from query params
    const squadId = event.queryStringParameters?.id;

    if (!squadId) {
      return json(400, { error: "Squad ID é obrigatório" });
    }

    // Route based on method
    const method = event.httpMethod;

    if (method === "PATCH") {
      return await updateSquad(event, squadId, userId);
    } else if (method === "DELETE") {
      return await deleteSquad(event, squadId, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[squads-detail] Erro:", error.message);
    console.error("[squads-detail] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
