// netlify/functions/_lib/jwt.js
const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload) {
  if (!secret) {
    console.error("[jwt] JWT_SECRET não configurado");
    throw new Error("JWT_SECRET ausente");
  }
  
  if (!payload || typeof payload !== 'object') {
    console.error("[jwt] Payload inválido para JWT");
    throw new Error("Payload inválido");
  }
  
  try {
    console.log("[jwt] Gerando JWT para usuário");
    const token = jwt.sign(payload, secret, { expiresIn });
    return token;
  } catch (error) {
    console.error("[jwt] Erro ao assinar JWT:", error.message);
    throw error;
  }
}

function verifyJwt(token) {
  if (!secret) {
    console.error("[jwt] JWT_SECRET não configurado");
    throw new Error("JWT_SECRET ausente");
  }
  
  if (!token) {
    throw new Error("Token ausente");
  }
  
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error("[jwt] Erro ao verificar JWT:", error.message);
    throw error;
  }
}

module.exports = { signJwt, verifyJwt };
