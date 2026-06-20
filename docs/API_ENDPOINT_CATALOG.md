# API Endpoint Catalog

`GET /api/developer-portal/api-catalog` returns the curated, redacted catalog.
`GET /api/developer-portal/openapi.json` returns an OpenAPI 3.0 (preview) document.

Each endpoint entry includes: `method, path, module, summary, requestSchema, responseSchemaRedacted,
authRequired, scopes, dryRunSafe, piiRisk, notes`.

> All documented endpoints are **preview-safe**. Secret response fields are never documented.
> Admin-only and preview-only routes are clearly marked.
