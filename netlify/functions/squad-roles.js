// netlify/functions/squad-roles.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

// Helper to normalize empty strings to null
const normalizeToNull = (value) => (value && value.trim()) ? value : null;

exports.handler = async (event) => {
  try {
    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[squad-roles] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Handle GET (list squad roles)
    if (event.httpMethod === "GET") {
      const squadId = event.queryStringParameters?.squad_id;

      if (!squadId) {
        return json(400, { error: "squad_id é obrigatório" });
      }

      console.log("[squad-roles] Listando roles para squad:", squadId);

      // Verify user has access to squad
      const accessCheck = await query(
        `
        SELECT 1 
        FROM sv.squads s
        JOIN sv.workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = $1 AND wm.user_id = $2
        `,
        [squadId, userId]
      );

      if (accessCheck.rows.length === 0) {
        console.log("[squad-roles] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // Get squad roles with details from global or workspace roles
      // Prefer custom name/description from squad_roles if set, otherwise use from role/workspace_role
      const result = await query(
        `
        SELECT 
          sr.id as squad_role_id,
          sr.squad_id,
          sr.active,
          sr.created_at,
          sr.name as custom_name,
          sr.description as custom_description,
          CASE 
            WHEN sr.role_id IS NOT NULL THEN 'global'
            ELSE 'workspace'
          END as source,
          COALESCE(r.id, wr.id) as role_id,
          COALESCE(r.code, wr.code) as code,
          COALESCE(r.label, wr.label) as label,
          COALESCE(sr.name, r.label, wr.label) as name,
          COALESCE(sr.description, r.description, wr.description) as description,
          COALESCE(r.responsibilities, wr.responsibilities) as responsibilities
        FROM sv.squad_roles sr
        LEFT JOIN sv.roles r ON sr.role_id = r.id
        LEFT JOIN sv.workspace_roles wr ON sr.workspace_role_id = wr.id
        WHERE sr.squad_id = $1
        ORDER BY sr.active DESC, name
        `,
        [squadId]
      );

      console.log("[squad-roles] Encontrados", result.rows.length, "roles");

      return json(200, {
        ok: true,
        roles: result.rows
      });
    }

    // Handle POST (activate role in squad)
    if (event.httpMethod === "POST") {
      console.log("[squad-roles] Ativando role na squad");

      const body = JSON.parse(event.body || "{}");
      const { squad_id, role_id, workspace_role_id, name, description } = body;

      if (!squad_id) {
        return json(400, { error: "squad_id é obrigatório" });
      }

      if (!role_id && !workspace_role_id) {
        return json(400, { 
          error: "role_id ou workspace_role_id é obrigatório" 
        });
      }

      if (role_id && workspace_role_id) {
        return json(400, { 
          error: "Forneça apenas role_id OU workspace_role_id, não ambos" 
        });
      }

      // Verify user has access to squad
      const accessCheck = await query(
        `
        SELECT s.workspace_id
        FROM sv.squads s
        JOIN sv.workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = $1 AND wm.user_id = $2
        `,
        [squad_id, userId]
      );

      if (accessCheck.rows.length === 0) {
        console.log("[squad-roles] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // If workspace_role_id is provided, verify it belongs to the same workspace
      if (workspace_role_id) {
        const workspaceId = accessCheck.rows[0].workspace_id;
        const workspaceRoleCheck = await query(
          `
          SELECT 1 FROM sv.workspace_roles
          WHERE id = $1 AND workspace_id = $2
          `,
          [workspace_role_id, workspaceId]
        );

        if (workspaceRoleCheck.rows.length === 0) {
          return json(400, { 
            error: "Workspace role não pertence ao workspace da squad" 
          });
        }
      }

      // Create squad role
      const result = await query(
        `
        INSERT INTO sv.squad_roles (
          squad_id,
          role_id,
          workspace_role_id,
          name,
          description,
          active
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [squad_id, role_id || null, workspace_role_id || null, normalizeToNull(name), normalizeToNull(description), true]
      );

      console.log("[squad-roles] Squad role ativado:", result.rows[0].id);

      return json(201, {
        ok: true,
        squad_role: result.rows[0]
      });
    }

    // Handle PATCH (activate/deactivate squad role)
    if (event.httpMethod === "PATCH") {
      console.log("[squad-roles] Atualizando status de squad role");

      // Try to get squad role ID from path, fallback to body
      const pathParts = event.path.split('/');
      const squadRoleIdFromPath = pathParts[pathParts.length - 1];
      
      const body = JSON.parse(event.body || "{}");
      const { active, squad_role_id, name, description } = body;

      // Use path ID if it's a valid UUID, otherwise use body ID
      const squadRoleId = squadRoleIdFromPath && squadRoleIdFromPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
        ? squadRoleIdFromPath 
        : squad_role_id;

      if (!squadRoleId) {
        return json(400, { error: "Squad role ID é obrigatório" });
      }

      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (active !== undefined) {
        updates.push(`active = $${paramCount}`);
        values.push(active);
        paramCount++;
      }

      if (name !== undefined) {
        updates.push(`name = $${paramCount}`);
        values.push(normalizeToNull(name));
        paramCount++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(normalizeToNull(description));
        paramCount++;
      }

      if (updates.length === 0) {
        return json(400, { error: "Nenhum campo para atualizar fornecido" });
      }

      updates.push(`updated_at = NOW()`);
      values.push(squadRoleId);

      // Get squad_id to verify access
      const squadRoleCheck = await query(
        `
        SELECT sr.squad_id
        FROM sv.squad_roles sr
        WHERE sr.id = $1
        `,
        [squadRoleId]
      );

      if (squadRoleCheck.rows.length === 0) {
        return json(404, { error: "Squad role não encontrado" });
      }

      const squadId = squadRoleCheck.rows[0].squad_id;

      // Verify user has access to squad
      const accessCheck = await query(
        `
        SELECT 1 
        FROM sv.squads s
        JOIN sv.workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = $1 AND wm.user_id = $2
        `,
        [squadId, userId]
      );

      if (accessCheck.rows.length === 0) {
        console.log("[squad-roles] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // Update squad role status
      const result = await query(
        `
        UPDATE sv.squad_roles
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
        `,
        values
      );

      console.log("[squad-roles] Squad role atualizado:", squadRoleId);

      return json(200, {
        ok: true,
        squad_role: result.rows[0]
      });
    }

    // Method not allowed
    return json(405, { error: "Método não permitido" });

  } catch (error) {
    console.error("[squad-roles] Erro:", error.message);
    console.error("[squad-roles] Stack:", error.stack);
    
    // Handle unique constraint violation (duplicate active role)
    if (error.code === '23505') {
      return json(409, { error: "Role já está ativo nesta squad" });
    }
    
    // Handle check constraint violation
    if (error.code === '23514') {
      return json(400, { error: "Deve fornecer role_id OU workspace_role_id" });
    }
    
    return json(500, { error: "Erro ao gerenciar squad roles" });
  }
};
