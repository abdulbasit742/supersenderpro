# Deploy - Build SHA + Readiness Probe

Two small deploy correctness fixes on the Dockerfile.

## 1. Real commit in /version
The `/version` endpoint (PR #329) reports `commit: 'unknown'` inside a container because the SHA isn't available at runtime. The image now accepts a build arg:
```dockerfile
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA
```
Build with:
```bash
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t supersender .
```
CI/CD: pass the commit SHA your platform exposes (GitHub Actions `${{ github.sha }}`, etc.). Now `GET /version` shows the real commit in production.

## 2. HEALTHCHECK uses readiness, not liveness
Changed the container `HEALTHCHECK` from `/api/health` to `/api/health/ready`. Combined with graceful shutdown (PR #140), a **draining** instance reports not-ready -> the orchestrator/LB stops routing to it during a deploy, enabling clean rolling restarts.

## Net effect
- `docker build --build-arg BUILD_SHA=...` -> verifiable deploys (`/version`).
- Readiness-based healthcheck -> zero-downtime-friendly draining.

No app code changed; this is image/deploy config only.
