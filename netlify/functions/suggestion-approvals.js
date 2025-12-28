// netlify/functions/suggestion-approvals.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

// Constants
const PROBLEM_STATEMENT_TITLE = 'Problem Statement';
const DEFAULT_PERSONA_TYPE = 'cliente';

/**
 * Parse AI proposal payload and create individual suggestion proposals
 * @param {Object} proposal - AI structure proposal
 * @param {string} userId - User ID creating suggestions
 * @returns {Promise<Array>} Array of created suggestion IDs
 */
async function breakdownProposalIntoSuggestions(proposal, userId) {
  const suggestions = [];
  let displayOrder = 0;

  const proposalPayload = typeof proposal.proposal_payload === 'string'
    ? JSON.parse(proposal.proposal_payload)
    : proposal.proposal_payload;

  // 1. Decision Context
  if (proposalPayload.decision_context) {
    suggestions.push({
      type: 'decision_context',
      payload: proposalPayload.decision_context,
      order: displayOrder++
    });
  }

  // 2. Problem Maturity
  if (proposalPayload.problem_maturity) {
    suggestions.push({
      type: 'problem_maturity',
      payload: proposalPayload.problem_maturity,
      order: displayOrder++
    });
  }

  // 3. Personas (individual suggestions)
  if (proposalPayload.personas && Array.isArray(proposalPayload.personas)) {
    proposalPayload.personas.forEach(persona => {
      suggestions.push({
        type: 'persona',
        payload: persona,
        order: displayOrder++
      });
    });
  }

  // 4. Governance
  if (proposalPayload.governance) {
    suggestions.push({
      type: 'governance',
      payload: proposalPayload.governance,
      order: displayOrder++
    });
  }

  // 5. Squad Structure (Roles)
  if (proposalPayload.squad_structure?.roles && Array.isArray(proposalPayload.squad_structure.roles)) {
    proposalPayload.squad_structure.roles.forEach(role => {
      suggestions.push({
        type: 'squad_structure_role',
        payload: role,
        order: displayOrder++
      });
    });
  }

  // 6. Recommended Flow (Phases)
  if (proposalPayload.recommended_flow?.phases && Array.isArray(proposalPayload.recommended_flow.phases)) {
    // Group all phases into one suggestion for easier review
    suggestions.push({
      type: 'phase',
      payload: proposalPayload.recommended_flow.phases,
      order: displayOrder++
    });
  }

  // 7. Critical Unknowns (individual suggestions)
  if (proposalPayload.critical_unknowns && Array.isArray(proposalPayload.critical_unknowns)) {
    proposalPayload.critical_unknowns.forEach(unknown => {
      suggestions.push({
        type: 'critical_unknown',
        payload: unknown,
        order: displayOrder++
      });
    });
  }

  // 8. Execution Model
  if (proposalPayload.execution_model) {
    suggestions.push({
      type: 'execution_model',
      payload: proposalPayload.execution_model,
      order: displayOrder++
    });
  }

  // 9. Validation Strategy
  if (proposalPayload.validation_strategy) {
    suggestions.push({
      type: 'validation_strategy',
      payload: proposalPayload.validation_strategy,
      order: displayOrder++
    });
  }

  // 10. Readiness Assessment
  if (proposalPayload.readiness_assessment) {
    suggestions.push({
      type: 'readiness_assessment',
      payload: proposalPayload.readiness_assessment,
      order: displayOrder++
    });
  }

  // Insert all suggestions into database
  const createdSuggestions = [];
  for (const suggestion of suggestions) {
    const result = await query(
      `INSERT INTO sv.suggestion_proposals (
        proposal_id,
        squad_id,
        workspace_id,
        suggestion_type,
        suggestion_payload,
        display_order,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, suggestion_type, display_order`,
      [
        proposal.id,
        proposal.squad_id,
        proposal.workspace_id,
        suggestion.type,
        JSON.stringify(suggestion.payload),
        suggestion.order
      ]
    );
    createdSuggestions.push(result.rows[0]);
  }

  return createdSuggestions;
}

/**
 * GET /suggestion-approvals?squad_id=...
 * Get all pending suggestions for a squad
 */
async function getPendingSuggestions(event, userId) {
  const squadId = event.queryStringParameters?.squad_id;

  if (!squadId) {
    return json(400, { error: "squad_id é obrigatório" });
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
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Get pending suggestions
  const result = await query(
    `SELECT 
      id,
      proposal_id,
      suggestion_type,
      suggestion_payload,
      display_order,
      status,
      created_at
     FROM sv.suggestion_proposals
     WHERE squad_id = $1 AND status = 'pending'
     ORDER BY display_order ASC`,
    [squadId]
  );

  return json(200, {
    suggestions: result.rows.map(row => ({
      id: row.id,
      proposal_id: row.proposal_id,
      type: row.suggestion_type,
      payload: row.suggestion_payload,
      order: row.display_order,
      status: row.status,
      created_at: row.created_at
    }))
  });
}

/**
 * POST /suggestion-approvals/:id/approve
 * Approve a suggestion and persist to database
 */
async function approveSuggestion(event, suggestionId, userId) {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }

  // Get the suggestion
  const suggestionResult = await query(
    `SELECT 
      sp.id,
      sp.squad_id,
      sp.workspace_id,
      sp.suggestion_type,
      sp.suggestion_payload,
      sp.proposal_id,
      sp.status
     FROM sv.suggestion_proposals sp
     WHERE sp.id = $1`,
    [suggestionId]
  );

  if (suggestionResult.rows.length === 0) {
    return json(404, { error: "Sugestão não encontrada" });
  }

  const suggestion = suggestionResult.rows[0];

  if (suggestion.status !== 'pending') {
    return json(400, { error: "Apenas sugestões pendentes podem ser aprovadas" });
  }

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [suggestion.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Get edited payload if provided
  const finalPayload = body.edited_payload || suggestion.suggestion_payload;
  const wasEdited = !!body.edited_payload;

  // Persist suggestion to appropriate table based on type
  try {
    console.log(`[suggestion-approvals] Starting persistence for suggestion ${suggestionId}, type: ${suggestion.suggestion_type}`);
    await persistSuggestion(suggestion.suggestion_type, finalPayload, suggestion.squad_id, suggestion.workspace_id, userId);
    console.log(`[suggestion-approvals] Successfully persisted suggestion ${suggestionId}`);
  } catch (persistError) {
    console.error('[suggestion-approvals] Error persisting suggestion:', persistError.message);
    console.error('[suggestion-approvals] Error stack:', persistError.stack);
    console.error('[suggestion-approvals] Suggestion details:', {
      suggestionId,
      type: suggestion.suggestion_type,
      squadId: suggestion.squad_id,
      workspaceId: suggestion.workspace_id
    });
    return json(500, { 
      error: "Erro ao persistir sugestão", 
      details: persistError.message 
    });
  }

  // Update suggestion status
  await query(
    `UPDATE sv.suggestion_proposals
     SET status = $1,
         edited_payload = $2,
         decided_at = NOW(),
         decided_by_user_id = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [
      wasEdited ? 'approved_with_edits' : 'approved',
      wasEdited ? JSON.stringify(finalPayload) : null,
      userId,
      suggestionId
    ]
  );

  // Create decision log
  await query(
    `INSERT INTO sv.suggestion_decisions (
      suggestion_proposal_id,
      action,
      user_id,
      reason,
      changes_summary
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      suggestionId,
      wasEdited ? 'approved_with_edits' : 'approved',
      userId,
      body.reason || null,
      wasEdited ? JSON.stringify({ edited: true }) : null
    ]
  );

  return json(200, {
    ok: true,
    message: "Sugestão aprovada com sucesso",
    suggestion_id: suggestionId,
    was_edited: wasEdited
  });
}

/**
 * POST /suggestion-approvals/:id/reject
 * Reject a suggestion
 */
async function rejectSuggestion(event, suggestionId, userId) {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }

  // Get the suggestion
  const suggestionResult = await query(
    `SELECT 
      sp.id,
      sp.workspace_id,
      sp.status
     FROM sv.suggestion_proposals sp
     WHERE sp.id = $1`,
    [suggestionId]
  );

  if (suggestionResult.rows.length === 0) {
    return json(404, { error: "Sugestão não encontrada" });
  }

  const suggestion = suggestionResult.rows[0];

  if (suggestion.status !== 'pending') {
    return json(400, { error: "Apenas sugestões pendentes podem ser rejeitadas" });
  }

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [suggestion.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Update suggestion status
  await query(
    `UPDATE sv.suggestion_proposals
     SET status = 'rejected',
         rejection_reason = $1,
         decided_at = NOW(),
         decided_by_user_id = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [
      body.reason || null,
      userId,
      suggestionId
    ]
  );

  // Create decision log
  await query(
    `INSERT INTO sv.suggestion_decisions (
      suggestion_proposal_id,
      action,
      user_id,
      reason
    ) VALUES ($1, 'rejected', $2, $3)`,
    [
      suggestionId,
      userId,
      body.reason || null
    ]
  );

  return json(200, {
    ok: true,
    message: "Sugestão rejeitada",
    suggestion_id: suggestionId
  });
}

/**
 * Generate a slug/code from a label string
 * Example: "Tech Lead" -> "tech_lead"
 */
function generateCodeFromLabel(label) {
  if (!label) {
    // Use timestamp + random suffix to ensure uniqueness for empty labels
    return `unknown_role_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  const code = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters except spaces, underscores and hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace hyphens with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // If result is empty (only special chars), use fallback with timestamp + random
  if (!code) {
    return `unknown_role_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  return code;
}

/**
 * Persist approved suggestion to appropriate database table
 */
async function persistSuggestion(type, payload, squadId, workspaceId, userId) {
  console.log(`[suggestion-approvals] persistSuggestion called with type: ${type}, squadId: ${squadId}, workspaceId: ${workspaceId}`);
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  switch (type) {
    case 'decision_context':
      await query(
        `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
         VALUES ($1, $2, $3, $4, 'Human + AI')`,
        [
          squadId,
          'Contexto inicial da squad',
          JSON.stringify({
            why_now: data.why_now,
            what_is_at_risk: data.what_is_at_risk,
            decision_horizon: data.decision_horizon
          }),
          userId
        ]
      );
      break;

    case 'problem_maturity':
      // Update problem statement with maturity info
      // First check if problem statement exists
      const problemCheck = await query(
        `SELECT id FROM sv.decisions WHERE squad_id = $1 AND title = $2 LIMIT 1`,
        [squadId, PROBLEM_STATEMENT_TITLE]
      );

      if (problemCheck.rows.length > 0) {
        await query(
          `UPDATE sv.decisions
           SET decision = jsonb_set(
             jsonb_set(
               decision::jsonb,
               '{current_stage}',
               to_jsonb($1::text)
             ),
             '{confidence_level}',
             to_jsonb($2::text)
           )
           WHERE squad_id = $3 AND title = $4`,
          [data.current_stage, data.confidence_level, squadId, PROBLEM_STATEMENT_TITLE]
        );
      } else {
        console.warn(`[suggestion-approvals] Problem Statement not found for squad ${squadId}`);
      }
      break;

    case 'persona':
      console.log(`[suggestion-approvals] Processing persona: ${data.name} for squad ${squadId}`);
      
      // Step 1: Check if persona already exists in the workspace
      const existingPersonaCheck = await query(
        `SELECT id FROM sv.personas 
         WHERE workspace_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
         LIMIT 1`,
        [workspaceId, data.name]
      );

      let personaId;
      
      if (existingPersonaCheck.rows.length > 0) {
        // Persona already exists
        personaId = existingPersonaCheck.rows[0].id;
        console.log(`[suggestion-approvals] Persona already exists with id: ${personaId}`);
      } else {
        // Step 2: Create new persona
        console.log(`[suggestion-approvals] Creating new persona: ${data.name}`);
        const createPersonaResult = await query(
          `INSERT INTO sv.personas (
            workspace_id,
            name,
            type,
            description,
            goals,
            pain_points,
            active
          ) VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id`,
          [
            workspaceId,
            data.name,
            data.type || DEFAULT_PERSONA_TYPE,
            data.description,
            data.goals,
            data.pain_points
          ]
        );
        
        personaId = createPersonaResult.rows[0].id;
        console.log(`[suggestion-approvals] Persona created with id: ${personaId}`);
      }

      // Step 3: Always link persona to squad (whether new or existing)
      const linkPersonaResult = await query(
        `INSERT INTO sv.squad_personas (squad_id, persona_id)
         VALUES ($1, $2)
         ON CONFLICT (squad_id, persona_id) DO NOTHING
         RETURNING id`,
        [squadId, personaId]
      );
      
      if (linkPersonaResult.rows.length > 0) {
        console.log(`[suggestion-approvals] Persona linked to squad with association id: ${linkPersonaResult.rows[0].id}`);
      } else {
        console.log(`[suggestion-approvals] Persona-squad link already exists`);
      }
      
      // Step 4: Verify the link was created
      const verifyLinkResult = await query(
        `SELECT id FROM sv.squad_personas WHERE squad_id = $1 AND persona_id = $2`,
        [squadId, personaId]
      );
      
      if (verifyLinkResult.rows.length === 0) {
        console.error(`[suggestion-approvals] ERROR: Failed to link persona ${personaId} to squad ${squadId}`);
        throw new Error(`Falha ao vincular persona à squad`);
      }
      
      console.log(`[suggestion-approvals] Persona persistence completed successfully`);
      break;

    case 'governance':
      // Store in squad settings or create governance record
      await query(
        `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
         VALUES ($1, 'Governance Rules', $2, $3, 'Human + AI')`,
        [
          squadId,
          JSON.stringify({
            decision_rules: data.decision_rules,
            non_negotiables: data.non_negotiables
          }),
          userId
        ]
      );
      break;

    case 'squad_structure_role':
      console.log(`[suggestion-approvals] Processing role: ${data.role || data.label} for squad ${squadId}`);
      
      const roleLabel = data.role || data.label;
      
      // Step 1: Check if role exists in global or workspace roles
      const roleResult = await query(
        `SELECT id, 'global' as source FROM sv.roles WHERE LOWER(TRIM(label)) = LOWER(TRIM($1))
         UNION ALL
         SELECT id, 'workspace' as source FROM sv.workspace_roles WHERE workspace_id = $2 AND LOWER(TRIM(label)) = LOWER(TRIM($1))
         LIMIT 1`,
        [roleLabel, workspaceId]
      );

      let roleId = null;
      let workspaceRoleId = null;

      if (roleResult.rows.length > 0) {
        // Role already exists
        const existingRole = roleResult.rows[0];
        
        if (existingRole.source === 'global') {
          roleId = existingRole.id;
          console.log(`[suggestion-approvals] Role already exists as global role with id: ${roleId}`);
        } else {
          workspaceRoleId = existingRole.id;
          console.log(`[suggestion-approvals] Role already exists as workspace role with id: ${workspaceRoleId}`);
        }
      } else {
        // Step 2: Create new workspace role
        console.log(`[suggestion-approvals] Creating new workspace role: ${roleLabel}`);
        // Create as workspace role first
        const roleLabel = data.role || data.label;
        const roleCode = generateCodeFromLabel(roleLabel);
        
        const newRoleResult = await query(
          `INSERT INTO sv.workspace_roles (
            workspace_id,
            code,
            label,
            description,
            responsibilities
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [
            workspaceId,
            roleCode,
            roleLabel,
            data.description,
            data.accountability || data.responsibility
          ]
        );
        
        workspaceRoleId = newRoleResult.rows[0].id;
        console.log(`[suggestion-approvals] Workspace role created with id: ${workspaceRoleId}`);
      }

      // Step 3: Always link role to squad (whether new or existing)
      // Note: We use conditional queries here because PostgreSQL doesn't handle NULL values
      // in comparisons the way we need. "role_id = $2" when $2 is NULL won't match NULL rows.
      // The schema constraint ensures exactly one of role_id or workspace_role_id is NOT NULL.
      const roleCheckQuery = roleId 
        ? `SELECT id FROM sv.squad_roles WHERE squad_id = $1 AND role_id = $2`
        : `SELECT id FROM sv.squad_roles WHERE squad_id = $1 AND workspace_role_id = $2`;
      const roleCheckParams = roleId ? [squadId, roleId] : [squadId, workspaceRoleId];

      // Check if the squad_role already exists first
      const existingSquadRoleCheck = await query(roleCheckQuery, roleCheckParams);

      if (existingSquadRoleCheck.rows.length > 0) {
        console.log(`[suggestion-approvals] Squad role link already exists with id: ${existingSquadRoleCheck.rows[0].id}`);
      } else {
        console.log(`[suggestion-approvals] Linking role to squad...`);
        // The INSERT always includes both IDs; schema constraint ensures only one is non-null
        const linkRoleResult = await query(
          `INSERT INTO sv.squad_roles (
            squad_id,
            role_id,
            workspace_role_id,
            active
          ) VALUES ($1, $2, $3, true)
          RETURNING id`,
          [
            squadId,
            roleId,
            workspaceRoleId
          ]
        );
        
        console.log(`[suggestion-approvals] Role linked to squad with squad_role id: ${linkRoleResult.rows[0].id}`);
      }
      
      // Step 4: Verify the link was created
      const verifyRoleLinkResult = await query(roleCheckQuery, roleCheckParams);
      
      if (verifyRoleLinkResult.rows.length === 0) {
        console.error(`[suggestion-approvals] ERROR: Failed to link role to squad ${squadId}`);
        throw new Error(`Falha ao vincular papel à squad`);
      }
      
      console.log(`[suggestion-approvals] Role persistence completed successfully`);
      break;

    case 'phase':
      // Data is an array of phases
      const phases = Array.isArray(data) ? data : [data];
      
      console.log(`[suggestion-approvals] Processing ${phases.length} phases for squad ${squadId}`);
      
      // Check for existing phases to avoid duplicates
      const existingPhasesResult = await query(
        `SELECT name, order_index FROM sv.phases WHERE squad_id = $1 ORDER BY order_index DESC`,
        [squadId]
      );
      
      const existingPhases = existingPhasesResult.rows;
      console.log(`[suggestion-approvals] Found ${existingPhases.length} existing phases`);
      
      // Get the highest order_index to continue sequence (first row due to DESC ordering)
      const maxOrderIndex = existingPhases.length > 0 ? existingPhases[0].order_index : 0;
      
      // Build a set of existing phase names (case-insensitive) for quick lookup
      const existingPhaseNames = new Set(
        existingPhases.map(p => p.name.toLowerCase().trim())
      );
      
      // Insert only phases that don't already exist
      let insertedCount = 0;
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const phaseName = phase.name.trim();
        const phaseNameLower = phaseName.toLowerCase();
        
        // Skip if phase with same name already exists
        if (existingPhaseNames.has(phaseNameLower)) {
          console.log(`[suggestion-approvals] Skipping duplicate phase: ${phaseName}`);
          continue;
        }
        
        // Calculate order_index: continue from max existing order
        const orderIndex = maxOrderIndex + insertedCount + 1;
        
        // Insert new phase
        await query(
          `INSERT INTO sv.phases (
            squad_id,
            name,
            order_index
          ) VALUES ($1, $2, $3)`,
          [squadId, phaseName, orderIndex]
        );
        
        insertedCount++;
        console.log(`[suggestion-approvals] Inserted phase: ${phaseName} with order ${orderIndex}`);
      }
      
      console.log(`[suggestion-approvals] Phase persistence completed: ${insertedCount} new phases inserted, ${phases.length - insertedCount} duplicates skipped`);
      break;

    case 'critical_unknown':
      await query(
        `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
         VALUES ($1, $2, $3, $4, 'Human + AI')`,
        [
          squadId,
          'Incerteza Crítica',
          JSON.stringify({
            question: data.question,
            why_it_matters: data.why_it_matters,
            how_to_reduce: data.how_to_reduce
          }),
          userId
        ]
      );
      break;

    case 'execution_model':
      await query(
        `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
         VALUES ($1, 'Execution Model', $2, $3, 'Human + AI')`,
        [
          squadId,
          JSON.stringify({
            approach: data.approach,
            constraints: data.constraints,
            responsibilities: data.responsibilities
          }),
          userId
        ]
      );
      break;

    case 'validation_strategy':
      await query(
        `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
         VALUES ($1, 'Validation Strategy', $2, $3, 'Human + AI')`,
        [
          squadId,
          JSON.stringify({
            signals_to_stop: data.signals_to_stop,
            signals_of_confidence: data.signals_of_confidence
          }),
          userId
        ]
      );
      break;

    case 'readiness_assessment':
      // Update squad status based on readiness
      const newStatus = data.is_ready_to_build_product ? 'ativa' : 'rascunho';
      await query(
        `UPDATE sv.squads
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newStatus, squadId]
      );
      break;

    default:
      console.error(`[suggestion-approvals] Unknown suggestion type: ${type}`);
      throw new Error(`Tipo de sugestão desconhecido: ${type}`);
  }
}

/**
 * POST /suggestion-approvals/breakdown
 * Break down an AI proposal into individual suggestions
 */
async function breakdownProposal(event, userId) {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }

  const { proposal_id } = body;

  if (!proposal_id) {
    return json(400, { error: "proposal_id é obrigatório" });
  }

  // Get the proposal
  const proposalResult = await query(
    `SELECT 
      p.id,
      p.squad_id,
      p.workspace_id,
      p.proposal_payload,
      p.status
     FROM sv.ai_structure_proposals p
     WHERE p.id = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    return json(404, { error: "Proposta não encontrada" });
  }

  const proposal = proposalResult.rows[0];

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [proposal.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Check if suggestions already exist for this proposal
  const existingCheck = await query(
    `SELECT COUNT(*) as count FROM sv.suggestion_proposals WHERE proposal_id = $1`,
    [proposal_id]
  );

  if (existingCheck.rows[0].count > 0) {
    return json(400, { error: "Sugestões já foram criadas para esta proposta" });
  }

  // Break down proposal into suggestions
  const createdSuggestions = await breakdownProposalIntoSuggestions(proposal, userId);

  return json(201, {
    ok: true,
    message: "Proposta dividida em sugestões individuais",
    suggestions_count: createdSuggestions.length,
    suggestions: createdSuggestions
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
      console.error("[suggestion-approvals] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    const method = event.httpMethod;
    const path = event.path;

    // Route to appropriate handler
    if (method === "GET") {
      return await getPendingSuggestions(event, userId);
    } else if (method === "POST") {
      if (path.includes("/approve")) {
        const pathSegments = path.split("/").filter(Boolean);
        const suggestionId = pathSegments[pathSegments.length - 2];
        return await approveSuggestion(event, suggestionId, userId);
      } else if (path.includes("/reject")) {
        const pathSegments = path.split("/").filter(Boolean);
        const suggestionId = pathSegments[pathSegments.length - 2];
        return await rejectSuggestion(event, suggestionId, userId);
      } else if (path.includes("/breakdown")) {
        return await breakdownProposal(event, userId);
      } else {
        return json(405, { error: "Método não permitido" });
      }
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[suggestion-approvals] Erro:", error.message);
    console.error("[suggestion-approvals] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
