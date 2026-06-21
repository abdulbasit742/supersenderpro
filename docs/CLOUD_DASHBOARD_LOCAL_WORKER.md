  # Cloud Dashboard + Local Worker Architecture

  How to split SuperSender Pro into a **cloud control plane** (dashboard/API) and
  one or more **local data-plane workers** (WhatsApp/Baileys sessions + sending).

  ## The problem


  Unofficial WhatsApp (Baileys) needs a persistent socket + on-disk session
  credentials and a stable, residential-ish IP. Cloud platforms restart
  containers, scale to multiple replicas, and rotate IPs — all of which break or
  ban WhatsApp sessions. Meanwhile the dashboard/API is perfectly happy in the
  cloud.

  ## The split



        +-------------------------------+
        |          CLOUD                |
        |   dashboard + API (stateless)       |
        |   - worker registry                 |
        |   - heartbeat tracking              |
        |   - outbound job queue (dry)        |
        | - inbound relay log (masked) |
        +---------------+---------------+
                          ^    |
        heartbeat /        |       |   jobs to claim
        inbound relay    |   v
        +---------------+---------------+
        |         LOCAL / VPS WORKER           |
        |   - Baileys socket + sessions       |
        |   - real sending (your code)        |
        |   - QR login on the box             |
        +-------------------------------+

  - **Cloud** never holds a WhatsApp session and never sends. It coordinates.
  - **Local worker** holds sessions, pulls jobs, sends, and reports back.
  - Communication is plain HTTPS, authenticated with a per-worker token.

  ## Why this is safe by default

  - Server-side bridge is **dry-run**: `LOCAL_WORKER_BRIDGE_DRY_RUN=true`.
  - Jobs are created as dry-run; the cloud never calls WhatsApp or any external API.
  - Tokens are stored **hashed** (HMAC-SHA256); full token shown once at creation.
  - Inbound logs mask phone numbers and drop raw payloads.
  - No auto-reply in this phase.

  ## Token & auth model


  - Each worker gets a unique token at registration (returned once).
  - The cloud stores only `HMAC-SHA256(token, LOCAL_WORKER_TOKEN_SECRET)`.
  - The worker presents the token via the `x-worker-token` header on
    heartbeat / claim / complete / fail / inbound calls.
  - Verification is timing-safe. A bad/missing token → 401.


  ## Environment

  Cloud (API host):

  ```bash
  LOCAL_WORKER_BRIDGE_ENABLED=true
  LOCAL_WORKER_BRIDGE_DRY_RUN=true
  LOCAL_WORKER_STORE_PATH=data/local-worker-bridge.json
  LOCAL_WORKER_JOB_STORE_PATH=data/local-worker-jobs.json
  LOCAL_WORKER_INBOUND_STORE_PATH=data/local-worker-inbound.json
  LOCAL_WORKER_TOKEN_SECRET=change-me-local-only   # set a real value in real .env
  LOCAL_WORKER_HEARTBEAT_STALE_SECONDS=90



Local worker (separate machine):


  LOCAL_WORKER_API_BASE=https://your-cloud-host        # the cloud bridge base URL
  LOCAL_WORKER_ID=...      # from /register
  LOCAL_WORKER_TOKEN=... # from /register (once)
  LOCAL_WORKER_DRY_RUN=true


Local dev (no cloud required)
You can run everything on one machine:


  node server.js                       # dashboard + bridge API on your normal port
  export LOCAL_WORKER_API_BASE=http://localhost:3001
  # register a worker via the dashboard or curl, export ID + TOKEN, then:
  npm run local-worker:dev



Nothing here requires a deployed cloud. Local dev works standalone.

Production deployment notes
• Deploy the cloud app as usual (the bridge is just extra routes + a dashboard).
• Put the cloud behind HTTPS; the worker token rides on the header.
• Run the worker on a box where the WhatsApp number can stay logged in (your
  PC, a small VPS, a Raspberry Pi). Keep its IP stable.

• Persist data/*.json on the cloud side (volume), or migrate to the Postgres
  backend if you already adopted it for other modules.

• Scale workers horizontally: register multiple, each claims jobs independently
  (claim flips a job to claimed so two workers won't double-send).


• Keep LOCAL_WORKER_BRIDGE_DRY_RUN=true until your worker's real Baileys
 send path is verified.

What needs real setup later
• A real LOCAL_WORKER_TOKEN_SECRET .
• Your actual Baileys send logic wired into the worker's performJob() .
• A persistent store/volume for the JSON files (or Postgres).
• HTTPS on the cloud host.
Files that should never be committed
• data/local-worker-*.json
• real .env
• any worker file containing real Baileys wiring/tokens


EXISTING FILE HOOKS — server.js, public/index.html,
package.json, .env.example (append-only)
