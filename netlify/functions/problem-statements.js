// netlify/functions/problem-statements.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * Helper to verify workspace membership
 */
async function verifyWorkspaceMembership(workspaceId, userId) {
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  return memberCheck.rows.length > 0;
}

/**
 * GET /problem-statements?workspace_id=...
 * List all problem statements for a workspace
 */
async function listProblemStatements(event, userId) {
  const workspaceId = event.queryStringParameters?.workspace_id;
  
  if (!workspaceId) {
    return json(400, { error: "workspace_id é obrigatório" });
  }
  
  console.log("[problem-statements] Listing problem statements for workspace:", workspaceId);
  
  // Verify user is member of workspace
  const isMember = await verifyWorkspaceMembership(workspaceId, userId);
  if (!isMember) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Get all problem statements for workspace via squads
  const result = await query(
    `
    SELECT ps.id, ps.squad_id, ps.title, ps.narrative, 
           ps.success_metrics, ps.constraints, ps.assumptions, 
           ps.open_questions, ps.created_at, ps.updated_at
    FROM sv.problem_statements ps
    JOIN sv.squads s ON ps.squad_id = s.id
    WHERE s.workspace_id = $1
    ORDER BY ps.created_at DESC
    `,
    [workspaceId]
  );
  
  return json(200, {
    problem_statements: result.rows
  });
}

/**
 * GET /problem-statements/:id
 * Get a single problem statement by ID
 */
async function getProblemStatementById(psId, userId) {
  console.log("[problem-statements] Getting problem statement:", psId);
  
  // Get problem statement with workspace info
  const result = await query(
    `
    SELECT ps.id, ps.squad_id, ps.title, ps.narrative, 
           ps.success_metrics, ps.constraints, ps.assumptions, 
           ps.open_questions, ps.created_at, ps.updated_at,
           s.workspace_id
    FROM sv.problem_statements ps
    JOIN sv.squads s ON ps.squad_id = s.id
    WHERE ps.id = $1
    `,
    [psId]
  );
  
  if (result.rows.length === 0) {
    return json(404, { error: "Problem Statement não encontrado" });
  }
  
  const ps = result.rows[0];
  const workspaceId = ps.workspace_id;
  delete ps.workspace_id;
  
  // Verify user is member of workspace
  const isMember = await verifyWorkspaceMembership(workspaceId, userId);
  if (!isMember) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  return json(200, {
    problem_statement: ps
  });
}

/**
 * POST /problem-statements
 * Create a new problem statement
 */
async function createProblemStatement(event, userId) {
  console.log("[problem-statements] Creating problem statement");
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const { 
    squad_id,
    title,
    narrative,
    success_metrics,
    constraints,
    assumptions,
    open_questions
  } = body;
  
  // Validate required fields
  if (!squad_id) {
    return json(400, { error: "squad_id é obrigatório" });
  }
  
  if (!narrative || narrative.trim().length === 0) {
    return json(400, { error: "narrative é obrigatório" });
  }
  
  // Get squad to verify workspace
  const squadResult = await query(
    `SELECT workspace_id FROM sv.squads WHERE id = $1`,
    [squad_id]
  );
  
  if (squadResult.rows.length === 0) {
    return json(404, { error: "Squad não encontrada" });
  }

  const workspaceId = squadResult.rows[0].workspace_id;
  
  // Verify user is member of workspace
  const isMember = await verifyWorkspaceMembership(workspaceId, userId);
  if (!isMember) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Prepare JSONB arrays (ensure they are arrays)
  const prepareJsonbArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  };
  
  // Insert into sv.problem_statements
  const result = await query(
    `
    INSERT INTO sv.problem_statements 
      (squad_id, title, narrative, success_metrics, constraints, assumptions, open_questions, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
    RETURNING id, squad_id, title, narrative, success_metrics, constraints, 
              assumptions, open_questions, created_at, updated_at
    `,
    [
      squad_id,
      title?.trim() || null,
      narrative.trim(),
      JSON.stringify(prepareJsonbArray(success_metrics)),
      JSON.stringify(prepareJsonbArray(constraints)),
      JSON.stringify(prepareJsonbArray(assumptions)),
      JSON.stringify(prepareJsonbArray(open_questions))
    ]
  );
  
  console.log("[problem-statements] Problem statement created:", result.rows[0].id);
  
  return json(201, {
    ok: true,
    problem_statement: result.rows[0]
  });
}

/**
 * PUT /problem-statements/:id
 * Update a problem statement
 */
async function updateProblemStatement(event, psId, userId) {
  console.log("[problem-statements] Updating problem statement:", psId);
  
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }
  
  const {
    title,
    narrative,
    success_metrics,
    constraints,
    assumptions,
    open_questions
  } = body;
  
  // Get current problem statement
  const currentResult = await query(
    `
    SELECT ps.id, ps.squad_id, s.workspace_id
    FROM sv.problem_statements ps
    JOIN sv.squads s ON ps.squad_id = s.id
    WHERE ps.id = $1
    `,
    [psId]
  );
  
  if (currentResult.rows.length === 0) {
    return json(404, { error: "Problem Statement não encontrado" });
  }
  
  const current = currentResult.rows[0];
  const workspaceId = current.workspace_id;
  
  // Verify user is member of workspace
  const isMember = await verifyWorkspaceMembership(workspaceId, userId);
  if (!isMember) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Validate required fields
  if (narrative !== undefined && narrative.trim().length === 0) {
    return json(400, { error: "narrative não pode ser vazio" });
  }
  
  // Prepare JSONB arrays
  const prepareJsonbArray = (value) => {
    if (value === undefined) return undefined;
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  };
  
  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title?.trim() || null);
  }
  
  if (narrative !== undefined) {
    updates.push(`narrative = $${paramIndex++}`);
    values.push(narrative.trim());
  }
  
  if (success_metrics !== undefined) {
    updates.push(`success_metrics = $${paramIndex++}`);
    values.push(JSON.stringify(prepareJsonbArray(success_metrics)));
  }
  
  if (constraints !== undefined) {
    updates.push(`constraints = $${paramIndex++}`);
    values.push(JSON.stringify(prepareJsonbArray(constraints)));
  }
  
  if (assumptions !== undefined) {
    updates.push(`assumptions = $${paramIndex++}`);
    values.push(JSON.stringify(prepareJsonbArray(assumptions)));
  }
  
  if (open_questions !== undefined) {
    updates.push(`open_questions = $${paramIndex++}`);
    values.push(JSON.stringify(prepareJsonbArray(open_questions)));
  }
  
  // Always update updated_at
  updates.push(`updated_at = CURRENT_DATE`);
  
  if (updates.length === 1) {
    // Only updated_at would be updated, no actual changes
    return json(400, { error: "Nenhum campo para atualizar" });
  }
  
  values.push(psId);
  
  const result = await query(
    `
    UPDATE sv.problem_statements
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, squad_id, title, narrative, success_metrics, constraints, 
              assumptions, open_questions, created_at, updated_at
    `,
    values
  );
  
  console.log("[problem-statements] Problem statement updated:", psId);
  
  return json(200, {
    ok: true,
    problem_statement: result.rows[0]
  });
}

/**
 * DELETE /problem-statements/:id
 * Delete a problem statement
 */
async function deleteProblemStatement(psId, userId) {
  console.log("[problem-statements] Deleting problem statement:", psId);
  
  // Get problem statement to verify workspace
  const currentResult = await query(
    `
    SELECT ps.id, s.workspace_id
    FROM sv.problem_statements ps
    JOIN sv.squads s ON ps.squad_id = s.id
    WHERE ps.id = $1
    `,
    [psId]
  );
  
  if (currentResult.rows.length === 0) {
    return json(404, { error: "Problem Statement não encontrado" });
  }
  
  const workspaceId = currentResult.rows[0].workspace_id;
  
  // Verify user is member of workspace
  const isMember = await verifyWorkspaceMembership(workspaceId, userId);
  if (!isMember) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Delete the problem statement
  await query(
    `DELETE FROM sv.problem_statements WHERE id = $1`,
    [psId]
  );
  
  console.log("[problem-statements] Problem statement deleted:", psId);
  
  return json(200, {
    ok: true,
    message: "Problem Statement removido com sucesso"
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
      console.error("[problem-statements] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }
    
    const userId = decoded.userId;
    const method = event.httpMethod;
    
    // Extract ID from path if present
    const pathSegments = event.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const psId = lastSegment !== 'problem-statements' ? lastSegment : null;
    
    if (method === "GET") {
      if (psId) {
        return await getProblemStatementById(psId, userId);
      } else {
        return await listProblemStatements(event, userId);
      }
    } else if (method === "POST") {
      return await createProblemStatement(event, userId);
    } else if (method === "PUT") {
      if (!psId) {
        return json(400, { error: "ID é obrigatório para PUT" });
      }
      return await updateProblemStatement(event, psId, userId);
    } else if (method === "DELETE") {
      if (!psId) {
        return json(400, { error: "ID é obrigatório para DELETE" });
      }
      return await deleteProblemStatement(psId, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[problem-statements] Erro:", error.message);
    console.error("[problem-statements] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
