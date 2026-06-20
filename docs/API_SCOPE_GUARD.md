# API Scope Guard (Developer API)

`lib/securityGateway/scopeGuard.js` previews developer API scope enforcement.

```
check({ requiredScope, providedScopes }) -> { requiredScope, providedScopeCount, mismatch, allowed, wouldBlockLive, dryRun }
```

- In default posture (`SECURITY_GATEWAY_ENFORCE=false`), a mismatch is reported but **not blocked** (`allowed: true`, `wouldBlockLive: false`).
- When enforcement is enabled, `wouldBlockLive` becomes `true` for mismatches.

Endpoint: `POST /api/security-gateway/validate/developer-api`.
