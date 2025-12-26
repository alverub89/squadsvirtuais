# Testing Guide for Issue #001.02 Fix

## Overview
This guide helps verify the Google authentication fix in production after deployment.

## Pre-Deployment Checklist

### Environment Variables (Netlify)
Verify these are configured in Netlify → Site Settings → Environment Variables:

- [ ] `VITE_GOOGLE_CLIENT_ID` - Client ID do Google Cloud Console
- [ ] `JWT_SECRET` - Secret para JWT (mínimo 32 chars)
- [ ] `DATABASE_URL` - Connection string PostgreSQL
- [ ] `FRONTEND_URL` - https://squadsvirtuais.com

### Database Schema
Verify these tables and constraints exist:

```sql
-- Check sv schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'sv';

-- Check sv.users table
\d sv.users
-- Should have: UNIQUE constraint users_email_key on (email)

-- Check sv.user_identities table  
\d sv.user_identities
-- Should have:
--   UNIQUE constraint unique_user_identity_provider_user on (provider, provider_user_id)
--   UNIQUE constraint unique_user_identity_user_provider on (user_id, provider)
--   Foreign Key user_id → sv.users.id
--   Column updated_at (timestamp)
```

## Post-Deployment Testing

### Test Case 1: New User First Login ✅

**Steps**:
1. Open https://squadsvirtuais.com
2. Open DevTools → Network tab
3. Click "Entrar com Google"
4. Select Google account (use one that never logged in before)
5. Observe Network tab

**Expected Results**:
- ✅ POST `/.netlify/functions/auth-google` → Status: 200
- ✅ Response body:
  ```json
  {
    "ok": true,
    "token": "eyJ...",
    "user": {
      "id": <number>,
      "name": "...",
      "email": "...",
      "avatarUrl": "..."
    }
  }
  ```
- ✅ User is logged in (sees authenticated UI)

**Verify in Database**:
```sql
-- Check user was created
SELECT id, name, email, last_login_at, created_at 
FROM sv.users 
WHERE email = 'your-test-email@gmail.com';

-- Check identity was created
SELECT id, user_id, provider, provider_user_id, last_login_at, created_at, updated_at
FROM sv.user_identities
WHERE provider = 'google' AND provider_email = 'your-test-email@gmail.com';

-- Verify updated_at was set
SELECT 
  created_at,
  updated_at,
  (updated_at = created_at) as timestamps_match
FROM sv.user_identities
WHERE provider = 'google' AND provider_email = 'your-test-email@gmail.com';
-- Should show: timestamps_match = true (both set to same value on first insert)
```

**Verify in Netlify Logs**:
Go to Netlify → Functions → auth-google → Recent logs

Search for these log messages:
```
[auth-google] Iniciando autenticação Google
[auth-google] VITE_GOOGLE_CLIENT_ID presente
[auth-google] Body parseado com sucesso
[auth-google] idToken recebido (length: ... chars)
[auth-google] Verificando token Google...
[auth-google] ✓ validated_token - Token Google verificado com sucesso
[auth-google] Dados do usuário extraídos com sucesso
[db] Executando query...
[auth-google] Fazendo upsert em sv.users...
[db] Query executada com sucesso. Linhas retornadas: 1
[auth-google] ✓ upsert_user_ok - Usuário criado/atualizado com sucesso, user_id: <id>
[auth-google] → upsert_identity_attempt - user_id: <id> provider: google
[db] Executando query...
[db] Query executada com sucesso. Linhas retornadas: 0
[auth-google] ✓ upsert_identity_ok - Identidade criada/atualizada com sucesso
[auth-google] Gerando JWT...
[jwt] Gerando JWT para usuário
[auth-google] JWT gerado com sucesso
[auth-google] Autenticação concluída com sucesso
```

---

### Test Case 2: Existing User Second Login ✅

**Steps**:
1. Logout from the application
2. Click "Entrar com Google" again
3. Select the SAME Google account used in Test Case 1
4. Observe Network tab

**Expected Results**:
- ✅ POST `/.netlify/functions/auth-google` → Status: 200
- ✅ Response contains same user.id as before
- ✅ User is logged in

**Verify in Database**:
```sql
-- Check last_login_at was updated
SELECT id, name, email, last_login_at 
FROM sv.users 
WHERE email = 'your-test-email@gmail.com';
-- last_login_at should be more recent than before

-- Check identity was UPDATED (not duplicated)
SELECT COUNT(*) as identity_count
FROM sv.user_identities
WHERE provider = 'google' AND provider_email = 'your-test-email@gmail.com';
-- Should be: identity_count = 1 (not 2!)

-- Verify updated_at was updated
SELECT 
  created_at,
  last_login_at,
  updated_at,
  (updated_at > created_at) as was_updated
FROM sv.user_identities
WHERE provider = 'google' AND provider_email = 'your-test-email@gmail.com';
-- Should show: was_updated = true
-- updated_at should equal last_login_at (second login time)
```

**Verify in Netlify Logs**:
Same log sequence as Test Case 1, confirming all steps completed successfully.

---

### Test Case 3: User with Changed Name ✅

**Steps**:
1. Go to Google Account settings and change your name
2. Return to https://squadsvirtuais.com
3. Logout and login again with Google
4. Observe that new name appears in UI

**Expected Results**:
- ✅ POST `/.netlify/functions/auth-google` → Status: 200
- ✅ Response shows updated name
- ✅ UI displays new name

**Verify in Database**:
```sql
-- Check name was updated
SELECT name, email 
FROM sv.users 
WHERE email = 'your-test-email@gmail.com';
-- name should match new Google name

-- Check raw_profile was updated with new data
SELECT raw_profile->>'name' as profile_name
FROM sv.user_identities
WHERE provider = 'google' AND provider_email = 'your-test-email@gmail.com';
-- Should match new name
```

---

### Test Case 4: Error Handling (Database Down) ⚠️

**Note**: This test requires temporarily breaking the DATABASE_URL to verify error handling.

**Steps**:
1. Netlify → Site Settings → Environment Variables
2. Temporarily change `DATABASE_URL` to invalid value
3. Redeploy site
4. Try to login with Google
5. Observe error response

**Expected Results**:
- ✅ POST `/.netlify/functions/auth-google` → Status: 500
- ✅ Response body includes specific error:
  ```json
  {
    "error": "Erro ao salvar usuário no banco de dados",
    "code": "ECONNREFUSED",
    "constraint": "none"
  }
  ```

**Verify in Netlify Logs**:
```
[auth-google] ✓ validated_token - Token Google verificado com sucesso
[auth-google] Fazendo upsert em sv.users...
[db] Erro ao executar query: ...
[db] Código do erro: ECONNREFUSED
[auth-google] Erro no upsert de sv.users: ...
```

**After Test**:
- Restore correct `DATABASE_URL`
- Redeploy site

---

## Troubleshooting

### If Login Still Fails with 500

1. **Check Netlify Logs** for exact error:
   - Go to Netlify → Functions → auth-google → Recent logs
   - Look for last successful step (✓) before error
   - Look for `[db] Código do erro:` and `[db] Constraint:`

2. **Common Error Codes**:
   - `23502` - NOT NULL violation → Missing required field
   - `23503` - FK violation → user_id doesn't exist in sv.users
   - `23505` - UNIQUE violation → Duplicate entry
   - `42P01` - Table doesn't exist
   - `42703` - Column doesn't exist

3. **If error is "constraint: unique_user_identity_user_provider"**:
   This means there's already an identity with (user_id, google).
   ```sql
   -- Check for duplicates
   SELECT user_id, provider, COUNT(*) 
   FROM sv.user_identities 
   GROUP BY user_id, provider 
   HAVING COUNT(*) > 1;
   
   -- If duplicates exist, fix manually:
   -- Keep the most recent one, delete others
   ```

4. **If error is "column updated_at does not exist"**:
   The database schema needs updating:
   ```sql
   -- Add updated_at column if missing
   ALTER TABLE sv.user_identities 
   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
   ```

### If Logs Don't Appear

- Wait 1-2 minutes after deployment for logs to propagate
- Try logging in again
- Check Netlify → Site → Deploys → (latest) → Function logs
- Verify function deployed correctly: Netlify → Functions → auth-google should show "Active"

### If Error Response Lacks Details (code, constraint)

This means an older version of the code is still deployed:
1. Check git commit on deployed branch
2. Verify Netlify built from correct branch
3. Trigger manual redeploy: Netlify → Deploys → Trigger deploy → Deploy site

---

## Success Criteria

All of these must be true:

- [x] Code changes committed and pushed
- [x] Linting passed
- [x] Build passed  
- [x] Code review completed
- [x] Security scan (CodeQL) passed with 0 vulnerabilities
- [ ] Test Case 1 (new user) passes
- [ ] Test Case 2 (existing user) passes
- [ ] Test Case 3 (changed name) passes
- [ ] Database shows correct data (no duplicates, updated_at set)
- [ ] Netlify logs show all ✓ checkpoints
- [ ] No 500 errors in production
- [ ] Users can successfully login with Google

---

## Rollback Plan

If the fix doesn't work and needs to be rolled back:

1. **Immediate**: Revert to previous deploy in Netlify
   - Netlify → Deploys → (previous successful deploy) → "Publish deploy"

2. **Investigation**: Check what went wrong
   - Download Netlify logs
   - Check database for data inconsistencies
   - Review error messages with code/constraint details

3. **Fix Forward**: Address specific issue found
   - Make targeted fix based on error diagnostics
   - Test locally if possible
   - Redeploy

---

## Appendix: Manual Database Queries

### Clean up test data after testing
```sql
-- Remove test user and identity (CAREFUL!)
DELETE FROM sv.user_identities WHERE provider_email = 'your-test-email@gmail.com';
DELETE FROM sv.users WHERE email = 'your-test-email@gmail.com';
```

### Check for any identity without updated_at
```sql
SELECT id, user_id, provider, updated_at IS NULL as missing_updated_at
FROM sv.user_identities
WHERE updated_at IS NULL;
```

### Backfill updated_at for existing records (if needed)
```sql
UPDATE sv.user_identities
SET updated_at = last_login_at
WHERE updated_at IS NULL;
```

---

**Document Version**: 1.0  
**Created**: 2025-12-26  
**Author**: GitHub Copilot  
**Related Issue**: #001.02
