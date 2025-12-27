# GitHub Integration API Documentation

## Overview

This document describes the API endpoints for GitHub integration (OAuth + repository connections).

## Base URL

- Production: `https://squadsvirtuais.com/.netlify/functions`
- Development: `http://localhost:8888/.netlify/functions` (Netlify Dev)

---

## Endpoints

### 1. POST /auth-github-start

Initiate GitHub OAuth flow for workspace connection.

#### Request

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "workspace_id": "uuid"
}
```

**Parameters:**
- `workspace_id` (string, required): UUID of the workspace to connect

#### Response

**Success (200 OK):**
```json
{
  "ok": true,
  "authorization_url": "https://github.com/login/oauth/authorize?..."
}
```

**Errors:**
- `400 Bad Request`: Missing or invalid workspace_id
- `500 Internal Server Error`: Server configuration error

#### Usage Example

```javascript
const response = await fetch('/.netlify/functions/auth-github-start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workspace_id: 'abc-123-def-456' })
});

const data = await response.json();
// Redirect user to data.authorization_url
window.location.href = data.authorization_url;
```

---

### 2. GET /auth-github-callback

Handle GitHub OAuth callback (internal use, called by GitHub).

#### Request

**Method:** `GET`

**Query Parameters:**
- `code` (string, required): Authorization code from GitHub
- `state` (string, required): Base64-encoded JSON with workspace_id

#### Response

**Success:** Redirects to frontend with success parameter
```
https://squadsvirtuais.com?github_connected=true&workspace_id=abc-123
```

**Error:** Redirects to frontend with error parameter
```
https://squadsvirtuais.com?error=github_oauth_error
```

**Possible Error Codes:**
- `github_oauth_error`: OAuth authorization denied
- `github_code_missing`: Authorization code not provided
- `github_state_missing`: State parameter missing
- `github_invalid_state`: State parameter invalid or tampered
- `github_config_error`: Server OAuth configuration error
- `github_token_exchange_failed`: Failed to exchange code for token
- `github_user_fetch_failed`: Failed to fetch user data from GitHub
- `github_db_error`: Database error while persisting connection
- `github_internal_error`: Unexpected server error

#### Notes

- This endpoint is called automatically by GitHub after user authorization
- Frontend should handle the redirect and display appropriate message
- Connection is persisted in `sv.github_connections` table

---

### 3. GET /github-repos

List GitHub repositories accessible to the workspace.

#### Request

**Method:** `GET`

**Query Parameters:**
- `workspace_id` (string, required): UUID of the workspace

#### Response

**Success (200 OK):**
```json
{
  "ok": true,
  "workspace_id": "abc-123-def-456",
  "github_login": "username",
  "repositories": [
    {
      "id": 123456789,
      "name": "repo-name",
      "full_name": "owner/repo-name",
      "owner": {
        "login": "owner",
        "avatar_url": "https://avatars.githubusercontent.com/..."
      },
      "private": false,
      "description": "Repository description",
      "html_url": "https://github.com/owner/repo-name",
      "default_branch": "main",
      "permissions": {
        "admin": true,
        "push": true,
        "pull": true
      },
      "updated_at": "2025-12-27T00:00:00Z",
      "language": "JavaScript"
    }
  ],
  "total": 42
}
```

**Errors:**
- `400 Bad Request`: Missing workspace_id
- `404 Not Found`: Workspace does not have active GitHub connection
- `401 Unauthorized`: GitHub token expired or revoked (requires reconnection)
- `500 Internal Server Error`: Database or API error

#### Usage Example

```javascript
const response = await fetch(
  `/.netlify/functions/github-repos?workspace_id=abc-123-def-456`
);

const data = await response.json();
console.log(`Found ${data.total} repositories`);
```

---

### 4. POST /github-repos-connect

Connect a GitHub repository to a workspace.

#### Request

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "workspace_id": "uuid",
  "repo_full_name": "owner/repo"
}
```

**Parameters:**
- `workspace_id` (string, required): UUID of the workspace
- `repo_full_name` (string, required): Full repository name in "owner/repo" format

#### Response

**Success (200 OK):**
```json
{
  "ok": true,
  "message": "Repositório conectado com sucesso",
  "connection": {
    "id": "connection-uuid",
    "workspace_id": "workspace-uuid",
    "repo_full_name": "owner/repo",
    "default_branch": "main",
    "permissions_level": "admin",
    "connected_at": "2025-12-27T00:00:00Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: 
  - Workspace does not have GitHub connection
  - Repository not found or no access
- `401 Unauthorized`: GitHub token expired or revoked
- `409 Conflict`: Repository already connected to workspace
- `500 Internal Server Error`: Database or API error

#### Usage Example

```javascript
const response = await fetch('/.netlify/functions/github-repos-connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspace_id: 'abc-123-def-456',
    repo_full_name: 'facebook/react'
  })
});

const data = await response.json();
if (data.ok) {
  console.log('Repository connected:', data.connection);
}
```

---

## OAuth Flow

### Complete Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. POST /auth-github-start
       │    { workspace_id: "..." }
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Returns authorization_url
       ▼
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 3. Redirects user to GitHub
       ▼
┌─────────────┐
│   GitHub    │ User authorizes app
└──────┬──────┘
       │ 4. Redirects to callback with code
       ▼
┌─────────────┐
│   Backend   │ /auth-github-callback
│             │ - Exchange code for token
│             │ - Fetch user data
│             │ - Persist github_connections
└──────┬──────┘
       │ 5. Redirects to frontend with success
       ▼
┌─────────────┐
│   Frontend  │ Shows success message
└─────────────┘
```

### State Parameter

The OAuth flow uses the `state` parameter to maintain workspace context:

1. Frontend sends `workspace_id` to `/auth-github-start`
2. Backend encodes `workspace_id` in `state` parameter (base64 JSON)
3. GitHub includes `state` in callback
4. Backend decodes `state` to retrieve `workspace_id`
5. Connection is stored with correct `workspace_id`

---

## Security Considerations

### Access Tokens

- GitHub access tokens are stored in `sv.github_connections`
- **NEVER** exposed to frontend
- Used only for backend API calls
- Should be treated as highly sensitive data
- Consider encryption at rest (not implemented in this version)

### CORS

All endpoints include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

### Error Messages

- Error messages are user-friendly but not overly detailed
- Sensitive information (tokens, internal errors) logged server-side only
- Stack traces never exposed to client

---

## Environment Variables Required

### Backend (Netlify Functions)

**Required:**
- `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret
- `DATABASE_URL`: PostgreSQL connection string

**Optional:**
- `FRONTEND_URL`: Frontend URL (default: https://squadsvirtuais.com)

### Frontend

**None required** - All GitHub OAuth is handled server-side

---

## Rate Limits

### GitHub API

- Authenticated requests: 5,000 requests/hour per user
- If rate limit exceeded, GitHub returns 403 with `X-RateLimit-Remaining: 0`
- Backend should handle gracefully and inform user

### Netlify Functions

- Free tier: 125,000 requests/month
- Execution time: 10 seconds max per request
- Background functions: 26 seconds max (not used here)

---

## Error Handling

### Token Expiration

GitHub tokens do not expire by default, but can be revoked by user.

**Detection:**
- GitHub API returns 401 Unauthorized
- Error message: "Bad credentials"

**Handling:**
1. Backend detects 401 from GitHub API
2. Returns 401 to frontend with message "Token GitHub expirado ou revogado"
3. Frontend prompts user to reconnect GitHub account
4. User goes through OAuth flow again
5. New token replaces old token in database

### Repository Not Found

**Scenarios:**
- Repository deleted on GitHub
- User no longer has access
- Repository is private and token lacks scope

**Handling:**
1. GitHub API returns 404 Not Found
2. Backend returns 404 to frontend
3. Frontend shows appropriate message

---

## Testing

### Manual Testing Checklist

- [ ] Start OAuth flow with valid workspace_id
- [ ] Complete OAuth authorization on GitHub
- [ ] Verify connection persisted in database
- [ ] List repositories for connected workspace
- [ ] Connect repository to workspace
- [ ] Attempt to connect same repository again (should succeed with update)
- [ ] Try to list repos without GitHub connection (should fail)
- [ ] Try to connect repo without GitHub connection (should fail)
- [ ] Revoke GitHub access and verify 401 handling

### Test Workspace Setup

```sql
-- Create test workspace (adjust based on actual schema)
INSERT INTO sv.workspaces (id, name) 
VALUES ('test-workspace-uuid', 'Test Workspace');
```

---

## Future Enhancements (Out of Scope)

This implementation does NOT include:

- [ ] Automatic issue creation in GitHub
- [ ] Continuous repository synchronization
- [ ] Webhooks for GitHub events
- [ ] Token encryption at rest
- [ ] Token refresh mechanism
- [ ] Multiple GitHub accounts per workspace
- [ ] Repository disconnection endpoint
- [ ] List connected repositories for workspace

These features may be implemented in future issues.

---

**Version**: 1.0  
**Date**: 2025-12-27  
**Author**: Backend Team
