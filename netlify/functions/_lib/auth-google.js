import { OAuth2Client } from "google-auth-library";
import { getPool } from "./_lib/db.js";
import { signSessionJwt } from "./_lib/jwt.js";

const client = new OAuth2Client();

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id_token } = await req.json();
    if (!id_token) {
      return new Response(JSON.stringify({ error: "Missing id_token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    if (!expectedAud) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_CLIENT_ID env var" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: expectedAud,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid Google token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider = "google";
    const providerUserId = payload.sub;
    const email = payload.email || null;
    const name = payload.name || null;
    const avatarUrl = payload.picture || null;

    const pool = getPool();
    const cx = await pool.connect();

    try {
      await cx.query("begin");

      // 1) upsert identity -> garante 1 identidade por (provider, provider_user_id)
      const upsertIdentity = await cx.query(
        `
        insert into sv.user_identities (provider, provider_user_id, provider_email, raw_profile, last_login_at)
        values ($1, $2, $3, $4, now())
        on conflict (provider, provider_user_id)
        do update set
          provider_email = excluded.provider_email,
          raw_profile = excluded.raw_profile,
          last_login_at = now()
        returning user_id
        `,
        [provider, providerUserId, email, payload]
      );

      let userId = upsertIdentity.rows[0]?.user_id;

      // 2) se a identity ainda não está ligada a um user, cria user e conecta
      if (!userId) {
        const created = await cx.query(
          `
          insert into sv.users (name, email, avatar_url, last_login_at)
          values ($1, $2, $3, now())
          returning id
          `,
          [name, email, avatarUrl]
        );
        userId = created.rows[0].id;

        await cx.query(
          `
          update sv.user_identities
          set user_id = $1
          where provider = $2 and provider_user_id = $3
          `,
          [userId, provider, providerUserId]
        );
      } else {
        // 3) mantém user “atualizado”
        await cx.query(
          `
          update sv.users
          set name = coalesce($2, name),
              email = coalesce($3, email),
              avatar_url = coalesce($4, avatar_url),
              last_login_at = now()
          where id = $1
          `,
          [userId, name, email, avatarUrl]
        );
      }

      const userRow = await cx.query(
        `select id, name, email, avatar_url, role, created_at, last_login_at
         from sv.users where id = $1`,
        [userId]
      );

      await cx.query("commit");

      const user = userRow.rows[0];

      const token = signSessionJwt({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      return new Response(JSON.stringify({ token, user }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      await cx.query("rollback");
      return new Response(JSON.stringify({ error: "Auth failed", details: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      cx.release();
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request", details: String(e) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
