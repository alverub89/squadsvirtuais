// netlify/functions/me.js
const jwt = require("jsonwebtoken");
const { query } = require("./_lib/db");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  try {
    const auth = event.headers?.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return json(401, { error: "Token ausente" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return json(500, { error: "JWT_SECRET não configurado" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return json(401, { error: "Token inválido" });
    }

    const { rows } = await query(
      `
      SELECT id, name, email, avatar_url, last_login_at
      FROM sv.users
      WHERE id = $1
      `,
      [decoded.userId]
    );

    if (!rows[0]) {
      return json(404, { error: "Usuário não encontrado" });
    }

    return json(200, { user: rows[0] });
  } catch {
    return json(500, { error: "Erro interno" });
  }
};
