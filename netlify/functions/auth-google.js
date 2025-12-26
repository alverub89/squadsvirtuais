// netlify/functions/auth-google.js
const { OAuth2Client } = require("google-auth-library");
const { query } = require("./_lib/db");
const { signJwt } = require("./_lib/jwt");

const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  try {
    console.log("[auth-google] Iniciando autenticação Google");
    
    // Step 1: Validate HTTP method
    if (event.httpMethod !== "POST") {
      console.log("[auth-google] Método não permitido:", event.httpMethod);
      return json(405, { error: "Method Not Allowed" });
    }

    // Step 2: Check environment variables
    if (!googleClientId) {
      console.error("[auth-google] VITE_GOOGLE_CLIENT_ID não configurado");
      return json(500, { error: "VITE_GOOGLE_CLIENT_ID não configurado no backend" });
    }
    console.log("[auth-google] VITE_GOOGLE_CLIENT_ID presente");

    // Step 3: Parse request body
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
      console.log("[auth-google] Body parseado com sucesso");
    } catch (parseError) {
      console.error("[auth-google] Erro ao fazer parse do body:", parseError.message);
      return json(400, { error: "Body JSON inválido" });
    }

    // Step 4: Validate idToken
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== "string") {
      console.error("[auth-google] idToken ausente ou inválido no body");
      return json(400, { error: "idToken é obrigatório" });
    }
    console.log("[auth-google] idToken recebido (length:", idToken.length, "chars)");

    // Step 5: Verify Google token
    let payload;
    try {
      const client = new OAuth2Client(googleClientId);
      console.log("[auth-google] Verificando token Google...");
      const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
      payload = ticket.getPayload();
      
      if (!payload) {
        console.error("[auth-google] Payload vazio após verificação");
        return json(401, { error: "Token inválido" });
      }
      console.log("[auth-google] ✓ validated_token - Token Google verificado com sucesso");
    } catch (verifyError) {
      console.error("[auth-google] Erro ao verificar token Google:", verifyError.message);
      return json(401, { error: "Falha ao verificar token Google" });
    }

    // Step 6: Extract user data
    const provider = "google";
    const providerUserId = payload.sub;
    const email = payload.email;
    const name = payload.name || email || "";
    const avatarUrl = payload.picture || "";

    if (!email) {
      console.error("[auth-google] Email ausente no payload do token");
      return json(401, { error: "Email ausente no token" });
    }
    console.log("[auth-google] Dados do usuário extraídos com sucesso");

    const now = new Date().toISOString();

    // Step 7: Upsert user in database
    let user;
    try {
      console.log("[auth-google] Fazendo upsert em sv.users...");
      const userRes = await query(
        `
        INSERT INTO sv.users (name, email, avatar_url, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = COALESCE(EXCLUDED.avatar_url, sv.users.avatar_url),
          updated_at = EXCLUDED.updated_at
        RETURNING id, name, email, avatar_url
        `,
        [name, email, avatarUrl, now]
      );

      if (!userRes.rows || userRes.rows.length === 0) {
        console.error("[auth-google] Nenhum usuário retornado após upsert");
        return json(500, { error: "Erro ao criar/atualizar usuário" });
      }

      user = userRes.rows[0];
      console.log("[auth-google] ✓ upsert_user_ok - Usuário criado/atualizado com sucesso, user_id:", user.id);
    } catch (dbError) {
      console.error("[auth-google] Erro no upsert de sv.users:", dbError.message);
      console.error("[auth-google] Stack:", dbError.stack);
      const errorCode = dbError.code || 'unknown';
      const constraintName = dbError.constraint || 'none';
      return json(500, { 
        error: "Erro ao salvar usuário no banco de dados",
        code: errorCode,
        constraint: constraintName
      });
    }

    // Step 8: Upsert user identity
    try {
      console.log("[auth-google] → upsert_identity_attempt - user_id:", user.id, "provider:", provider);
      await query(
        `
        INSERT INTO sv.user_identities (user_id, provider, provider_user_id, email, name, avatar_url, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (provider, provider_user_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = EXCLUDED.updated_at
        `,
        [user.id, provider, providerUserId, email, name, avatarUrl, now]
      );
      console.log("[auth-google] ✓ upsert_identity_ok - Identidade criada/atualizada com sucesso");
    } catch (identityError) {
      console.error("[auth-google] Erro no upsert de sv.user_identities:", identityError.message);
      console.error("[auth-google] Stack:", identityError.stack);
      const errorCode = identityError.code || 'unknown';
      const constraintName = identityError.constraint || 'none';
      const errorDetail = identityError.detail || 'no details';
      return json(500, { 
        error: "Erro ao salvar identidade do usuário",
        code: errorCode,
        constraint: constraintName,
        detail: errorDetail
      });
    }

    // Step 9: Generate JWT
    let token;
    try {
      console.log("[auth-google] Gerando JWT...");
      token = signJwt({ userId: user.id, email: user.email, name: user.name });
      console.log("[auth-google] JWT gerado com sucesso");
    } catch (jwtError) {
      console.error("[auth-google] Erro ao gerar JWT:", jwtError.message);
      return json(500, { error: "Erro ao gerar token de autenticação" });
    }

    // Step 10: Success response
    console.log("[auth-google] Autenticação concluída com sucesso");
    return json(200, {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url },
    });
  } catch (unexpectedError) {
    // Catch any unexpected errors that weren't handled above
    console.error("[auth-google] Erro inesperado:", unexpectedError.message);
    console.error("[auth-google] Stack:", unexpectedError.stack);
    return json(500, { error: "Erro interno no login" });
  }
};
