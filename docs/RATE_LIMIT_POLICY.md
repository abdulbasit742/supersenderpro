# Rate Limit Policy

The rate limiter (`lib/securityGateway/rateLimiter.js`) stores **only hashed identifiers** (IP hash, user-agent hash, hashed app/tenant/reseller IDs). Raw IP is never stored.

## Default policies (`rateLimitPolicy.js`)
| Scope | Max requests | Window | Mode |
|---|---|---|---|
| public_form | 10 | 10 min | block_preview |
| public_api | 60 | 10 min | block_preview |
| developer_api | 300 | 10 min | warn |
| webhook | 30 | 10 min | block_preview |
| admin_api | 120 | 10 min | warn |
| auth_like | 20 | 10 min | warn |
| report_generation | 20 | 1 hour | warn |
| generic | 100 | 10 min | report_only |

## Rules
- No live blocking unless `SECURITY_GATEWAY_ENFORCE=true`.
- Responses return warnings + `retryAfterSeconds` preview.
- Limits/windows for public form and developer API are configurable via env.

## Endpoints
- `GET /api/security-gateway/rate-limits`
- `POST /api/security-gateway/rate-limits/test`
- `POST /api/security-gateway/rate-limits/reset-preview`
