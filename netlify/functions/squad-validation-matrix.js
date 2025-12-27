// netlify/functions/squad-validation-matrix.js
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
      console.error("[squad-validation-matrix] Erro na autenticação:", error.message);
      return json(401, { error: "Não autenticado" });
    }

    const userId = decoded.userId;

    // Handle GET (get current validation matrix version)
    if (event.httpMethod === "GET") {
      const squadId = event.queryStringParameters?.squad_id;

      if (!squadId) {
        return json(400, { error: "squad_id é obrigatório" });
      }

      console.log("[squad-validation-matrix] Buscando matriz de validação para squad:", squadId);

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
        console.log("[squad-validation-matrix] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // Get latest version for this squad
      const versionResult = await query(
        `
        SELECT 
          id,
          squad_id,
          version,
          description,
          created_by_user_id,
          created_at
        FROM sv.squad_validation_matrix_versions
        WHERE squad_id = $1
        ORDER BY version DESC
        LIMIT 1
        `,
        [squadId]
      );

      if (versionResult.rows.length === 0) {
        // No matrix version exists yet
        return json(200, {
          ok: true,
          version: null,
          entries: []
        });
      }

      const version = versionResult.rows[0];

      // Get all entries for this version
      const entriesResult = await query(
        `
        SELECT 
          e.id,
          e.version_id,
          e.squad_role_id,
          e.persona_id,
          e.checkpoint_type,
          e.requirement_level,
          e.created_at,
          COALESCE(r.code, wr.code) as role_code,
          COALESCE(r.label, wr.label) as role_label,
          CASE 
            WHEN sr.role_id IS NOT NULL THEN 'global'
            ELSE 'workspace'
          END as role_source,
          p.name as persona_name,
          p.type as persona_type
        FROM sv.squad_validation_matrix_entries e
        JOIN sv.squad_roles sr ON sr.id = e.squad_role_id
        LEFT JOIN sv.roles r ON sr.role_id = r.id
        LEFT JOIN sv.workspace_roles wr ON sr.workspace_role_id = wr.id
        JOIN sv.personas p ON p.id = e.persona_id
        WHERE e.version_id = $1
        ORDER BY role_label, persona_name, checkpoint_type
        `,
        [version.id]
      );

      console.log("[squad-validation-matrix] Encontradas", entriesResult.rows.length, "entradas");

      return json(200, {
        ok: true,
        version: version,
        entries: entriesResult.rows
      });
    }

    // Handle POST (create new validation matrix version)
    if (event.httpMethod === "POST") {
      console.log("[squad-validation-matrix] Criando nova versão da matriz");

      const body = JSON.parse(event.body || "{}");
      const { squad_id, description, entries } = body;

      if (!squad_id) {
        return json(400, { error: "squad_id é obrigatório" });
      }

      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return json(400, { 
          error: "entries é obrigatório e deve ser um array não vazio" 
        });
      }

      // Verify user has access to squad
      const accessCheck = await query(
        `
        SELECT 1 
        FROM sv.squads s
        JOIN sv.workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = $1 AND wm.user_id = $2
        `,
        [squad_id, userId]
      );

      if (accessCheck.rows.length === 0) {
        console.log("[squad-validation-matrix] Usuário não tem acesso à squad");
        return json(403, { error: "Acesso negado à squad" });
      }

      // Get next version number
      const versionNumberResult = await query(
        `
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM sv.squad_validation_matrix_versions
        WHERE squad_id = $1
        `,
        [squad_id]
      );

      const nextVersion = versionNumberResult.rows[0].next_version;

      // Create new version
      const versionResult = await query(
        `
        INSERT INTO sv.squad_validation_matrix_versions (
          squad_id,
          version,
          description,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [squad_id, nextVersion, description, userId]
      );

      const newVersion = versionResult.rows[0];

      console.log("[squad-validation-matrix] Nova versão criada:", newVersion.id, "v", nextVersion);

      // Validate and insert all entries
      const insertedEntries = [];
      
      for (const entry of entries) {
        const { squad_role_id, persona_id, checkpoint_type, requirement_level } = entry;

        if (!squad_role_id || !persona_id || !checkpoint_type || !requirement_level) {
          return json(400, { 
            error: "Cada entrada deve ter squad_role_id, persona_id, checkpoint_type e requirement_level" 
          });
        }

        // Validate checkpoint_type
        if (!["ISSUE", "DECISION", "PHASE", "MAP"].includes(checkpoint_type)) {
          return json(400, { 
            error: "checkpoint_type deve ser ISSUE, DECISION, PHASE ou MAP" 
          });
        }

        // Validate requirement_level
        if (!["REQUIRED", "OPTIONAL"].includes(requirement_level)) {
          return json(400, { 
            error: "requirement_level deve ser REQUIRED ou OPTIONAL" 
          });
        }

        // Verify squad_role belongs to this squad
        const roleCheck = await query(
          `
          SELECT 1 FROM sv.squad_roles
          WHERE id = $1 AND squad_id = $2
          `,
          [squad_role_id, squad_id]
        );

        if (roleCheck.rows.length === 0) {
          return json(400, { 
            error: `Squad role ${squad_role_id} não pertence à squad` 
          });
        }

        // Verify persona belongs to the same workspace as the squad
        const personaCheck = await query(
          `
          SELECT 1 
          FROM sv.personas p
          JOIN sv.squads s ON s.workspace_id = p.workspace_id
          WHERE p.id = $1 AND s.id = $2
          `,
          [persona_id, squad_id]
        );

        if (personaCheck.rows.length === 0) {
          return json(400, { 
            error: `Persona ${persona_id} não pertence ao workspace da squad` 
          });
        }

        // Insert entry
        const entryResult = await query(
          `
          INSERT INTO sv.squad_validation_matrix_entries (
            version_id,
            squad_role_id,
            persona_id,
            checkpoint_type,
            requirement_level
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [newVersion.id, squad_role_id, persona_id, checkpoint_type, requirement_level]
        );

        insertedEntries.push(entryResult.rows[0]);
      }

      console.log("[squad-validation-matrix] Inseridas", insertedEntries.length, "entradas");

      return json(201, {
        ok: true,
        version: newVersion,
        entries: insertedEntries
      });
    }

    // Method not allowed
    return json(405, { error: "Método não permitido" });

  } catch (error) {
    console.error("[squad-validation-matrix] Erro:", error.message);
    console.error("[squad-validation-matrix] Stack:", error.stack);
    
    // Handle unique constraint violation (duplicate entry)
    if (error.code === '23505') {
      return json(409, { 
        error: "Entrada duplicada: mesma role, persona e checkpoint type" 
      });
    }
    
    return json(500, { error: "Erro ao gerenciar matriz de validação" });
  }
};
