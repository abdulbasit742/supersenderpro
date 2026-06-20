# SuperSender Pro — Deployment Guide

This repo ships with a complete, production-grade deployment layer. Pick the
target that matches your infrastructure.

## TL;DR

```bash
cp .env.example .env        # fill production values
npm run generate:secrets    # generate strong secrets
make build && make up       # build + start the full stack
make health                 # verify backend is healthy
```

---

## 1. Docker Compose (recommended for a single VPS)

The stack: **backend** (Express+Prisma), **frontend** (Next.js), **postgres**,
**redis**, **n8n**, and a TLS reverse proxy.

| Command | Description |
|---|---|
| `make up` | Start with self-signed nginx TLS (dev / internal) |
| `make up-ssl` | Start with **Caddy automatic Let's Encrypt TLS** |
| `make logs` | Tail all logs |
| `make migrate && make seed` | DB migrate + seed |
| `make down` | Stop everything |

`docker-compose.prod.yml` adds container **healthchecks**, **CPU/memory limits**,
**log rotation**, and `no-new-privileges` hardening on top of the base compose file.

### Automatic HTTPS (Let's Encrypt)
Set in `.env`:
```
APP_DOMAIN=app.yourdomain.com
N8N_DOMAIN=n8n.yourdomain.com
ACME_EMAIL=you@yourdomain.com
```
Then `make up-ssl`. Caddy provisions and renews certs automatically — no certbot cron needed.

---

## 2. Managed platforms (zero-ops)

| Platform | File | Notes |
|---|---|---|
| **Render** | `render.yaml` | Web service + managed Postgres + Redis, health check on `/api/health` |
| **Fly.io** | `fly.toml` | `fly launch --no-deploy && fly deploy`, persistent volume for session data |
| **Railway** | `railway.json` | Dockerfile build, auto health check + restart policy |

---

## 3. Kubernetes

```bash
make k8s-deploy
```
Includes Deployment (non-root, liveness/readiness probes, PVCs for WhatsApp
session + uploads), Service, cert-manager Ingress (`k8s/ingress.yaml`), and an
HPA. Set image to your GHCR tag and edit the host in `ingress.yaml`.

> The WhatsApp session is **stateful** — keep `replicas: 1` unless you shard sessions.

---

## 4. CI/CD (GitHub Actions)

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push / PR | install, env validate, secret scan, smoke test, build all 3 images |
| `codeql.yml` | push / PR / weekly | JavaScript security analysis |
| `docker-publish.yml` | main + `v*` tags | build & push images to **GHCR** |
| `deploy.yml` | release / manual | SSH to server, pull, `compose up -d` |
| `dependabot.yml` | weekly | npm + Docker + Actions dependency updates |

### Required secrets for `deploy.yml`
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH` (optional `DEPLOY_PORT`).

---

## Image hardening summary
- Multi-stage / cached dependency layers
- Run as **non-root** (`node` user)
- `tini` as PID 1 (reaps zombie Chromium processes, clean signal handling)
- Container `HEALTHCHECK` against `/api/health`
- `.dockerignore` keeps secrets, `node_modules`, `.git`, docs out of images
