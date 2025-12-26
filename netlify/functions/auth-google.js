// netlify/functions/auth-google.js
const { OAuth2Client } = require("google-auth-library");
const { query } = require("./_lib/db");
const { signJwt } = require("./_lib/jwt");

const googleClientId =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID?.trim();

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
    if (!googleClientId) return json(500, { error: "GOOGLE_CLIENT_ID ausente no backend" });

    const body = event.body ? JSON.parse(event.body) : {};
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== "string") return json(400, { error: "idToken é obrigatório" });

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload) return json(401, { error: "Token inválido" });

    const provider = "google";
    const providerUserId = payload.sub;
    const email = payload.email;
    const name = payload.name || email || "";
    const avatarUrl = payload.picture || "";

    if (!email) return json(401, { error: "Email ausente no token" });

    const now = new Date().toISOString();

    // 1) upsert user por email
    const userRes = await query(
      `
      INSERT INTO sv.users (name, email, avatar_url, last_login_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, sv.users.avatar_url),
        last_login_at = EXCLUDED.last_login_at
      RETURNING id, name, email, avatar_url
      `,
      [name, email, avatarUrl, now]
    );

    const user = userRes.rows[0];

    // 2) upsert identity por (provider, provider_user_id)
    await query(
      `
      INSERT INTO sv.user_identities (user_id, provider, provider_user_id, provider_email, raw_profile, last_login_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      ON CONFLICT (provider, provider_user_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        provider_email = EXCLUDED.provider_email,
        raw_profile = EXCLUDED.raw_profile,
        last_login_at = EXCLUDED.last_login_at
      `,
      [user.id, provider, providerUserId, email, JSON.stringify(payload), now]
    );

    // 3) JWT do app
    const token = signJwt({ userId: user.id, email: user.email, name: user.name });

    return json(200, {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url },
    });
  } catch (e) {
    return json(500, { error: "Erro interno no login" });
  }
};
