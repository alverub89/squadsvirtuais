// netlify/functions/decisions.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * GET /decisions?squad_id=...&filter=...
 * List decisions for a squad
 */
exports.handler = async (event) => {
  try {
    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[decisions] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }
    
    const userId = decoded.userId;
    const squadId = event.queryStringParameters?.squad_id;
    const filter = event.queryStringParameters?.filter; // e.g., "problem_statement"
    
    if (!squadId) {
      return json(400, { error: "squad_id é obrigatório" });
    }
    
    console.log("[decisions] Listing decisions for squad:", squadId);
    
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
    
    // Build query based on filter
    let queryText = `
      SELECT 
        id,
        title,
        decision,
        created_by_role,
        created_at,
        updated_at
      FROM sv.decisions
      WHERE squad_id = $1
    `;
    
    const params = [squadId];
    
    // Apply filter if specified
    if (filter === "problem_statement") {
      queryText += ` AND (title = 'Problem Statement' OR title = 'Problem Statement atualizado')`;
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT 50`;
    
    const result = await query(queryText, params);
    
    // Parse JSON decision field where applicable
    const decisions = result.rows.map(d => {
      let decisionContent = d.decision;
      
      // Try to parse as JSON
      try {
        decisionContent = JSON.parse(d.decision);
      } catch {
        // Keep as string if not JSON
      }
      
      return {
        id: d.id,
        title: d.title,
        decision: decisionContent,
        created_by_role: d.created_by_role,
        created_at: d.created_at,
        updated_at: d.updated_at
      };
    });
    
    console.log("[decisions] Found", decisions.length, "decisions");
    
    return json(200, {
      decisions,
      count: decisions.length
    });
  } catch (error) {
    console.error("[decisions] Erro:", error.message);
    console.error("[decisions] Stack:", error.stack);
    return json(500, { error: "Erro ao listar decisões" });
  }
};
