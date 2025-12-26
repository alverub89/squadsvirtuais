// netlify/functions/_lib/jwt.js
const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload) {
  if (!secret) throw new Error("JWT_SECRET ausente");
  return jwt.sign(payload, secret, { expiresIn });
}

module.exports = { signJwt };
