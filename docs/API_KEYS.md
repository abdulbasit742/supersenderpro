# API Keys (programmatic access)

Humans log in with JWT (`lib/auth`); **machines and integrations** use API keys. Per-tenant, hashed at rest, scoped, revocable.

## Issue (human admin)
`POST /api/api-keys` (JWT auth + admin) `{ name, scopes? }` -> returns the **raw key once**:
```json
{ "apiKey": { "id": "...", "prefix": "sk_1a2b3c4d", "key": "sk_...", "scopes": ["send"] },
  "note": "Save this key now - it will not be shown again." }
```
Only a sha256 **hash** is stored; the raw key is never persisted or logged.

## Use (machine)
Send `x-api-key: sk_...` and protect routes with:
```js
const { apiKeyAuth } = require('../lib/apiKeys/middleware');
router.post('/send', apiKeyAuth({ requireScope: 'send' }), handler); // sets req.tenantId + req.apiKey
```
Scope `*` grants all. Missing scope -> 403; invalid/revoked key -> 401.

## Manage
- `GET /api/api-keys` - list (prefix + metadata only, never the secret).
- `DELETE /api/api-keys/:id` - revoke (verify fails immediately).

## Verify
```bash
node tests/smoke/apiKeysSmoke.js
```

## Note
A lightweight hash->tenant index lives in the platform namespace for O(1) verify; revoking removes it so a revoked key stops working instantly.
