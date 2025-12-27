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

  // Define timeline items
  const timelineItems = [
    {
      key: "problem",
      title: "Análise do Problema",
      state: "done", // Always done for now (future: check problem statement)
      relativeTime: "Há 2 dias",
    },
    {
      key: "personas",
      title: "Definição de Personas",
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
      state: hasPhases
        ? "done"
        : hasIssues || hasDecisions
          ? "current"
          : hasPersonas
            ? "next"
            : "future",
      relativeTime: hasPhases ? "Há 12 horas" : null,
    },
    {
      key: "issues",
      title: "Geração de Issues",
      state: hasIssues
        ? "done"
        : hasDecisions
          ? "current"
          : hasPhases
            ? "next"
            : "future",
      relativeTime: hasIssues ? "Há 6 horas" : null,
    },
    {
      key: "validation",
      title: "Validação Final",
      state: hasDecisions
        ? "done"
        : hasIssues
          ? "current"
          : hasPhases
            ? "next"
            : "future",
      relativeTime: hasDecisions ? "Há 2 horas" : null,
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
        initials = m.name.substring(0, 2).toUpperCase();
      } else if (m.role_code) {
        initials = m.role_code;
      }
      
      return {
        initials,
        name: m.name || m.email,
        role: m.role_label || "Membro",
        active: m.active,
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
    });
  } catch (error) {
    console.error("[squad-overview] Erro:", error.message);
    console.error("[squad-overview] Stack:", error.stack);
    return json(500, { error: "Erro ao carregar overview da squad" });
  }
};
