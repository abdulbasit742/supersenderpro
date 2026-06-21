  # Local Worker Bridge

  The Local Worker Bridge lets SuperSender Pro run its **dashboard/API in the
  cloud** while a **local PC or VPS worker** owns the WhatsApp/Baileys QR
  sessions and does the actual sending.

  The server-side bridge is **dry-run by default**. It never sends real WhatsApp
  messages and never calls external APIs. It only:

  - registers local workers and issues tokens (hashed at rest),
  - tracks worker heartbeats and freshness (online / stale / offline),
  - queues outbound jobs for workers to claim (dry-run),
  - stores a **masked** inbound relay log (no raw payloads, phones masked).

  ## Why a local worker is needed

  Baileys (unofficial WhatsApp) keeps a long-lived socket and stores session
  credentials on disk after the QR scan. That doesn't survive well on ephemeral
  cloud hosts (restarts, read-only FS, multiple replicas, IP churn → bans). The
  clean split:

  - **Cloud**: stateless dashboard + API + job queue + heartbeat tracking.
  - **Local/VPS**: the Baileys socket, the session files, and the real sending.

  The worker pulls jobs from the cloud and pushes heartbeats + inbound relays back.


  ## Files

  | Path | Purpose |
  | --- | --- |
  | `lib/localWorkerBridge/config.js` | Env-driven config, repo-relative store paths |
  | `lib/localWorkerBridge/token.js` | Generate / hash / verify / mask worker tokens |
  | `lib/localWorkerBridge/store.js` | JSON worker registry + inbound log |
  | `lib/localWorkerBridge/heartbeat.js` | Heartbeat recording + freshness status |
  | `lib/localWorkerBridge/jobQueue.js` | JSON outbound job queue (dry-run jobs) |
  | `lib/localWorkerBridge/payloads.js` | Masking/sanitizing (phones, tokens, inbound) |
  | `routes/localWorkerBridgeRoutes.js` | Express Router: all `/api/local-worker/*` |
  | `workers/local-whatsapp-worker.example.js` | Example local worker |
  | `scripts/local-worker-dev.js` | Dev helper (prints env names, runs dry-run) |
  | `public/local-worker-bridge.html` + js/css | Dashboard |


  Data files (auto-created, **gitignore them**): `data/local-worker-bridge.json`,
  `data/local-worker-jobs.json`, `data/local-worker-inbound.json`.

  ## Safe token setup

  1. Set a real `LOCAL_WORKER_TOKEN_SECRET` in your `.env` (not `.env.example`).


     This is the HMAC key used to hash worker tokens. Changing it invalidates all
     existing worker tokens.
  2. Register a worker (below). The API returns the **full token exactly once**.
  3. The server stores only the HMAC-SHA256 hash + a masked preview
     (`lwb_ab12…7f9c`). The full token is never retrievable again.
  4. Put the token in the worker's env as `LOCAL_WORKER_TOKEN`. Never commit it.


  ## Register a worker

  ```bash
  curl -X POST "$LOCAL_WORKER_API_BASE/api/local-worker/register" \
    -H 'content-type: application/json' \
    -d '{"workerName":"office-vps","machineLabel":"vps-1","capabilities":
  ["whatsapp_send_text","whatsapp_channel_post"],"version":"1.0.0"}'



Response includes worker (safe view) and token (shown once). Export:


  export LOCAL_WORKER_ID=...      # from response
  export LOCAL_WORKER_TOKEN=...   # from response (once)


How heartbeat works
The worker POSTs to /api/local-worker/workers/:id/heartbeat (token via
x-worker-token header) with { status, uptime, whatsappStatus, activeSessions, queueDepth, memory, warnings } . The
server stores the latest
heartbeat and stamps lastSeenAt . Freshness is derived on read:

• online: seen within LOCAL_WORKER_HEARTBEAT_STALE_SECONDS (default 90s)
• stale: older than that
• offline: older than 3× the stale window
How jobs are claimed
1. Operator (or another module) creates a job: POST /api/local-worker/jobs .
   All jobs are dry-run unless the whole bridge is explicitly live.

2. Worker polls GET /api/local-worker/jobs?status=pending .

3. Worker claims one: POST /api/local-worker/jobs/:id/claim (token required).

4. Worker does the work locally (your Baileys send goes here), then calls
   /complete or /fail . Operators can /retry or /cancel .



Job types: whatsapp_send_text , whatsapp_send_template ,
whatsapp_send_media , whatsapp_channel_post , admin_alert , dry_run_test .


How inbound relay works
The worker can forward inbound messages to POST /api/local-worker/inbound
(token required). The server stores a safe entry only: phone numbers are
masked, free text is clamped to a short preview, and raw WhatsApp payloads are
dropped. No auto-reply happens in this phase. View via


GET /api/local-worker/inbound .


Run the dry-run example worker
  # after registering + exporting LOCAL_WORKER_ID / LOCAL_WORKER_TOKEN
  export LOCAL_WORKER_API_BASE=http://localhost:3001
  npm run local-worker:dev
  # or: node scripts/local-worker-dev.js



It sends heartbeats, claims pending jobs, and marks them dry-run complete
without sending anything.

What NOT to commit
• data/local-worker-*.json (worker registry, jobs, inbound log)
• your real .env (especially LOCAL_WORKER_TOKEN_SECRET and any token)
• workers/local-whatsapp-worker.js if you add real Baileys wiring to it

Add to .gitignore :


  data/local-worker-bridge.json
  data/local-worker-jobs.json
  data/local-worker-inbound.json
