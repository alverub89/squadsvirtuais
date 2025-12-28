// netlify/functions/_lib/prompts.js
const { query } = require("./db");

// Cache for table columns (per cold start)
let cachedColumns = null;

/**
 * Helper function to check if a value should be considered "present" in template conditionals
 * @param {*} value - Value to check
 * @returns {boolean} True if value is present (not null, undefined, empty string, or false)
 */
function isPresent(value) {
  return value != null && value !== "" && value !== false;
}

/**
 * Get active prompt version for a given prompt name
 * @param {string} promptName - Name of the prompt
 * @returns {Promise<Object|null>} Active prompt version or null if not found
 */
async function getActivePrompt(promptName) {
  try {
    console.log("[prompts] Getting active prompt:", promptName);

    const result = await query(
      `
      SELECT 
        pv.id,
        pv.prompt_id,
        pv.version,
        pv.prompt_text,
        pv.system_instructions,
        pv.model_name,
        pv.temperature,
        p.name as prompt_name,
        p.category
      FROM sv.ai_prompt_versions pv
      JOIN sv.ai_prompts p ON p.id = pv.prompt_id
      WHERE p.name = $1 AND pv.is_active = true
      LIMIT 1
      `,
      [promptName]
    );

    console.log("[prompts] Query executed OK, rows returned:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("[prompts] No active prompt found for:", promptName);
      
      // Additional diagnostic: check if prompt exists but no active version
      const checkPrompt = await query(
        `SELECT id, name FROM sv.ai_prompts WHERE name = $1`,
        [promptName]
      );
      
      if (checkPrompt.rows.length > 0) {
        console.warn("[prompts] Prompt exists but no active version found!");
        const versions = await query(
          `SELECT version, is_active FROM sv.ai_prompt_versions WHERE prompt_id = $1`,
          [checkPrompt.rows[0].id]
        );
        console.warn("[prompts] Existing versions:", JSON.stringify(versions.rows));
      } else {
        console.warn("[prompts] Prompt does not exist in database!");
      }
      
      return null;
    }

    console.log("[prompts] Found active prompt version:", result.rows[0].version);
    return result.rows[0];
  } catch (error) {
    console.error("[prompts] Error getting active prompt:", error.message);
    throw error;
  }
}

/**
 * Replace template variables in prompt text
 * Supports simple {{variable}} syntax
 * @param {string} template - Template string with {{variables}}
 * @param {Object} variables - Object with variable values
 * @returns {string} Rendered prompt
 */
function renderPrompt(template, variables) {
  let rendered = template;

  // Replace simple variables {{variable}}
  Object.keys(variables).forEach((key) => {
    // Use empty string for null/undefined values, convert all other values to string
    const value = variables[key] != null ? String(variables[key]) : "";
    const regex = new RegExp(`{{${key}}}`, "g");
    rendered = rendered.replace(regex, value);
  });

  // Handle conditional blocks {{#if variable}}...{{/if}}
  // This is a simplified implementation - only handles present/not present
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return isPresent(variables[varName]) ? content : "";
  });

  // Check for any remaining unresolved variables and log warning
  const unresolvedMatches = rendered.match(/{{[^}]+}}/g);
  if (unresolvedMatches && unresolvedMatches.length > 0) {
    console.warn("[prompts] Unresolved template variables:", unresolvedMatches.join(", "));
  }

  // Remove any remaining unresolved variables
  rendered = rendered.replace(/{{[^}]+}}/g, "");

  return rendered.trim();
}

/**
 * Detect available columns in sv.ai_prompt_executions table
 * Cached per cold start to avoid repeated queries
 * @returns {Promise<Set<string>>} Set of available column names
 */
async function detectAvailableColumns() {
  if (cachedColumns !== null) {
    return cachedColumns;
  }

  try {
    console.log("[prompts] Detecting available columns in sv.ai_prompt_executions");
    
    const result = await query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'sv' AND table_name = 'ai_prompt_executions'
      `,
      []
    );

    cachedColumns = new Set(result.rows.map(row => row.column_name));
    console.log("[prompts] Available columns:", Array.from(cachedColumns).join(", "));
    
    return cachedColumns;
  } catch (error) {
    console.error("[prompts] Error detecting columns:", error.message);
    // Return empty set as fallback
    cachedColumns = new Set();
    return cachedColumns;
  }
}

/**
 * Log prompt execution with schema-aware dynamic INSERT
 * @param {Object} params - Execution parameters
 */
async function logPromptExecution({
  promptVersionId,
  proposalId = null,
  workspaceId, // Kept for backward compatibility
  inputTokens,
  outputTokens,
  totalTokens,
  executionTimeMs,
  success = true,
  errorMessage = null,
  userId,
}) {
  try {
    // Detect available columns
    const availableColumns = await detectAvailableColumns();

    if (availableColumns.size === 0) {
      console.warn("[prompts] ai_prompt_executions table not found or no columns detected, skipping log");
      return;
    }

    // Map of candidate fields to their values
    const candidateFields = {
      prompt_version_id: promptVersionId,
      proposal_id: proposalId,
      workspace_id: workspaceId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      execution_time_ms: executionTimeMs,
      success: success,
      error_message: errorMessage,
      executed_by_user_id: userId,
    };

    // Filter to only include fields that exist in the table
    const fieldsToInsert = {};
    Object.keys(candidateFields).forEach(field => {
      if (availableColumns.has(field)) {
        fieldsToInsert[field] = candidateFields[field];
      }
    });

    // Check if we have at least prompt_version_id (minimum required field)
    if (!fieldsToInsert.prompt_version_id) {
      console.warn("[prompts] ai_prompt_executions schema incompatible (no prompt_version_id column), skipping log");
      return;
    }

    // Build dynamic INSERT
    const columnNames = Object.keys(fieldsToInsert);
    const values = Object.values(fieldsToInsert);
    const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(", ");

    const insertQuery = `
      INSERT INTO sv.ai_prompt_executions (${columnNames.join(", ")})
      VALUES (${placeholders})
    `;

    await query(insertQuery, values);

    console.log("[prompts] Execution logged successfully with columns:", columnNames.join(", "));
  } catch (error) {
    console.error("[prompts] Error logging execution:", error.message);
    console.error("[prompts] Error code:", error.code);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

module.exports = {
  getActivePrompt,
  renderPrompt,
  logPromptExecution,
};
