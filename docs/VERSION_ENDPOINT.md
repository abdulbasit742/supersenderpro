# /version (build info)

Confirms exactly **what's running** - critical when you deploy and need to verify the new commit is actually live.

## Endpoint
`GET /version` (public, no-cache) ->
```json
{ "success": true, "name": "supersender-pro", "version": "1.0.0",
  "commit": "a1b2c3d4e5f6", "env": "production", "node": "v20.x",
  "bootedAt": "2026-06-30T...", "uptimeSec": 1234 }
```

## Where the commit comes from
First match wins: `BUILD_SHA`, `GIT_COMMIT`, `SOURCE_VERSION`, `RENDER_GIT_COMMIT`, `RAILWAY_GIT_COMMIT_SHA`, else `.git/HEAD` (local). **Set one of these at build/deploy time** (Docker `ARG`/`ENV`, or your platform's built-in) so prod shows the real SHA instead of `unknown`.

## Use
- Post-deploy smoke: `curl https://app/version` and assert `commit` equals what you shipped.
- Pair with `/api/health` (liveness) and `/metrics` (telemetry) for a complete ops triplet.

## Dockerfile snippet
```dockerfile
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA
# docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) .
```

## Verify
```bash
node tests/smoke/versionSmoke.js
```
