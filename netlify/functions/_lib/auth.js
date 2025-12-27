// netlify/functions/_lib/auth.js
// Authentication helpers

const { verifyJwt } = require('./jwt');

/**
 * Extract and verify JWT from Authorization header
 * @param {Object} event - Netlify function event
 * @returns {Object} Decoded JWT payload with userId
 * @throws {Error} If token is missing or invalid
 */
function authenticateRequest(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || "";
  
  if (!auth) {
    throw new Error("Authorization header missing");
  }
  
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  
  if (!token) {
    throw new Error("Token missing");
  }
  
  try {
    const decoded = verifyJwt(token);
    
    if (!decoded.userId) {
      throw new Error("Invalid token payload");
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

module.exports = {
  authenticateRequest,
};
