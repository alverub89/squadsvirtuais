// netlify/functions/squad-overview.js
const { query } = require("./_lib/db");
const { authenticateRequest } = require("./_lib/auth");
const { json } = require("./_lib/response");

/**
 * Calculate relative time from a date
 * @param {Date} date - Date to calculate from
 * @returns {string} - Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? "Há 1 minuto" : `Há ${diffMinutes} minutos`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "Há 1 hora" : `Há ${diffHours} horas`;
  } else {
    return diffDays === 1 ? "Há 1 dia" : `Há ${diffDays} dias`;
  }
}

/**
 * Build timeline based on squad data
 */
async function buildTimeline(squadId) {
  // Check data signals
  const [personasResult, phasesResult, issuesResult, decisionsResult] =
    await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM sv.personas WHERE squad_id = $1 AND active = true`,
        [squadId]
      ),
      query(`SELECT COUNT(*) as count FROM sv.phases WHERE squad_id = $1`, [
        squadId,
      ]),
      query(`SELECT COUNT(*) as count FROM sv.issues WHERE squad_id = $1`, [
        squadId,
      ]),
      query(`SELECT COUNT(*) as count FROM sv.decisions WHERE squad_id = $1`, [
        squadId,
      ]),
    ]);

  const hasPersonas = parseInt(personasResult.rows[0]?.count || 0) > 0;
  const hasPhases = parseInt(phasesResult.rows[0]?.count || 0) > 0;
  const hasIssues = parseInt(issuesResult.rows[0]?.count || 0) > 0;
  const hasDecisions = parseInt(decisionsResult.rows[0]?.count || 0) > 0;

  // Define timeline items with descriptions
  const timelineItems = [
    {
      key: "problem",
      title: "Análise do Problema",
      description: "A squad analisou o problema de negócio e identificou os principais requisitos.",
      state: "done", // Always done for now (future: check problem statement)
      relativeTime: "Há 2 dias",
    },
    {
      key: "personas",
      title: "Definição de Personas",
      description: "Foram criadas 3 personas principais para validar as decisões do produto.",
      state: hasPersonas
        ? "done"
        : hasPhases || hasIssues || hasDecisions
          ? "current"
          : "next",
      relativeTime: hasPersonas ? "Há 1 dia" : null,
    },
    {
      key: "backlog",
      title: "Estruturação do Backlog",
      description: "Organizando as features em épicos e criando as primeiras user stories.",
      state: hasPhases
        ? "done"
        : hasIssues || hasDecisions
          ? "current"
          : hasPersonas
            ? "next"
            : "future",
      relativeTime: hasPhases ? "Agora" : null,
    },
    {
      key: "issues",
      title: "Geração de Issues",
      description: "Criar issues técnicas detalhadas para cada user story.",
      state: hasIssues
        ? "done"
        : hasDecisions
          ? "current"
          : hasPhases
            ? "next"
            : "future",
      relativeTime: hasIssues ? null : "Próximo",
    },
    {
      key: "validation",
      title: "Validação Final",
      description: "Revisão completa pela squad antes de enviar ao GitHub.",
      state: hasDecisions
        ? "done"
        : hasIssues
          ? "current"
          : hasPhases
            ? "next"
            : "future",
      relativeTime: hasDecisions ? null : "Futuro",
    },
  ];

  return timelineItems;
}

/**
 * GET /.netlify/functions/squad-overview?id={squadId}
 * Returns complete overview data for a squad
 */
exports.handler = async (event) => {
  try {
    // Authenticate user
    let decoded;
    try {
      decoded = authenticateRequest(event);
    } catch (error) {
      console.error("[squad-overview] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Get squad ID from query params (required)
    const squadId = event.queryStringParameters?.id;

    if (!squadId) {
      return json(400, { error: "id é obrigatório" });
    }

    console.log("[squad-overview] Fetching overview for squad:", squadId);

    // Get squad details
    const squadResult = await query(
      `
      SELECT 
        s.id,
        s.workspace_id,
        s.name,
        s.description,
        s.status
      FROM sv.squads s
      WHERE s.id = $1
      `,
      [squadId]
    );

    if (squadResult.rows.length === 0) {
      return json(404, { error: "Squad não encontrada" });
    }

    const squad = squadResult.rows[0];

    // Verify user is member of workspace (internal validation)
    const memberCheck = await query(
      `
      SELECT 1 FROM sv.workspace_members
      WHERE workspace_id = $1 AND user_id = $2
      `,
      [squad.workspace_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      console.log("[squad-overview] Usuário não é membro do workspace");
      return json(403, { error: "Acesso negado ao workspace" });
    }

    // Get counts
    const [issuesCount, phasesData, membersCount] = await Promise.all([
      // Count issues
      query(
        `SELECT COUNT(*) as count FROM sv.issues WHERE squad_id = $1`,
        [squadId]
      ),
      // Get phases data
      query(
        `
        SELECT 
          COUNT(*) as total,
          MAX(order_index) as max_order
        FROM sv.phases 
        WHERE squad_id = $1
        `,
        [squadId]
      ),
      // Count active members
      query(
        `
        SELECT COUNT(*) as count 
        FROM sv.squad_members 
        WHERE squad_id = $1 AND active = true
        `,
        [squadId]
      ),
    ]);

    const counts = {
      members: parseInt(membersCount.rows[0]?.count || 0),
      issues: parseInt(issuesCount.rows[0]?.count || 0),
      phase: {
        current: phasesData.rows[0]?.max_order || 0,
        total: parseInt(phasesData.rows[0]?.total || 0),
      },
    };

    // Build timeline based on data signals
    const timeline = await buildTimeline(squadId);

    // Get members preview (first 3 active members)
    const membersResult = await query(
      `
      SELECT 
        sm.role_code,
        sm.role_label,
        sm.active,
        u.name,
        u.email
      FROM sv.squad_members sm
      JOIN sv.users u ON sm.user_id = u.id
      WHERE sm.squad_id = $1 AND sm.active = true
      ORDER BY sm.created_at
      LIMIT 3
      `,
      [squadId]
    );

    const membersPreview = membersResult.rows.map((m) => {
      // Generate initials from name (first 2 chars) or role_code as fallback
      let initials = "??";
      if (m.name) {
        const nameParts = m.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          // Use first letter of first name and first letter of last name
          initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else {
          // Use first 2 letters of single name
          initials = m.name.substring(0, 2).toUpperCase();
        }
      } else if (m.role_code) {
        initials = m.role_code;
      }
      
      return {
        initials,
        name: m.name || m.email,
        role: m.role_label || "Membro",
        active: m.active,
        online: true, // Placeholder - all members shown as online for now
      };
    });

    // Get recent decisions (last 5)
    const decisionsResult = await query(
      `
      SELECT 
        title,
        decision,
        created_by_role,
        created_at
      FROM sv.decisions
      WHERE squad_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [squadId]
    );

    const recentDecisions = decisionsResult.rows.map((d) => ({
      title: d.title,
      summary: d.decision,
      role: d.created_by_role || "Squad",
      relativeTime: getRelativeTime(d.created_at),
    }));

    // Determine the next available phase
    const currentPhaseIndex = timeline.findIndex(item => item.state === 'current');
    const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < timeline.length - 1 
      ? timeline[currentPhaseIndex] 
      : null;

    console.log("[squad-overview] Overview fetched successfully for squad:", squadId);

    return json(200, {
      squad: {
        id: squad.id,
        workspaceId: squad.workspace_id,
        name: squad.name,
        description: squad.description,
        status: squad.status,
      },
      counts,
      timeline,
      membersPreview,
      recentDecisions,
      nextPhase: nextPhase ? {
        title: nextPhase.title,
        description: nextPhase.description,
      } : null,
    });
  } catch (error) {
    console.error("[squad-overview] Erro:", error.message);
    console.error("[squad-overview] Stack:", error.stack);
    return json(500, { error: "Erro ao carregar overview da squad" });
  }
};
