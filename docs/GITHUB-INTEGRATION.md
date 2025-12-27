# GitHub Integration

This directory contains the implementation of GitHub OAuth integration and repository connection features for Squads Virtuais.

## Overview

The GitHub integration allows workspaces to:
1. Connect a GitHub account via OAuth
2. List accessible GitHub repositories
3. Connect repositories to the workspace for future integrations

## Architecture

### Components

```
netlify/functions/
├── _lib/
│   ├── github-api.js      # GitHub API client
│   ├── auth.js            # Authentication helpers
│   └── response.js        # HTTP response helpers
├── auth-github-start.js      # Initiate OAuth flow
├── auth-github-callback.js   # Handle OAuth callback
├── github-repos.js           # List repositories
└── github-repos-connect.js   # Connect repository to workspace
```

### Database Tables

- **sv.github_connections**: Stores GitHub OAuth connections per workspace
- **sv.repo_connections**: Stores connected repositories per workspace

See [data contracts](./data-contracts/) for detailed table specifications.

## API Endpoints

### 1. POST /auth-github-start
Initiate GitHub OAuth flow for a workspace.

**Request:**
```json
{
  "workspace_id": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "authorization_url": "https://github.com/login/oauth/authorize?..."
}
```

### 2. GET /auth-github-callback
Internal endpoint called by GitHub after authorization.

Redirects to frontend with success or error parameters.

### 3. GET /github-repos?workspace_id=uuid
List GitHub repositories accessible to the workspace.

**Response:**
```json
{
  "ok": true,
  "workspace_id": "uuid",
  "github_login": "username",
  "repositories": [...],
  "total": 42
}
```

### 4. POST /github-repos-connect
Connect a repository to a workspace.

**Request:**
```json
{
  "workspace_id": "uuid",
  "repo_full_name": "owner/repo"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Repositório conectado com sucesso",
  "connection": {...}
}
```

## OAuth Flow

1. Frontend calls `/auth-github-start` with `workspace_id`
2. Backend returns GitHub authorization URL
3. User is redirected to GitHub for authorization
4. GitHub redirects back to `/auth-github-callback`
5. Backend exchanges code for access token
6. Connection is persisted in `sv.github_connections`
7. User is redirected to frontend with success message

## Environment Variables

Required:
- `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRETS_OAUTH`: GitHub OAuth App Client Secret
- `FRONTEND_URL`: Frontend URL for redirects (default: https://squadsvirtuais.com)
- `DATABASE_URL`: PostgreSQL connection string

## Security

- Access tokens are stored in the database and NEVER exposed to the frontend
- All OAuth is handled server-side
- Tokens should be treated as highly sensitive data
- Consider encryption at rest for production (not implemented in this version)

## Error Handling

### Token Expiration
- GitHub tokens don't expire by default but can be revoked
- If token is revoked, API returns 401
- User must reconnect GitHub account

### Repository Not Found
- If repository is deleted or access revoked, API returns 404
- User should be notified to update connection

## Testing

### Manual Testing Steps

1. **Test OAuth Flow:**
   ```bash
   curl -X POST https://squadsvirtuais.com/.netlify/functions/auth-github-start \
     -H "Content-Type: application/json" \
     -d '{"workspace_id":"test-workspace-uuid"}'
   ```

2. **Test Repository Listing:**
   ```bash
   curl https://squadsvirtuais.com/.netlify/functions/github-repos?workspace_id=test-workspace-uuid
   ```

3. **Test Repository Connection:**
   ```bash
   curl -X POST https://squadsvirtuais.com/.netlify/functions/github-repos-connect \
     -H "Content-Type: application/json" \
     -d '{"workspace_id":"test-workspace-uuid","repo_full_name":"owner/repo"}'
   ```

## Future Enhancements

This implementation is intentionally minimal. Future features may include:

- [ ] Automatic issue creation in GitHub
- [ ] Continuous repository synchronization
- [ ] Webhooks for GitHub events
- [ ] Token encryption at rest
- [ ] Token refresh mechanism
- [ ] Repository disconnection
- [ ] List connected repositories endpoint
- [ ] Multiple GitHub accounts per workspace

## Documentation

- [API Documentation](./github-integration-api.md)
- [GitHub Connections Data Contract](./data-contracts/github-connections.md)
- [Repo Connections Data Contract](./data-contracts/repo-connections.md)
- [Environment Variables](./environment-variables.md)

## Support

For issues or questions about the GitHub integration:
1. Check the [API Documentation](./github-integration-api.md)
2. Review the error messages in Netlify Functions logs
3. Verify environment variables are correctly configured
4. Ensure database tables exist with correct schema

---

**Version**: 1.0  
**Last Updated**: 2025-12-27
