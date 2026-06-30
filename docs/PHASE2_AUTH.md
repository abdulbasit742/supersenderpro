# Phase 2 - Auth, Sessions & RBAC

"No billing = no revenue" - and no billing without auth. This is the gate. Per-tenant users, password login, JWT sessions, password reset, and role-based access.

## What's here
| File | Role |
|---|---|
| `lib/auth/index.js` | bcrypt hashing, HS256 JWT, signup/login/reset, RBAC helpers |
| `middleware/authMiddleware.js` | `requireAuth` (attaches `req.user`+`req.tenantId`), `requireRole(min)` |
| `routes/authRoutes.js` | `/signup /login /me /password/* /users` |
| `scripts/wire-auth.js` | idempotent `server.js` mount |
| `tests/smoke/authSmoke.js` | dependency-free smoke test |

## Tenant-scoped by construction
Users live in the `users` collection of the tenant-scoped repository (`lib/db`, PR #86). Every call passes `tenantId`; a tenant can't see or auth against another tenant's users. First user of a tenant auto-becomes `owner`; later users default to `agent`.

## Roles
`owner > admin > agent > viewer`. `requireRole('admin')` etc. enforce the hierarchy. Role changes require `owner`.

## Endpoints (`/api/auth`)
| Method | Path | Access |
|---|---|---|
| POST | `/signup` | public (tenant via `x-tenant-id`) |
| POST | `/login` | public |
| GET | `/me` | auth |
| POST | `/password/reset-request` | public (returns token only if `AUTH_EXPOSE_RESET_TOKEN=true`; otherwise deliver via WhatsApp/email) |
| POST | `/password/reset` | public + token |
| GET | `/users` | admin+ |
| POST | `/users/:id/role` | owner |
| POST | `/users/:id/status` | admin+ |

## Wire + verify
```bash
node scripts/wire-auth.js
node tests/smoke/authSmoke.js
```

## Env
```
AUTH_JWT_SECRET=change-me-strong      # falls back to SESSION_SECRET
AUTH_JWT_TTL_SEC=604800               # 7 days
AUTH_EXPOSE_RESET_TOKEN=false         # true only in dev
DB_DRIVER=json                        # json | postgres (see PR #86)
```

## Notes
- JWT is a compact HS256 implementation using Node `crypto`, so it works before adding `jsonwebtoken`. Swap later if you prefer the library.
- Reset tokens are random, stored hashed (sha256), single-use, 1h TTL. Raw token is never logged.
- Next: plans + Stripe billing gated behind `requireAuth` + tenant license (Phase 2 cont.).
