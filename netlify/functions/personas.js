// netlify/functions/personas.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * POST /personas
 * Create a new persona at workspace level
 */
async function createPersona(event, userId) {
  console.log("[personas] Creating persona");
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const { 
    workspace_id,
    name,
    type,
    subtype,
    goals,
    pain_points,
    behaviors,
    influence_level
  } = body;
  
  // Validate required fields
  if (!workspace_id) {
    return json(400, { error: "workspace_id é obrigatório" });
  }
  
  if (!name || !type) {
    return json(400, { error: "name e type são obrigatórios" });
  }
  
  // Validate type
  const validTypes = ['cliente', 'stakeholder', 'membro_squad'];
  if (!validTypes.includes(type)) {
    return json(400, { 
      error: `type deve ser um dos valores: ${validTypes.join(', ')}` 
    });
  }
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspace_id, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Create persona
  const result = await query(
    `
    INSERT INTO sv.personas (
      workspace_id, name, type, subtype, goals, pain_points, 
      behaviors, influence_level, active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
    RETURNING id, workspace_id, name, type, subtype, goals, pain_points, 
              behaviors, influence_level, active, created_at, updated_at
    `,
    [
      workspace_id,
      name.trim(),
      type,
      subtype?.trim() || null,
      goals?.trim() || null,
      pain_points?.trim() || null,
      behaviors?.trim() || null,
      influence_level?.trim() || null
    ]
  );
  
  console.log("[personas] Persona created:", result.rows[0].id);
  
  return json(201, {
    ok: true,
    persona: result.rows[0]
  });
}

/**
 * GET /personas?workspace_id=...
 * List all personas in a workspace
 */
async function listPersonas(event, userId) {
  const workspaceId = event.queryStringParameters?.workspace_id;
  
  if (!workspaceId) {
    return json(400, { error: "workspace_id é obrigatório" });
  }
  
  console.log("[personas] Listing personas for workspace:", workspaceId);
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Get personas with count of associated squads
  const result = await query(
    `
    SELECT 
      p.id,
      p.workspace_id,
      p.name,
      p.type,
      p.subtype,
      p.goals,
      p.pain_points,
      p.behaviors,
      p.influence_level,
      p.active,
      p.created_at,
      p.updated_at,
      COUNT(sp.id) as squad_count
    FROM sv.personas p
    LEFT JOIN sv.squad_personas sp ON p.id = sp.persona_id
    WHERE p.workspace_id = $1 AND p.active = true
    GROUP BY p.id
    ORDER BY p.created_at DESC
    `,
    [workspaceId]
  );
  
  return json(200, {
    personas: result.rows
  });
}

/**
 * PUT /personas/:id
 * Update a persona
 */
async function updatePersona(event, personaId, userId) {
  console.log("[personas] Updating persona:", personaId);
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const {
    name,
    type,
    subtype,
    goals,
    pain_points,
    behaviors,
    influence_level,
    active
  } = body;
  
  // Get current persona and verify access
  const currentResult = await query(
    `
    SELECT p.*, w.id as workspace_id
    FROM sv.personas p
    JOIN sv.workspaces w ON p.workspace_id = w.id
    WHERE p.id = $1
    `,
    [personaId]
  );
  
  if (currentResult.rows.length === 0) {
    return json(404, { error: "Persona não encontrada" });
  }
  
  const current = currentResult.rows[0];
  const workspaceId = current.workspace_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Validate type if provided
  if (type) {
    const validTypes = ['cliente', 'stakeholder', 'membro_squad'];
    if (!validTypes.includes(type)) {
      return json(400, { 
        error: `type deve ser um dos valores: ${validTypes.join(', ')}` 
      });
    }
  }
  
  // Update persona
  const result = await query(
    `
    UPDATE sv.personas
    SET 
      name = COALESCE($1, name),
      type = COALESCE($2, type),
      subtype = COALESCE($3, subtype),
      goals = COALESCE($4, goals),
      pain_points = COALESCE($5, pain_points),
      behaviors = COALESCE($6, behaviors),
      influence_level = COALESCE($7, influence_level),
      active = COALESCE($8, active),
      updated_at = NOW()
    WHERE id = $9
    RETURNING id, workspace_id, name, type, subtype, goals, pain_points,
              behaviors, influence_level, active, created_at, updated_at
    `,
    [
      name?.trim() || null,
      type || null,
      subtype?.trim() || null,
      goals?.trim() || null,
      pain_points?.trim() || null,
      behaviors?.trim() || null,
      influence_level?.trim() || null,
      active !== undefined ? active : null,
      personaId
    ]
  );
  
  console.log("[personas] Persona updated:", personaId);
  
  return json(200, {
    ok: true,
    persona: result.rows[0]
  });
}

/**
 * GET /personas/:id
 * Get a specific persona with its squad associations
 */
async function getPersona(event, personaId, userId) {
  console.log("[personas] Getting persona:", personaId);
  
  // Get persona
  const personaResult = await query(
    `
    SELECT 
      p.id,
      p.workspace_id,
      p.name,
      p.type,
      p.subtype,
      p.goals,
      p.pain_points,
      p.behaviors,
      p.influence_level,
      p.active,
      p.created_at,
      p.updated_at
    FROM sv.personas p
    WHERE p.id = $1
    `,
    [personaId]
  );
  
  if (personaResult.rows.length === 0) {
    return json(404, { error: "Persona não encontrada" });
  }
  
  const persona = personaResult.rows[0];
  const workspaceId = persona.workspace_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Get squad associations
  const associationsResult = await query(
    `
    SELECT 
      sp.id,
      sp.squad_id,
      sp.context_description,
      sp.focus,
      sp.created_at,
      s.name as squad_name,
      d.decision as problem_statement
    FROM sv.squad_personas sp
    JOIN sv.squads s ON sp.squad_id = s.id
    LEFT JOIN sv.decisions d ON s.id = d.squad_id AND d.title = 'Problem Statement'
    WHERE sp.persona_id = $1
    ORDER BY sp.created_at DESC
    `,
    [personaId]
  );
  
  // Parse problem statements
  const associations = associationsResult.rows.map(row => {
    let problemStatementTitle = null;
    if (row.problem_statement) {
      try {
        const ps = JSON.parse(row.problem_statement);
        problemStatementTitle = ps.title;
      } catch {
        // Ignore parse errors
      }
    }
    
    return {
      id: row.id,
      squad_id: row.squad_id,
      squad_name: row.squad_name,
      problem_statement: problemStatementTitle,
      context_description: row.context_description,
      focus: row.focus,
      created_at: row.created_at
    };
  });
  
  return json(200, {
    persona,
    squad_associations: associations
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
      console.error("[personas] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }
    
    const userId = decoded.userId;
    const method = event.httpMethod;
    
    if (method === "POST") {
      return await createPersona(event, userId);
    } else if (method === "GET") {
      // Check if we have an ID in the path
      const pathSegments = event.path.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      // If last segment looks like a UUID, it's a GET by ID
      if (lastSegment && lastSegment.length === 36 && lastSegment.includes('-')) {
        return await getPersona(event, lastSegment, userId);
      } else {
        return await listPersonas(event, userId);
      }
    } else if (method === "PUT") {
      // Extract ID from path (last segment)
      const pathSegments = event.path.split('/').filter(Boolean);
      const personaId = pathSegments[pathSegments.length - 1];
      
      if (!personaId) {
        return json(400, { error: "ID é obrigatório para PUT" });
      }
      
      return await updatePersona(event, personaId, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[personas] Erro:", error.message);
    console.error("[personas] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
