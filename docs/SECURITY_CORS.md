# Security - CORS

Controlled cross-origin access for browser frontends/dashboards calling the API. Dependency-free; registered early in the bootstrap so it applies to all routes.

## Config
```
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true        # send Access-Control-Allow-Credentials
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization,x-api-key,x-tenant-id,Idempotency-Key,x-admin-secret
CORS_MAX_AGE=600
```
Default `CORS_ALLOWED_ORIGINS=*` allows any origin (convenient for dev). **Set an explicit allowlist in production.**

## Behavior
- Allowed origin -> reflected in `Access-Control-Allow-Origin` (reflection, not literal `*`, so it works with credentials - browsers reject `*` + credentials).
- Disallowed origin -> no CORS headers (the browser blocks the JS call); non-browser clients (cURL, server-to-server, API keys) are unaffected.
- `OPTIONS` preflight: `204` for allowed origins, `403` for disallowed.

## Note
The header allowlist already includes the custom headers this API uses (`x-api-key`, `x-tenant-id`, `Idempotency-Key`, `x-admin-secret`) so the frontend can send them.

## Verify
```bash
node tests/smoke/corsSmoke.js
```
