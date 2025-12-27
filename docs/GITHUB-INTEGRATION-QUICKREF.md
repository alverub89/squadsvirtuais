# GitHub Integration - Quick Reference

## Endpoints

### 1. Start OAuth
```bash
POST /.netlify/functions/auth-github-start
Content-Type: application/json

{
  "workspace_id": "uuid"
}

→ Returns authorization URL
→ Redirect user to this URL
```

### 2. List Repositories
```bash
GET /.netlify/functions/github-repos?workspace_id=uuid

→ Returns list of accessible repositories
```

### 3. Connect Repository
```bash
POST /.netlify/functions/github-repos-connect
Content-Type: application/json

{
  "workspace_id": "uuid",
  "repo_full_name": "owner/repo"
}

→ Connects repository to workspace
```

## Environment Variables

```bash
GITHUB_CLIENT_ID=Iv1.abc123def456789
GITHUB_CLIENT_SECRETS_OAUTH=secret123...
FRONTEND_URL=https://squadsvirtuais.com
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

## Database Tables

### sv.github_connections
- `workspace_id` + `provider_user_id` → UNIQUE
- Stores OAuth access token (sensitive!)
- Upsert on reconnection

### sv.repo_connections
- `workspace_id` + `repo_full_name` → UNIQUE
- Stores repository metadata
- Upsert on reconnection

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Check parameters |
| 401 | Token expired | Reconnect GitHub |
| 404 | Not found | Check workspace/repo |
| 409 | Already exists | Already connected |
| 500 | Server error | Check logs |

## Frontend Integration Example

```javascript
// 1. Start OAuth
async function connectGitHub(workspaceId) {
  const res = await fetch('/.netlify/functions/auth-github-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId })
  });
  
  const data = await res.json();
  
  // Redirect to GitHub
  window.location.href = data.authorization_url;
}

// 2. Handle callback (GitHub redirects back)
// Check URL parameters: ?github_connected=true&workspace_id=...
const params = new URLSearchParams(window.location.search);
if (params.get('github_connected') === 'true') {
  console.log('GitHub connected successfully!');
}

// 3. List repositories
async function listRepos(workspaceId) {
  const res = await fetch(
    `/.netlify/functions/github-repos?workspace_id=${workspaceId}`
  );
  
  const data = await res.json();
  return data.repositories;
}

// 4. Connect repository
async function connectRepo(workspaceId, repoFullName) {
  const res = await fetch('/.netlify/functions/github-repos-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id: workspaceId,
      repo_full_name: repoFullName
    })
  });
  
  const data = await res.json();
  return data.connection;
}
```

## Common Issues

### "Workspace não possui conexão GitHub ativa"
→ Need to connect GitHub account first via OAuth

### "Token GitHub expirado ou revogado"
→ User revoked access, need to reconnect

### "Repositório não encontrado ou sem acesso"
→ Repository deleted or user lost access

### "Repositório já conectado ao workspace"
→ Repository already connected (not an error, just info)

## Security Notes

- ⚠️ Never expose `GITHUB_CLIENT_SECRETS_OAUTH` to frontend
- ⚠️ Access tokens never leave the backend
- ⚠️ All OAuth handled server-side
- ✅ CORS enabled on all endpoints
- ✅ SQL injection prevented (parameterized queries)

## Testing

```bash
# Test OAuth start
curl -X POST http://localhost:8888/.netlify/functions/auth-github-start \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"test-uuid"}'

# Test repo listing
curl http://localhost:8888/.netlify/functions/github-repos?workspace_id=test-uuid

# Test repo connection
curl -X POST http://localhost:8888/.netlify/functions/github-repos-connect \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"test-uuid","repo_full_name":"owner/repo"}'
```

## Documentation

- **Full API Docs:** [github-integration-api.md](./github-integration-api.md)
- **Data Contracts:** [data-contracts/](./data-contracts/)
- **Implementation Summary:** [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)

---

**Last Updated:** 2025-12-27
