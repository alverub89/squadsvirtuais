// netlify/functions/problem-statements.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * Calculate quality status for a problem statement
 * Returns quality indicators without being punitive
 */
function calculateQualityStatus(ps) {
  const issues = [];
  
  // Check title
  if (!ps.title || ps.title.trim().length < 10) {
    issues.push("O título está muito curto ou vazio");
  }
  
  // Check narrative
  if (!ps.narrative || ps.narrative.trim().length < 280) {
    issues.push("A narrativa do problema precisa ser mais detalhada");
  }
  
  // Check success metrics
  if (!ps.success_metrics || ps.success_metrics.trim().length === 0) {
    issues.push("Defina métricas de sucesso para medir o impacto");
  }
  
  // Optional but suggested fields
  const suggestions = [];
  if (!ps.constraints || ps.constraints.trim().length === 0) {
    suggestions.push("Considere documentar as restrições conhecidas");
  }
  
  if (!ps.open_questions || ps.open_questions.trim().length === 0) {
    suggestions.push("Liste perguntas em aberto para orientar a investigação");
  }
  
  // Determine overall status
  let status = "good";
  let message = null;
  
  if (issues.length > 0) {
    status = "needs_improvement";
    message = "Este problema ainda está pouco específico. Isso reduz a qualidade das sugestões da squad.";
  } else if (suggestions.length > 0) {
    status = "good";
    message = "O problema está bem definido. Considere adicionar mais detalhes para melhorar ainda mais as sugestões.";
  }
  
  return {
    status,
    message,
    issues,
    suggestions
  };
}

/**
 * POST /problem-statements
 * Create a new problem statement for a squad
 * Stores it as a decision in sv.decisions
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
  
  if (!title || !narrative) {
    return json(400, { error: "title e narrative são obrigatórios" });
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
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Check if problem statement already exists for this squad
  const existingCheck = await query(
    `SELECT id FROM sv.decisions WHERE squad_id = $1 AND title = 'Problem Statement'`,
    [squad_id]
  );
  
  if (existingCheck.rows.length > 0) {
    return json(400, { 
      error: "Esta squad já possui um Problem Statement. Use PUT para atualizar.",
      existing_id: existingCheck.rows[0].id
    });
  }
  
  // Build problem statement object
  const problemStatement = {
    title: title.trim(),
    narrative: narrative.trim(),
    success_metrics: success_metrics?.trim() || "",
    constraints: constraints?.trim() || "",
    assumptions: assumptions?.trim() || "",
    open_questions: open_questions?.trim() || "",
    created_at: new Date().toISOString()
  };
  
  // Calculate quality
  const quality = calculateQualityStatus(problemStatement);
  
  // Store as decision with special title
  const result = await query(
    `
    INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
    VALUES ($1, 'Problem Statement', $2, $3, 'User')
    RETURNING id, created_at, updated_at
    `,
    [squad_id, JSON.stringify(problemStatement), userId]
  );
  
  console.log("[problem-statements] Problem statement created:", result.rows[0].id);
  
  return json(201, {
    ok: true,
    problem_statement: {
      id: result.rows[0].id,
      squad_id,
      ...problemStatement,
      quality,
      updated_at: result.rows[0].updated_at
    }
  });
}

/**
 * GET /problem-statements?squad_id=...
 * Get the current problem statement for a squad
 */
async function getProblemStatement(event, userId) {
  const squadId = event.queryStringParameters?.squad_id;
  
  if (!squadId) {
    return json(400, { error: "squad_id é obrigatório" });
  }
  
  console.log("[problem-statements] Getting problem statement for squad:", squadId);
  
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
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Get the problem statement (latest one with title 'Problem Statement')
  const result = await query(
    `
    SELECT id, decision, created_at, updated_at
    FROM sv.decisions
    WHERE squad_id = $1 AND title = 'Problem Statement'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [squadId]
  );
  
  if (result.rows.length === 0) {
    return json(200, { problem_statement: null });
  }
  
  const record = result.rows[0];
  const problemStatement = JSON.parse(record.decision);
  
  // Calculate quality
  const quality = calculateQualityStatus(problemStatement);
  
  return json(200, {
    problem_statement: {
      id: record.id,
      squad_id: squadId,
      ...problemStatement,
      quality,
      updated_at: record.updated_at
    }
  });
}

/**
 * PUT /problem-statements/:id
 * Update a problem statement
 * Creates a history entry in sv.decisions before updating
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
    SELECT d.id, d.squad_id, d.decision, s.workspace_id
    FROM sv.decisions d
    JOIN sv.squads s ON d.squad_id = s.id
    WHERE d.id = $1 AND d.title = 'Problem Statement'
    `,
    [psId]
  );
  
  if (currentResult.rows.length === 0) {
    return json(404, { error: "Problem Statement não encontrado" });
  }
  
  const current = currentResult.rows[0];
  const workspaceId = current.workspace_id;
  const squadId = current.squad_id;
  
  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }
  
  // Parse current problem statement
  const oldPs = JSON.parse(current.decision);
  
  // Build updated problem statement
  const newPs = {
    title: title?.trim() || oldPs.title,
    narrative: narrative?.trim() || oldPs.narrative,
    success_metrics: success_metrics?.trim() || oldPs.success_metrics || "",
    constraints: constraints?.trim() || oldPs.constraints || "",
    assumptions: assumptions?.trim() || oldPs.assumptions || "",
    open_questions: open_questions?.trim() || oldPs.open_questions || "",
    updated_at: new Date().toISOString()
  };
  
  // Create history entry in decisions
  await query(
    `
    INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
    VALUES ($1, 'Problem Statement atualizado', $2, $3, 'User')
    `,
    [
      squadId,
      JSON.stringify({
        before: oldPs,
        after: newPs,
        changed_at: new Date().toISOString()
      }),
      userId
    ]
  );
  
  // Update the main problem statement record
  const result = await query(
    `
    UPDATE sv.decisions
    SET decision = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, updated_at
    `,
    [JSON.stringify(newPs), psId]
  );
  
  // Calculate quality
  const quality = calculateQualityStatus(newPs);
  
  console.log("[problem-statements] Problem statement updated:", psId);
  
  return json(200, {
    ok: true,
    problem_statement: {
      id: result.rows[0].id,
      squad_id: squadId,
      ...newPs,
      quality,
      updated_at: result.rows[0].updated_at
    }
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
    
    if (method === "POST") {
      return await createProblemStatement(event, userId);
    } else if (method === "GET") {
      return await getProblemStatement(event, userId);
    } else if (method === "PUT") {
      // Extract ID from path (last segment)
      const pathSegments = event.path.split('/').filter(Boolean);
      const psId = pathSegments[pathSegments.length - 1];
      
      if (!psId) {
        return json(400, { error: "ID é obrigatório para PUT" });
      }
      
      return await updateProblemStatement(event, psId, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[problem-statements] Erro:", error.message);
    console.error("[problem-statements] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
