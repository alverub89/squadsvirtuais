// netlify/functions/_lib/response.js
// Helper functions for HTTP responses

/**
 * Create a JSON response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} Netlify function response
 */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create a redirect response
 * @param {string} location - Redirect URL
 * @returns {Object} Netlify function response
 */
function redirect(location) {
  return {
    statusCode: 302,
    headers: { Location: location },
    body: "",
  };
}

/**
 * Handle CORS preflight requests
 * @returns {Object} Netlify function response
 */
function corsResponse() {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: "",
  };
}

module.exports = {
  json,
  redirect,
  corsResponse,
};
