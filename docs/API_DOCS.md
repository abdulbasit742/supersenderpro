# API Documentation (OpenAPI 3.1 + Swagger UI)

A machine-readable API contract for integrators, served live.

## Endpoints
- `GET /api/docs/openapi.json` - the OpenAPI 3.1 spec (point Postman/Insomnia/codegen at this).
- `GET /api/docs` - interactive Swagger UI (loaded from CDN, no build step).

## Coverage
Auth (signup/login/me/api-keys), Billing (plans/subscription/checkout/webhook), Sales (deals + stage), Ops (health/ready/metrics/audit), Platform (tenants), Compliance (export/erase). Security schemes documented: `bearerAuth` (JWT) for humans, `apiKey` (`x-api-key`) for machines, `x-tenant-id` header where relevant.

## Keeping it accurate
The spec is hand-curated in `lib/apiDocs/openapi.js` (not auto-introspected) so it stays readable and intentional. When you add or change a public route, update the corresponding entry - the smoke test asserts core paths exist so an accidental deletion is caught.

## Verify
```bash
node tests/smoke/openapiSmoke.js
# after boot: open http://localhost:PORT/api/docs
```
