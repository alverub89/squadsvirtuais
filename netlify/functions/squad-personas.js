// netlify/functions/squad-personas.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * POST /squad-personas
 * Associate a persona with a squad
 */
async function createAssociation(event, userId) {
  console.log("[squad-personas] Creating association");
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const { 
    squad_id,
    persona_id,
    context_description,
    focus
  } = body;
  
  // Validate required fields
  if (!squad_id || !persona_id) {
    return json(400, { error: "squad_id e persona_id são obrigatórios" });
  }
  
  // Get squad and verify workspace access
  const squadResult = await query(
    `SELECT workspace_id FROM sv.squads WHERE id = $1`,
    [squad_id]
  );
  
  if (squadResult.rows.length === 0) {
    return json(404, { error: "Squad não encontrada" });
  }
  
  const workspaceId = squadResult.rows[0].workspace_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Verify persona belongs to the same workspace
  const personaCheck = await query(
    `SELECT 1 FROM sv.personas WHERE id = $1 AND workspace_id = $2`,
    [persona_id, workspaceId]
  );
  
  if (personaCheck.rows.length === 0) {
    return json(400, { error: "Persona não encontrada neste workspace" });
  }
  
  // Create association
  try {
    const result = await query(
      `
      INSERT INTO sv.squad_personas (
        squad_id, persona_id, context_description, focus
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, squad_id, persona_id, context_description, focus, 
                created_at, updated_at
      `,
      [
        squad_id,
        persona_id,
        context_description?.trim() || null,
        focus?.trim() || null
      ]
    );
    
    console.log("[squad-personas] Association created:", result.rows[0].id);
    
    return json(201, {
      ok: true,
      association: result.rows[0]
    });
  } catch (error) {
    // Check for unique constraint violation
    if (error.constraint === 'squad_personas_unique') {
      return json(400, { error: "Esta persona já está associada a esta squad" });
    }
    throw error;
  }
}

/**
 * GET /squad-personas?squad_id=...
 * Get all personas associated with a squad
 */
async function getSquadPersonas(event, userId) {
  const squadId = event.queryStringParameters?.squad_id;
  
  if (!squadId) {
    return json(400, { error: "squad_id é obrigatório" });
  }
  
  console.log("[squad-personas] Getting personas for squad:", squadId);
  
  // Get squad and verify workspace access
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
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Get personas with association details
  const result = await query(
    `
    SELECT 
      sp.id as association_id,
      sp.context_description,
      sp.focus,
      sp.created_at as associated_at,
      p.id as persona_id,
      p.name,
      p.type,
      p.subtype,
      p.goals,
      p.pain_points,
      p.behaviors,
      p.influence_level
    FROM sv.squad_personas sp
    JOIN sv.personas p ON sp.persona_id = p.id
    WHERE sp.squad_id = $1 AND p.active = true
    ORDER BY sp.created_at ASC
    `,
    [squadId]
  );
  
  return json(200, {
    personas: result.rows
  });
}

/**
 * DELETE /squad-personas/:id
 * Remove a persona from a squad
 */
async function deleteAssociation(event, associationId, userId) {
  console.log("[squad-personas] Deleting association:", associationId);
  
  // Get association and verify access
  const associationResult = await query(
    `
    SELECT sp.*, s.workspace_id
    FROM sv.squad_personas sp
    JOIN sv.squads s ON sp.squad_id = s.id
    WHERE sp.id = $1
    `,
    [associationId]
  );
  
  if (associationResult.rows.length === 0) {
    return json(404, { error: "Associação não encontrada" });
  }
  
  const workspaceId = associationResult.rows[0].workspace_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Delete association
  await query(
    `DELETE FROM sv.squad_personas WHERE id = $1`,
    [associationId]
  );
  
  console.log("[squad-personas] Association deleted:", associationId);
  
  return json(200, {
    ok: true,
    message: "Associação removida com sucesso"
  });
}

/**
 * PUT /squad-personas/:id
 * Update association context
 */
async function updateAssociation(event, associationId, userId) {
  console.log("[squad-personas] Updating association:", associationId);
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const { context_description, focus } = body;
  
  // Get association and verify access
  const associationResult = await query(
    `
    SELECT sp.*, s.workspace_id
    FROM sv.squad_personas sp
    JOIN sv.squads s ON sp.squad_id = s.id
    WHERE sp.id = $1
    `,
    [associationId]
  );
  
  if (associationResult.rows.length === 0) {
    return json(404, { error: "Associação não encontrada" });
  }
  
  const workspaceId = associationResult.rows[0].workspace_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Update association
  const result = await query(
    `
    UPDATE sv.squad_personas
    SET 
      context_description = COALESCE($1, context_description),
      focus = COALESCE($2, focus),
      updated_at = NOW()
    WHERE id = $3
    RETURNING id, squad_id, persona_id, context_description, focus,
              created_at, updated_at
    `,
    [
      context_description?.trim() || null,
      focus?.trim() || null,
      associationId
    ]
  );
  
  console.log("[squad-personas] Association updated:", associationId);
  
  return json(200, {
    ok: true,
    association: result.rows[0]
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
      console.error("[squad-personas] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }
    
    const userId = decoded.userId;
    const method = event.httpMethod;
    
    if (method === "POST") {
      return await createAssociation(event, userId);
    } else if (method === "GET") {
      return await getSquadPersonas(event, userId);
    } else if (method === "DELETE") {
      // Extract ID from path
      const pathSegments = event.path.split('/').filter(Boolean);
      const associationId = pathSegments[pathSegments.length - 1];
      
      if (!associationId) {
        return json(400, { error: "ID é obrigatório para DELETE" });
      }
      
      return await deleteAssociation(event, associationId, userId);
    } else if (method === "PUT") {
      // Extract ID from path
      const pathSegments = event.path.split('/').filter(Boolean);
      const associationId = pathSegments[pathSegments.length - 1];
      
      if (!associationId) {
        return json(400, { error: "ID é obrigatório para PUT" });
      }
      
      return await updateAssociation(event, associationId, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[squad-personas] Erro:", error.message);
    console.error("[squad-personas] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
