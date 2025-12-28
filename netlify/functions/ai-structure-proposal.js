// netlify/functions/ai-structure-proposal.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");
const { callOpenAI } = require("./_lib/openai");
const { getActivePrompt, renderPrompt, logPromptExecution } = require("./_lib/prompts");

/**
 * POST /ai/structure-proposal
 * Generate AI structure proposal based on problem statement
 */
async function generateProposal(event, userId) {
  console.log("[ai-structure-proposal] Generating structure proposal");

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
  }

  const { squad_id } = body;

  if (!squad_id) {
    return json(400, { error: "squad_id é obrigatório" });
  }

  // Get squad and workspace
  const squadResult = await query(
    `SELECT s.id, s.workspace_id, s.name, s.description, w.name as workspace_name
     FROM sv.squads s
     JOIN sv.workspaces w ON s.workspace_id = w.id
     WHERE s.id = $1`,
    [squad_id]
  );

  if (squadResult.rows.length === 0) {
    return json(404, { error: "Squad não encontrada" });
  }

  const squad = squadResult.rows[0];
  const workspaceId = squad.workspace_id;

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Get problem statement
  const problemResult = await query(
    `SELECT id, decision, created_at
     FROM sv.decisions
     WHERE squad_id = $1 AND title = 'Problem Statement'
     ORDER BY created_at DESC
     LIMIT 1`,
    [squad_id]
  );

  if (problemResult.rows.length === 0) {
    return json(400, { 
      error: "É necessário definir um Problem Statement antes de gerar uma proposta de estrutura" 
    });
  }

  const problemRecord = problemResult.rows[0];
  const problemStatement = JSON.parse(problemRecord.decision);

  // Get existing backlog (issues)
  console.log(`[ai-structure-proposal] Buscando existing issues para squad: ${squad_id}`);
  const issuesResult = await query(
    `SELECT title, description, status
     FROM sv.issues
     WHERE squad_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [squad_id]
  );
  console.log(`[ai-structure-proposal] Issues encontradas: ${issuesResult.rows.length}`);

  // Get existing roles
  console.log(`[ai-structure-proposal] Buscando existing roles para squad: ${squad_id}`);
  const rolesResult = await query(
    `SELECT 
       COALESCE(sr.name, r.label, wr.label) as label,
       COALESCE(sr.description, r.description, wr.description, '') as description
     FROM sv.squad_roles sr
     LEFT JOIN sv.roles r ON sr.role_id = r.id
     LEFT JOIN sv.workspace_roles wr ON sr.workspace_role_id = wr.id
     WHERE sr.squad_id = $1 AND sr.active = true`,
    [squad_id]
  );
  console.log(`[ai-structure-proposal] Roles encontradas: ${rolesResult.rows.length}`);

  // Get existing personas
  console.log(`[ai-structure-proposal] Buscando existing personas para squad: ${squad_id}`);
  const personasResult = await query(
    `SELECT p.name, p.type, p.goals, p.pain_points
     FROM sv.personas p
     JOIN sv.squad_personas sp ON p.id = sp.persona_id
     WHERE sp.squad_id = $1 AND p.active = true`,
    [squad_id]
  );
  console.log(`[ai-structure-proposal] Personas encontradas: ${personasResult.rows.length}`);

  // Build input snapshot
  const inputSnapshot = {
    squad: {
      id: squad.id,
      name: squad.name,
      description: squad.description,
      workspace_name: squad.workspace_name,
    },
    problem_statement: problemStatement,
    existing_backlog: issuesResult.rows,
    existing_roles: rolesResult.rows,
    existing_personas: personasResult.rows,
    captured_at: new Date().toISOString(),
  };

  // Determine source context
  let sourceContext = "PROBLEM";
  if (issuesResult.rows.length > 0) {
    sourceContext = "BOTH";
  }

  // Get active prompt
  const promptVersion = await getActivePrompt("structure-proposal-v1");
  if (!promptVersion) {
    return json(500, { error: "Prompt ativo não encontrado no banco" });
  }

  // Prepare variables for prompt rendering
  const promptVariables = {
    squad_context: `Squad: ${squad.name}\nWorkspace: ${squad.workspace_name}\nDescrição: ${squad.description || "Não definida"}`,
    problem_statement: `Título: ${problemStatement.title}\n\nNarrativa: ${problemStatement.narrative}\n\nMétricas de Sucesso: ${problemStatement.success_metrics || "Não definidas"}\n\nRestrições: ${problemStatement.constraints || "Nenhuma"}\n\nPremissas: ${problemStatement.assumptions || "Nenhuma"}\n\nPerguntas em Aberto: ${problemStatement.open_questions || "Nenhuma"}`,
    existing_backlog: issuesResult.rows.length > 0 
      ? issuesResult.rows.map(i => `- ${i.title}: ${i.description || ""}`).join("\n")
      : null,
    existing_roles: rolesResult.rows.length > 0
      ? rolesResult.rows.map(r => `- ${r.label}: ${r.description || ""}`).join("\n")
      : null,
    existing_personas: personasResult.rows.length > 0
      ? personasResult.rows.map(p => `- ${p.name} (${p.type}): ${p.goals || ""}`).join("\n")
      : null,
    input_snapshot: JSON.stringify(inputSnapshot, null, 2),
  };

  // Render prompt
  const userPrompt = renderPrompt(promptVersion.prompt_text, promptVariables);

  // Helper function to build input snapshot for logging
  const buildInputSnapshot = () => ({
    prompt_version_id: promptVersion.id,
    prompt_name: promptVersion.prompt_name,
    workspace_id: workspaceId,
    squad_id: squad_id,
    squad_name: squad.name,
    problem_statement_summary: {
      title: problemStatement?.title || "N/A",
      has_narrative: !!problemStatement?.narrative,
      has_success_metrics: !!problemStatement?.success_metrics
    },
    context_counts: {
      existing_issues: issuesResult.rows.length,
      existing_roles: rolesResult.rows.length,
      existing_personas: personasResult.rows.length
    },
    source_context: sourceContext,
    captured_at: new Date().toISOString()
  });

  // Call OpenAI
  let aiResponse;
  let executionError = null;
  let outputSnapshot = null;

  try {
    aiResponse = await callOpenAI({
      systemInstructions: promptVersion.system_instructions,
      userPrompt,
      model: promptVersion.model_name,
      temperature: promptVersion.temperature,
      jsonMode: true,
    });

    // Build output snapshot immediately after OpenAI response
    outputSnapshot = {
      ok: true,
      model: aiResponse.model,
      execution_time_ms: aiResponse.executionTimeMs,
      usage: aiResponse.usage,
      openai_response_compact: aiResponse.rawResponse,
      text_preview: aiResponse.content ? aiResponse.content.substring(0, 2000) : null,
      finish_reason: aiResponse.finishReason,
    };

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse.content);
      outputSnapshot.parsed_json = parsedResponse;
    } catch (parseError) {
      console.error("[ai-structure-proposal] Failed to parse AI response:", parseError.message);
      outputSnapshot.ok = false;
      outputSnapshot.validation_error = "Failed to parse JSON response";
      outputSnapshot.parse_error = parseError.message;
      throw new Error("A IA retornou uma resposta inválida. Por favor, tente novamente.");
    }

    // Check if AI needs clarification
    if (parsedResponse.needs_clarification) {
      // Return the clarification question to the user
      // For now, we'll just proceed with uncertainties marked
      // A future enhancement could support interactive clarification
      console.log("[ai-structure-proposal] AI requested clarification:", parsedResponse.clarification_question);
    }

    if (!parsedResponse.proposal) {
      outputSnapshot.ok = false;
      outputSnapshot.validation_error = "AI não retornou uma proposta válida";
      throw new Error("AI não retornou uma proposta válida");
    }

    // Store the proposal
    const proposalResult = await query(
      `INSERT INTO sv.ai_structure_proposals (
        squad_id,
        problem_id,
        workspace_id,
        source_context,
        input_snapshot,
        proposal_payload,
        uncertainties,
        model_name,
        prompt_version,
        created_by_user_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
      RETURNING id, created_at`,
      [
        squad_id,
        problemRecord.id,
        workspaceId,
        sourceContext,
        JSON.stringify(inputSnapshot),
        JSON.stringify(parsedResponse.proposal),
        JSON.stringify(parsedResponse.proposal.uncertainties || []),
        aiResponse.model,
        promptVersion.id,
        userId,
      ]
    );

    const proposalId = proposalResult.rows[0].id;

    // Log execution
    await logPromptExecution({
      promptVersionId: promptVersion.id,
      proposalId,
      workspaceId,
      relatedEntityType: 'squad',
      relatedEntityId: squad_id,
      inputSnapshot: buildInputSnapshot(),
      outputSnapshot: outputSnapshot,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
      totalTokens: aiResponse.usage.totalTokens,
      executionTimeMs: aiResponse.executionTimeMs,
      success: true,
      userId,
    });

    console.log("[ai-structure-proposal] Proposal generated successfully:", proposalId);

    return json(201, {
      ok: true,
      proposal: {
        id: proposalId,
        squad_id,
        status: "DRAFT",
        proposal_payload: parsedResponse.proposal,
        uncertainties: parsedResponse.proposal.uncertainties || [],
        source_context: sourceContext,
        created_at: proposalResult.rows[0].created_at,
      },
    });
  } catch (error) {
    executionError = error.message;

    console.error("[ai-structure-proposal] Error generating proposal:", error.message);

    // Build error output snapshot
    if (!outputSnapshot) {
      outputSnapshot = {
        ok: false,
        model: aiResponse?.model || promptVersion.model_name,
        execution_time_ms: aiResponse?.executionTimeMs || 0,
        usage: aiResponse?.usage || null,
        validation_error: executionError,
        raw_error: error.stack || error.message
      };
    }

    // Log failed execution
    if (promptVersion) {
      await logPromptExecution({
        promptVersionId: promptVersion.id,
        proposalId: null,
        workspaceId,
        relatedEntityType: 'squad',
        relatedEntityId: squad_id,
        inputSnapshot: buildInputSnapshot(),
        outputSnapshot: outputSnapshot,
        inputTokens: aiResponse?.usage?.inputTokens || 0,
        outputTokens: aiResponse?.usage?.outputTokens || 0,
        totalTokens: aiResponse?.usage?.totalTokens || 0,
        executionTimeMs: aiResponse?.executionTimeMs || 0,
        success: false,
        errorMessage: executionError,
        userId,
      });
    }

    return json(500, {
      error: "Erro ao gerar proposta com IA",
      details: error.message,
    });
  }
}

/**
 * POST /ai/structure-proposal/:id/confirm
 * Confirm a proposal and create a hybrid decision
 */
async function confirmProposal(event, proposalId, userId) {
  console.log("[ai-structure-proposal] Confirming proposal:", proposalId);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Body JSON inválido" });
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
    [proposalId]
  );

  if (proposalResult.rows.length === 0) {
    return json(404, { error: "Proposta não encontrada" });
  }

  const proposal = proposalResult.rows[0];

  if (proposal.status !== "DRAFT") {
    return json(400, { error: "Apenas propostas em rascunho podem ser confirmadas" });
  }

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [proposal.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // User can optionally provide edited proposal
  const finalProposal = body.edited_proposal || JSON.parse(proposal.proposal_payload);

  // Update proposal status
  await query(
    `UPDATE sv.ai_structure_proposals
     SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [proposalId]
  );

  // Create a hybrid decision record
  const decisionPayload = {
    type: "AI_STRUCTURE_PROPOSAL_CONFIRMED",
    proposal_id: proposalId,
    confirmed_by: "Human + AI",
    proposal: finalProposal,
    confirmed_at: new Date().toISOString(),
  };

  await query(
    `INSERT INTO sv.decisions (squad_id, title, decision, created_by_user_id, created_by_role)
     VALUES ($1, 'Proposta de Estrutura da IA confirmada', $2, $3, 'Human + AI')`,
    [proposal.squad_id, JSON.stringify(decisionPayload), userId]
  );

  console.log("[ai-structure-proposal] Proposal confirmed and decision created");

  return json(200, {
    ok: true,
    message: "Proposta confirmada com sucesso",
    proposal_id: proposalId,
  });
}

/**
 * POST /ai/structure-proposal/:id/discard
 * Discard a proposal
 */
async function discardProposal(event, proposalId, userId) {
  console.log("[ai-structure-proposal] Discarding proposal:", proposalId);

  // Get the proposal
  const proposalResult = await query(
    `SELECT 
      p.id,
      p.workspace_id,
      p.status
     FROM sv.ai_structure_proposals p
     WHERE p.id = $1`,
    [proposalId]
  );

  if (proposalResult.rows.length === 0) {
    return json(404, { error: "Proposta não encontrada" });
  }

  const proposal = proposalResult.rows[0];

  if (proposal.status !== "DRAFT") {
    return json(400, { error: "Apenas propostas em rascunho podem ser descartadas" });
  }

  // Verify user is member of workspace
  const memberCheck = await query(
    `SELECT 1 FROM sv.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [proposal.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    return json(403, { error: "Acesso negado ao workspace" });
  }

  // Update proposal status
  await query(
    `UPDATE sv.ai_structure_proposals
     SET status = 'DISCARDED', discarded_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [proposalId]
  );

  console.log("[ai-structure-proposal] Proposal discarded");

  return json(200, {
    ok: true,
    message: "Proposta descartada",
  });
}

/**
 * GET /ai/structure-proposal?squad_id=...
 * Get the latest draft proposal for a squad
 */
async function getLatestProposal(event, userId) {
  const squadId = event.queryStringParameters?.squad_id;

  if (!squadId) {
    return json(400, { error: "squad_id é obrigatório" });
  }

  console.log("[ai-structure-proposal] Getting latest proposal for squad:", squadId);

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

  // Get the latest draft proposal
  const result = await query(
    `SELECT 
      id,
      proposal_payload,
      uncertainties,
      status,
      created_at
     FROM sv.ai_structure_proposals
     WHERE squad_id = $1 AND status = 'DRAFT'
     ORDER BY created_at DESC
     LIMIT 1`,
    [squadId]
  );

  if (result.rows.length === 0) {
    return json(200, { proposal: null });
  }

  const proposal = result.rows[0];

  return json(200, {
    proposal: {
      id: proposal.id,
      squad_id: squadId,
      status: proposal.status,
      proposal_payload: JSON.parse(proposal.proposal_payload),
      uncertainties: JSON.parse(proposal.uncertainties || "[]"),
      created_at: proposal.created_at,
    },
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
      console.error("[ai-structure-proposal] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;
    const method = event.httpMethod;
    const path = event.path;

    // Route to appropriate handler
    if (method === "POST") {
      // Check if it's a confirmation or discard action
      if (path.includes("/confirm")) {
        const pathSegments = path.split("/").filter(Boolean);
        const proposalId = pathSegments[pathSegments.length - 2];
        return await confirmProposal(event, proposalId, userId);
      } else if (path.includes("/discard")) {
        const pathSegments = path.split("/").filter(Boolean);
        const proposalId = pathSegments[pathSegments.length - 2];
        return await discardProposal(event, proposalId, userId);
      } else {
        // Generate new proposal
        return await generateProposal(event, userId);
      }
    } else if (method === "GET") {
      return await getLatestProposal(event, userId);
    } else {
      return json(405, { error: "Método não permitido" });
    }
  } catch (error) {
    console.error("[ai-structure-proposal] Erro:", error.message);
    console.error("[ai-structure-proposal] Stack:", error.stack);
    return json(500, { error: "Erro ao processar requisição" });
  }
};
