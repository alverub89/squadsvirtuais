// netlify/functions/squad-member-roles.js
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
      console.error("[squad-member-roles] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Handle POST (assign or unassign role)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { squad_member_id, squad_role_id, action } = body;

      if (!squad_member_id || !action) {
        return json(400, { 
          error: "squad_member_id e action são obrigatórios" 
        });
      }

      if (!["assign", "unassign"].includes(action)) {
        return json(400, { 
          error: "action deve ser 'assign' ou 'unassign'" 
        });
      }

      // Get squad_member info to verify access
      const memberCheck = await query(
        `
        SELECT sm.squad_id, s.workspace_id
        FROM sv.squad_members sm
        JOIN sv.squads s ON s.id = sm.squad_id
        WHERE sm.id = $1
        `,
        [squad_member_id]
      );

      if (memberCheck.rows.length === 0) {
        return json(404, { error: "Membro da squad não encontrado" });
      }

      const { squad_id, workspace_id } = memberCheck.rows[0];

      // Verify user has access to workspace
      const accessCheck = await query(
        `
        SELECT 1 FROM sv.workspace_members
        WHERE workspace_id = $1 AND user_id = $2
        `,
        [workspace_id, userId]
      );

      if (accessCheck.rows.length === 0) {
        console.log("[squad-member-roles] Usuário não tem acesso ao workspace");
        return json(403, { error: "Acesso negado" });
      }

      // Handle ASSIGN
      if (action === "assign") {
        if (!squad_role_id) {
          return json(400, { 
            error: "squad_role_id é obrigatório para assign" 
          });
        }

        console.log("[squad-member-roles] Atribuindo role ao membro");

        // Verify squad_role belongs to the same squad
        const roleCheck = await query(
          `
          SELECT 1 FROM sv.squad_roles
          WHERE id = $1 AND squad_id = $2 AND active = true
          `,
          [squad_role_id, squad_id]
        );

        if (roleCheck.rows.length === 0) {
          return json(400, { 
            error: "Squad role não encontrado ou não está ativo nesta squad" 
          });
        }

        // First, unassign any existing active role for this member in this squad
        await query(
          `
          UPDATE sv.squad_member_role_assignments
          SET active = false, unassigned_at = NOW(), updated_at = NOW()
          WHERE squad_member_id = $1 
            AND squad_id = $2 
            AND active = true
          `,
          [squad_member_id, squad_id]
        );

        // Now assign the new role
        const result = await query(
          `
          INSERT INTO sv.squad_member_role_assignments (
            squad_member_id,
            squad_id,
            squad_role_id,
            active,
            assigned_at
          )
          VALUES ($1, $2, $3, true, NOW())
          RETURNING *
          `,
          [squad_member_id, squad_id, squad_role_id]
        );

        console.log("[squad-member-roles] Role atribuído:", result.rows[0].id);

        return json(201, {
          ok: true,
          assignment: result.rows[0]
        });
      }

      // Handle UNASSIGN
      if (action === "unassign") {
        console.log("[squad-member-roles] Removendo role do membro");

        const result = await query(
          `
          UPDATE sv.squad_member_role_assignments
          SET active = false, unassigned_at = NOW(), updated_at = NOW()
          WHERE squad_member_id = $1 
            AND squad_id = $2 
            AND active = true
          RETURNING *
          `,
          [squad_member_id, squad_id]
        );

        if (result.rows.length === 0) {
          return json(404, { error: "Nenhuma role ativa encontrada para este membro" });
        }

        console.log("[squad-member-roles] Role removido:", result.rows[0].id);

        return json(200, {
          ok: true,
          assignment: result.rows[0]
        });
      }
    }

    // Handle GET (list member role assignments)
    if (event.httpMethod === "GET") {
      const squadId = event.queryStringParameters?.squad_id;

      if (!squadId) {
        return json(400, { error: "squad_id é obrigatório" });
      }

      console.log("[squad-member-roles] Listando atribuições de roles para squad:", squadId);

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
        console.log("[squad-member-roles] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // Get all active role assignments for squad members
      const result = await query(
        `
        SELECT 
          smra.id as assignment_id,
          smra.squad_member_id,
          smra.squad_role_id,
          smra.assigned_at,
          smra.active,
          sm.user_id,
          u.name as user_name,
          u.email as user_email,
          u.avatar_url as user_avatar_url,
          sr.id as squad_role_id,
          COALESCE(r.code, wr.code) as role_code,
          COALESCE(r.label, wr.label) as role_label,
          CASE 
            WHEN sr.role_id IS NOT NULL THEN 'global'
            ELSE 'workspace'
          END as role_source
        FROM sv.squad_member_role_assignments smra
        JOIN sv.squad_members sm ON sm.id = smra.squad_member_id
        JOIN sv.users u ON u.id = sm.user_id
        JOIN sv.squad_roles sr ON sr.id = smra.squad_role_id
        LEFT JOIN sv.roles r ON sr.role_id = r.id
        LEFT JOIN sv.workspace_roles wr ON sr.workspace_role_id = wr.id
        WHERE smra.squad_id = $1 AND smra.active = true
        ORDER BY u.name
        `,
        [squadId]
      );

      console.log("[squad-member-roles] Encontradas", result.rows.length, "atribuições");

      return json(200, {
        ok: true,
        assignments: result.rows
      });
    }

    // Method not allowed
    return json(405, { error: "Método não permitido" });

  } catch (error) {
    console.error("[squad-member-roles] Erro:", error.message);
    console.error("[squad-member-roles] Stack:", error.stack);
    
    // Handle unique constraint violation (only 1 active role per member per squad)
    if (error.code === '23505') {
      return json(409, { 
        error: "Este membro já possui uma role ativa nesta squad" 
      });
    }
    
    return json(500, { error: "Erro ao gerenciar atribuições de roles" });
  }
};
