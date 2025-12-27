// netlify/functions/_lib/github-api.js
// Helper functions for GitHub API interactions

/**
 * Fetch user information from GitHub
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} GitHub user data
 */
async function getGithubUser(accessToken) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch user's primary email from GitHub
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<string|null>} Primary email or null
 */
async function getGithubUserEmail(accessToken) {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const emails = await response.json();
  const primaryEmail = emails.find((e) => e.primary);
  return primaryEmail?.email || emails[0]?.email || null;
}

/**
 * List repositories accessible to the authenticated user
 * @param {string} accessToken - GitHub access token
 * @param {Object} options - Query options
 * @param {string} options.visibility - Repository visibility (all, public, private)
 * @param {string} options.sort - Sort order (created, updated, pushed, full_name)
 * @param {number} options.per_page - Results per page (max 100)
 * @param {number} options.page - Page number
 * @returns {Promise<Array>} List of repositories
 */
async function listRepositories(accessToken, options = {}) {
  const {
    visibility = "all",
    sort = "updated",
    per_page = 100,
    page = 1,
  } = options;

  const params = new URLSearchParams({
    visibility,
    sort,
    per_page: String(per_page),
    page: String(page),
  });

  const response = await fetch(`https://api.github.com/user/repos?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get detailed information about a specific repository
 * @param {string} accessToken - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository data
 */
async function getRepository(accessToken, owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from GitHub OAuth callback
 * @param {string} clientId - GitHub OAuth client ID
 * @param {string} clientSecret - GitHub OAuth client secret
 * @returns {Promise<string>} Access token
 */
async function exchangeCodeForToken(code, clientId, clientSecret) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(data.error_description || "Failed to get access token");
  }

  return data.access_token;
}

module.exports = {
  getGithubUser,
  getGithubUserEmail,
  listRepositories,
  getRepository,
  exchangeCodeForToken,
};
