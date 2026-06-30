# Core Stability - Health Check

Satisfies backlog tasks **TASK-0002 (add)**, **TASK-0003 (verify)**, **TASK-0004 (harden)**, **TASK-0005 (optimize)**, **TASK-0006 (document)** for the Core Stability module.

## What it does
Lightweight, dependency-free health probes that tell you instantly whether the server is alive, ready, and not silently degrading.

| Probe | Checks | down means |
|---|---|---|
| `eventLoop` | event-loop lag (responsiveness) | process is wedged/CPU-pinned |
| `memory` | RSS, heap, system free % | almost out of RAM |
| `dataDir` | `data/` is writable (write+read+delete) | can't persist - hard fail |
| `jsonStore` | sample JSON files parse | corruption detected |
| `ollama` | local inference reachable (optional) | self-hosted LLM down (degraded only) |

## Endpoints (mounted at `/api/health`)
| Path | Use | Codes |
|---|---|---|
| `GET /api/health` | full report (cached ~3s) | 200 ok/degraded, 503 down |
| `GET /api/health/live` | liveness (cheap, no I/O) | 200 / 503 |
| `GET /api/health/ready` | readiness (data dir + store) | 200 / 503 |

Degraded returns **200** on purpose so a load balancer keeps the node in rotation while you get alerted; only a hard `down` returns **503**.

## Wire it up
```bash
node scripts/wire-health-check.js   # idempotent: mounts /api/health in server.js
```

## Verify (targeted command)
```bash
node scripts/health-verify.js          # exits 1 only if DOWN
node scripts/health-verify.js --strict # exits 1 on DEGRADED too
```

## Hardening / optimization notes
- Every probe is wrapped with a timeout (`HEALTH_PROBE_TIMEOUT_MS`, default 1500ms) and try/catch, so one stuck probe never hangs or crashes the endpoint.
- Results are cached for `HEALTH_CACHE_TTL_MS` (default 3000ms) to prevent probe stampedes under load-balancer polling.
- Probes run in parallel.
- Latest report is best-effort written to `health_report.json` for existing ops tooling.

## Env
```
HEALTH_CACHE_TTL_MS=3000
HEALTH_PROBE_TIMEOUT_MS=1500
HEALTH_CHECK_OLLAMA=true            # set false to skip local LLM probe
OLLAMA_HOST=http://127.0.0.1:11434
```
