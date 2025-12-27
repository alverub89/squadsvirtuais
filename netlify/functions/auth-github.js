// netlify/functions/auth-github.js
const { query } = require("./_lib/db");
const { signJwt } = require("./_lib/jwt");

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRETS_OAUTH;
const frontendUrl = process.env.FRONTEND_URL || "https://squadsvirtuais.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function redirect(location) {
  return {
    statusCode: 302,
    headers: { Location: location },
    body: "",
  };
}

exports.handler = async (event) => {
  try {
    const { httpMethod, queryStringParameters } = event;

    // Step 1: Redirect to GitHub OAuth
    if (httpMethod === "GET" && !queryStringParameters?.code) {
      if (!githubClientId) {
        return redirect(`${frontendUrl}?error=github_config_error`);
      }

      const redirectUri = `${frontendUrl}/.netlify/functions/auth-github`;
      const scope = "read:user user:email";
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

      return redirect(githubAuthUrl);
    }

    // Step 2: Handle callback with code
    if (httpMethod === "GET" && queryStringParameters?.code) {
      if (!githubClientId || !githubClientSecret) {
        return redirect(`${frontendUrl}?error=github_config_error`);
      }

      const code = queryStringParameters.code;

      // Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return redirect(`${frontendUrl}?error=github_auth_failed`);
      }

      const accessToken = tokenData.access_token;

      // Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const githubUser = await userResponse.json();

      // Get primary email if not public
      let email = githubUser.email;
      if (!email) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }

      if (!email) {
        return redirect(`${frontendUrl}?error=github_email_missing`);
      }

      const provider = "github";
      const providerUserId = String(githubUser.id);
      const name = githubUser.name || githubUser.login || email;
      const avatarUrl = githubUser.avatar_url || "";

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

      // 3) JWT do app
      const token = signJwt({ userId: user.id, email: user.email, name: user.name });

      // Redirect to frontend with token
      return redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (e) {
    console.error("Erro no auth-github:", e);
    return redirect(`${frontendUrl}?error=internal_error`);
  }
};
