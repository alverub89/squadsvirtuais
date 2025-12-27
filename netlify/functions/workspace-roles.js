// netlify/functions/workspace-roles.js
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
      console.error("[workspace-roles] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Handle POST (create workspace role)
    if (event.httpMethod === "POST") {
      console.log("[workspace-roles] Criando workspace role");

      const body = JSON.parse(event.body || "{}");
      const { workspace_id, code, label, description, responsibilities } = body;

      if (!workspace_id || !code || !label) {
        return json(400, { 
          error: "workspace_id, code e label são obrigatórios" 
        });
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
        console.log("[workspace-roles] Usuário não é membro do workspace");
        return json(403, { error: "Acesso negado ao workspace" });
      }

      // Create workspace role
      const result = await query(
        `
        INSERT INTO sv.workspace_roles (
          workspace_id,
          code,
          label,
          description,
          responsibilities,
          active
        )
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
        `,
        [workspace_id, code, label, description, responsibilities]
      );

      console.log("[workspace-roles] Workspace role criado:", result.rows[0].id);

      return json(201, {
        ok: true,
        role: result.rows[0]
      });
    }

    // Handle PATCH (update workspace role)
    if (event.httpMethod === "PATCH") {
      console.log("[workspace-roles] Atualizando workspace role");

      // Try to get role ID from path
      const pathParts = event.path.split('/');
      const roleIdFromPath = pathParts[pathParts.length - 1];
      
      const body = JSON.parse(event.body || "{}");
      const { label, description, responsibilities, active, role_id } = body;

      // Use path ID if it's a valid UUID, otherwise use body ID
      const roleId = roleIdFromPath && roleIdFromPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
        ? roleIdFromPath 
        : role_id;

      if (!roleId) {
        return json(400, { error: "Role ID é obrigatório" });
      }

      // Get workspace role to verify ownership
      const roleCheck = await query(
        `
        SELECT wr.workspace_id
        FROM sv.workspace_roles wr
        WHERE wr.id = $1
        `,
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return json(404, { error: "Role não encontrado" });
      }

      const workspaceId = roleCheck.rows[0].workspace_id;

      // Verify user is member of workspace
      const memberCheck = await query(
        `
        SELECT 1 FROM sv.workspace_members
        WHERE workspace_id = $1 AND user_id = $2
        `,
        [workspaceId, userId]
      );

      if (memberCheck.rows.length === 0) {
        console.log("[workspace-roles] Usuário não é membro do workspace");
        return json(403, { error: "Acesso negado ao workspace" });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (label !== undefined) {
        updates.push(`label = $${paramIndex++}`);
        values.push(label);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (responsibilities !== undefined) {
        updates.push(`responsibilities = $${paramIndex++}`);
        values.push(responsibilities);
      }
      if (active !== undefined) {
        updates.push(`active = $${paramIndex++}`);
        values.push(active);
      }

      if (updates.length === 0) {
        return json(400, { error: "Nenhum campo para atualizar" });
      }

      updates.push(`updated_at = NOW()`);
      values.push(roleId);

      const result = await query(
        `
        UPDATE sv.workspace_roles
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        values
      );

      console.log("[workspace-roles] Workspace role atualizado:", roleId);

      return json(200, {
        ok: true,
        role: result.rows[0]
      });
    }

    // Handle DELETE (soft delete by setting active = false)
    if (event.httpMethod === "DELETE") {
      console.log("[workspace-roles] Excluindo workspace role (soft delete)");

      // Try to get role ID from path
      const pathParts = event.path.split('/');
      const roleIdFromPath = pathParts[pathParts.length - 1];
      
      const body = event.body ? JSON.parse(event.body) : {};
      const { role_id } = body;

      // Use path ID if it's a valid UUID, otherwise use body ID
      const roleId = roleIdFromPath && roleIdFromPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
        ? roleIdFromPath 
        : role_id;

      if (!roleId) {
        return json(400, { error: "Role ID é obrigatório" });
      }

      // Get workspace role to verify ownership
      const roleCheck = await query(
        `
        SELECT wr.workspace_id
        FROM sv.workspace_roles wr
        WHERE wr.id = $1
        `,
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return json(404, { error: "Role não encontrado" });
      }

      const workspaceId = roleCheck.rows[0].workspace_id;

      // Verify user is member of workspace
      const memberCheck = await query(
        `
        SELECT 1 FROM sv.workspace_members
        WHERE workspace_id = $1 AND user_id = $2
        `,
        [workspaceId, userId]
      );

      if (memberCheck.rows.length === 0) {
        console.log("[workspace-roles] Usuário não é membro do workspace");
        return json(403, { error: "Acesso negado ao workspace" });
      }

      // Soft delete by setting active = false
      const result = await query(
        `
        UPDATE sv.workspace_roles
        SET active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [roleId]
      );

      console.log("[workspace-roles] Workspace role excluído:", roleId);

      return json(200, {
        ok: true,
        role: result.rows[0]
      });
    }

    // Method not allowed
    return json(405, { error: "Método não permitido" });

  } catch (error) {
    console.error("[workspace-roles] Erro:", error.message);
    console.error("[workspace-roles] Stack:", error.stack);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return json(409, { error: "Código de role já existe neste workspace" });
    }
    
    return json(500, { error: "Erro ao gerenciar workspace role" });
  }
};
