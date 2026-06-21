  # Local Worker Bridge — Phase 2 (going live, deliberately)

  Phase 2 adds the live send path without changing Phase 1's safe defaults.
  Nothing sends until you flip two switches on purpose.

  ## What's new

  | File | Purpose |
  | --- | --- |
  | `lib/localWorkerBridge/rateLimiter.js` | Per-worker token-bucket throttle (anti-ban) |
  | `lib/localWorkerBridge/idempotency.js` | Idempotency keys: no double job-creation/sends |
  | `workers/lib/baileysSendAdapter.example.js` | Worker adapter: dry-run guard + Baileys plug-in point |
  | `lib/localWorkerBridge/autoReplyRouter.js` | Opt-in inbound -> flow engine -> dry-run reply job |

  ## Still safe by default

  - Worker adapter has a HARD dry-run guard: returns without sending unless
    `LOCAL_WORKER_DRY_RUN=false` AND a real Baileys socket is bound.
  - The cloud server never sends. Auto-reply produces a **dry-run job**, not a send.
  - Auto-reply is OFF unless `LOCAL_WORKER_AUTOREPLY_ENABLED=true`.
  - Rate limiter caps claim/send velocity per worker.


  ## How to go live (deliberate steps)

  1. Copy `baileysSendAdapter.example.js` -> `workers/lib/baileysSendAdapter.js`.
  2. In your real worker, bind your existing Baileys socket:
     ```js
     const adapter = require('./lib/baileysSendAdapter');
     const sock = require('../path/to/your/existing/baileys/session');
     adapter.bindBaileys(sock);

and call adapter.handleJob(job) from performJob() .
3. Verify everything in dry-run first ( LOCAL_WORKER_DRY_RUN=true ).
4. Only when confident: set LOCAL_WORKER_DRY_RUN=false on the WORKER only.
5. (Optional) enable auto-reply: LOCAL_WORKER_AUTOREPLY_ENABLED=true on cloud,
and bind your flow engine via autoReplyRouter.bindFlowEngine(...) .

Rate limits & idempotency
• LOCAL_WORKER_RATE_PER_MINUTE (default 20) + LOCAL_WORKER_RATE_BURST .
• Pass idempotencyKey when creating a job; repeats return the same job id.
Don't commit


• workers/lib/baileysSendAdapter.js (your real wiring)
• data/local-worker-idempotency.json
  <p><br/></p>


  <hr/>

  # PHASE 2 HOOKS (append-only, marked)

  ## routes/localWorkerBridgeRoutes.js — add the requires near the top:

  ```js
  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  const rateLimiter = require('../lib/localWorkerBridge/rateLimiter');
  const idempotency = require('../lib/localWorkerBridge/idempotency');
  const autoReplyRouter = require('../lib/localWorkerBridge/autoReplyRouter');
  // END LOCAL WORKER BRIDGE PHASE2 HOOK


In POST /jobs — dedupe by idempotency key (place at top of the handler):
  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  const idemKey = req.body && req.body.idempotencyKey;
  if (idemKey) {
      const existingId = idempotency.lookup(idemKey);
      if (existingId) {
          const existing = jobQueue.getJob(existingId);
          if (existing) return ok(res, { job: jobQueue.safeJobView(existing), deduped: true });
      }
  }
  // END LOCAL WORKER BRIDGE PHASE2 HOOK



Then right after the job is created ( const job = jobQueue.createJob(...) ):


  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  if (idemKey) idempotency.remember(idemKey, job.id);
  // END LOCAL WORKER BRIDGE PHASE2 HOOK


In POST /jobs/:id/claim — rate-limit the worker (after token auth passes):
  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  const rl = rateLimiter.take(worker.workerId);
  if (!rl.allowed) {
    return res.status(429).json({ ok: false, error: 'rate limited', retryAfterSec: rl.retryAfterSec });
  }
  // END LOCAL WORKER BRIDGE PHASE2 HOOK


In POST /inbound — route to auto-reply (after store.appendInbound(...) ):
  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  let autoReply = { routed: false };
  if (autoReplyRouter.enabled()) {
    autoReply = await autoReplyRouter.route(entry, (input) => jobQueue.createJob(input));
  }


  // then include `autoReply` in the response: return ok(res, { stored: true, entry, autoReply });
  // END LOCAL WORKER BRIDGE PHASE2 HOOK



(Note: make that route handler async if it isn't already.)

.env.example — append Phase 2 placeholders:
  # BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  LOCAL_WORKER_RATE_PER_MINUTE=20
  LOCAL_WORKER_RATE_BURST=10
  LOCAL_WORKER_IDEMPOTENCY_PATH=data/local-worker-idempotency.json
  LOCAL_WORKER_IDEMPOTENCY_TTL_HOURS=24
  LOCAL_WORKER_AUTOREPLY_ENABLED=false
  # END LOCAL WORKER BRIDGE PHASE2 HOOK


config.js — these are read via process.env already, but add defaults if
you want them centralized:
  // BEGIN LOCAL WORKER BRIDGE PHASE2 HOOK
  // (optional) add to the config object:
  //   rateLimitPerMinute: int(process.env.LOCAL_WORKER_RATE_PER_MINUTE, 20),
  //   rateLimitBurst: int(process.env.LOCAL_WORKER_RATE_BURST, 10),
  //   idempotencyTtlHours: int(process.env.LOCAL_WORKER_IDEMPOTENCY_TTL_HOURS, 24),
  // END LOCAL WORKER BRIDGE PHASE2 HOOK


.gitignore — add:
