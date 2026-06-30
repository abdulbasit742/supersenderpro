# Security - Response Headers + Body-Size Guard

Dependency-free hardening (no `helmet` needed). Applied first in the bootstrap so it covers every route.

## Headers set
| Header | Value | Why |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | stop MIME sniffing |
| `X-Frame-Options` | `DENY` (env `SECURITY_FRAME_OPTIONS`) | clickjacking protection |
| `Referrer-Policy` | `no-referrer` | don't leak URLs |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | force HTTPS (toggle `SECURITY_HSTS_ENABLED=false`) |
| `Content-Security-Policy` | conservative default (env `SECURITY_CSP`) | XSS mitigation (toggle `SECURITY_CSP_ENABLED=false`) |
| `X-Powered-By` | removed | don't advertise the stack |

## Body-size guard
`bodySizeGuard` rejects requests whose `Content-Length` exceeds `SECURITY_MAX_BODY_BYTES` (default 2MB) with `413`, before they hit handlers. Defense-in-depth alongside any `express.json({ limit })`.

## Env
```
SECURITY_CSP_ENABLED=true
SECURITY_CSP=...                 # override the default policy if it blocks an embedded UI
SECURITY_HSTS_ENABLED=true       # set false if serving plain HTTP in dev
SECURITY_FRAME_OPTIONS=DENY
SECURITY_MAX_BODY_BYTES=2097152
```

## Note
The CSP allows `'unsafe-inline'` for styles/scripts because the existing dashboards use inline assets. Tighten it once those move to external files. If a header breaks an embedded page, toggle it via env rather than removing the middleware.

## Verify
```bash
node tests/smoke/securityHeadersSmoke.js
```
