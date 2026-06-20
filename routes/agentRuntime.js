'use strict';
// Mountable router:  app.use(require('./routes/agentRuntime')(express))
const runtime = require('../agent-runtime');
const { POLICY } = require('../agent-runtime/policy');

// Tiny in-memory rate limiter (per IP).
function rateLimiter({ windowMs = 60000, max = 60 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count += 1; hits.set(key, rec);
    if (rec.count > max) return res.status(429).json({ success: false, error: 'rate limit exceeded' });
    next();
  };
}

// Bearer auth (skipped if AGENT_RUNTIME_API_KEY is unset, for local dev).
function auth(req, res, next) {
  if (!POLICY.runtimeApiKey) return next();
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (token !== POLICY.runtimeApiKey) return res.status(401).json({ success: false, error: 'unauthorized' });
  next();
}

module.exports = function buildRouter(express) {
  const router = express.Router();
  router.use(express.json({ limit: '256kb' }));
  router.use(rateLimiter({ windowMs: 60000, max: 120 }));
  router.use(auth);

  router.get('/api/agent-runtime/status', (req, res) => res.json(runtime.getStatus()));
  router.get('/api/agent-runtime/tools',  (req, res) => res.json({ success: true, tools: runtime.listTools() }));
  router.get('/api/agent-runtime/agents', (req, res) => res.json({ success: true, agents: runtime.listAgents() }));

  router.post('/api/agent-runtime/plan', async (req, res) => {
    try { res.json(await runtime.plan(req.body.goal, { agent: req.body.agent })); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  router.post('/api/agent-runtime/run', async (req, res) => {
    try {
      const { goal, agent, dryRun, approved } = req.body || {};
      res.json(await runtime.run(goal, { agent, dryRun, approved: Boolean(approved) }));
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  router.get('/api/agent-runtime/queue', (req, res) =>
    res.json({ success: true, stats: runtime.queue.stats(), tasks: runtime.queue.list({ status: req.query.status, limit: 100 }) }));

  router.post('/api/agent-runtime/queue/:id/approve', async (req, res) => {
    try { res.json(await runtime.approveAndRun(req.params.id, req.body?.by || 'admin')); }
    catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
  router.post('/api/agent-runtime/queue/:id/reject', (req, res) => {
    const t = runtime.queue.reject(req.params.id, req.body?.by || 'admin', req.body?.reason || '');
    res.json({ success: Boolean(t), task: t });
  });

  return router;
};
module.exports.rateLimiter = rateLimiter;
module.exports.auth = auth;
