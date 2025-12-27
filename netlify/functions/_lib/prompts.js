// netlify/functions/_lib/prompts.js
const { query } = require("./db");

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

    if (result.rows.length === 0) {
      console.log("[prompts] No active prompt found for:", promptName);
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
    const value = variables[key] || "";
    const regex = new RegExp(`{{${key}}}`, "g");
    rendered = rendered.replace(regex, value);
  });

  // Handle conditional blocks {{#if variable}}...{{/if}}
  // This is a simplified implementation - only handles present/not present
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : "";
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
 * Log prompt execution
 * @param {Object} params - Execution parameters
 */
async function logPromptExecution({
  promptVersionId,
  proposalId = null,
  workspaceId,
  inputTokens,
  outputTokens,
  totalTokens,
  executionTimeMs,
  success = true,
  errorMessage = null,
  userId,
}) {
  try {
    await query(
      `
      INSERT INTO sv.ai_prompt_executions (
        prompt_version_id,
        proposal_id,
        workspace_id,
        input_tokens,
        output_tokens,
        total_tokens,
        execution_time_ms,
        success,
        error_message,
        executed_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        promptVersionId,
        proposalId,
        workspaceId,
        inputTokens,
        outputTokens,
        totalTokens,
        executionTimeMs,
        success,
        errorMessage,
        userId,
      ]
    );

    console.log("[prompts] Execution logged successfully");
  } catch (error) {
    console.error("[prompts] Error logging execution:", error.message);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

module.exports = {
  getActivePrompt,
  renderPrompt,
  logPromptExecution,
};
