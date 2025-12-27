// netlify/functions/_lib/openai.js
const OpenAI = require("openai");

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("[openai] OPENAI_API_KEY não configurado");
  throw new Error("OPENAI_API_KEY não configurado");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call OpenAI API with given prompt and parameters
 * @param {Object} params - Parameters for the API call
 * @param {string} params.systemInstructions - System instructions for the AI
 * @param {string} params.userPrompt - User prompt/question
 * @param {string} params.model - Model to use (default: gpt-4)
 * @param {number} params.temperature - Temperature (default: 0.7)
 * @param {boolean} params.jsonMode - Whether to request JSON response (default: true)
 * @returns {Promise<Object>} Response with content, usage stats, and execution time
 */
async function callOpenAI({
  systemInstructions,
  userPrompt,
  model = "gpt-4",
  temperature = 0.7,
  jsonMode = true,
}) {
  const startTime = Date.now();

  try {
    console.log("[openai] Calling OpenAI API with model:", model);

    const messages = [
      { role: "system", content: systemInstructions },
      { role: "user", content: userPrompt },
    ];

    const requestParams = {
      model,
      messages,
      temperature,
    };

    // Request JSON response format if enabled
    if (jsonMode) {
      requestParams.response_format = { type: "json_object" };
    }

    const completion = await openai.chat.completions.create(requestParams);

    const executionTimeMs = Date.now() - startTime;

    console.log("[openai] API call successful. Execution time:", executionTimeMs, "ms");

    const response = {
      content: completion.choices[0].message.content,
      finishReason: completion.choices[0].finish_reason,
      usage: {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      },
      executionTimeMs,
      model: completion.model,
    };

    return response;
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    console.error("[openai] Error calling OpenAI:", error.message);
    console.error("[openai] Error type:", error.type);
    console.error("[openai] Error code:", error.code);

    throw {
      message: error.message,
      type: error.type,
      code: error.code,
      executionTimeMs,
    };
  }
}

module.exports = { callOpenAI };
