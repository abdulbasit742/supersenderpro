// src/modules/intent/index.js
// Express routes + /intent dashboard + the inbound handle() that fires actions.


'use strict';

const core = require('./intent');


/**
* Wire the router into your app and return a handler for inbound messages.
   *
   * @param {import('express').Express} app
   * @param {Object} deps action hooks + optional classify():
   *   classify(text)            optional LLM classifier
   *      replyGreeting(from)         replyPricing(from)     replyAvailability(from)
   *      startOrder(from)            routePaymentProof(from) routeRenewal(from)
   *      replySupport(from)          clarify(from)            escalateToHuman(from, ctx)
   */
function register(app, deps = {}) {
 app.post('/api/intent/classify', async (req, res) => {
         const text = (req.body && req.body.text) || '';
         try {
             const decision = await core.decide({ from: 'api-test', text }, deps);
             res.json({ ok: true, decision });
         } catch (err) {
           res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
         }
       });


       app.get('/api/intent/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

       app.get('/intent', (_req, res) => res.send(renderDashboard(core.getStats())));

       return { handle: (input) => handle(input, deps), core };
}

// Map an intent -> the dep hook that handles it.
const ROUTE_MAP = {
       greeting: 'replyGreeting',
       pricing: 'replyPricing',
       availability: 'replyAvailability',
       order: 'startOrder',
       payment_proof: 'routePaymentProof',
       renewal: 'routeRenewal',
       support: 'replySupport',
};

async function handle(input, deps = {}) {
       if (!core.CONFIG.enabled) return { skipped: true, reason: 'disabled' };
       const decision = await core.decide(input, deps);


  const { from } = decision;
  const log = (msg) => console.log(`[intent] ${msg}`);

  // Dry-run: decide + log, but never fire a real action.
  if (core.CONFIG.dryRun) {
      log(`[DRY-RUN] ${from} -> ${decision.action} (${decision.intent} @ ${decision.confidence})`);
      return decision;
  }

  const safeCall = async (fnName, ...args) => {
    const fn = deps[fnName];
      if (typeof fn !== 'function') { log(`no handler for ${fnName}, escalating`); return escalate(); }
      return fn(...args);
  };
  const escalate = async () => {
      if (typeof deps.escalateToHuman === 'function') return deps.escalateToHuman(from, decision);
      log(`escalate requested but no escalateToHuman handler for ${from}`);
  };


  if (decision.action === 'escalate') { await escalate(); return decision; }
  if (decision.action === 'clarify') { await safeCall('clarify', from, decision); return decision; }

  const intent = decision.action.replace('route:', '');
  const hook = ROUTE_MAP[intent];
  if (hook) await safeCall(hook, from, decision);
  else await escalate();
  return decision;
}


function renderDashboard(s) {
const row = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') || '<tr><td\ncolspan="2">none</td></tr>';
return `<!doctype html><html><head><meta charset="utf-8"/><title>Intent Router</title>
<style>
body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;color:#8a8f98;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:#8a8f98;margin-bottom:24px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
  table{border-collapse:collapse;width:100%;max-width:420px;background:#181b22;border-radius:12px;overflow:hidden;margin-
bottom:8px}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
</style></head><body>
<h1>AI Intent Router</h1>
<div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; min confidence ${s.config.minConfidence} &middot; ${s.total} messages classified</div>
  <h2>By intent</h2><table><thead><tr><th>Intent</th><th>Count</th></tr></thead><tbody>${row(s.byIntent)}</tbody></table>
  <h2>By action</h2><table><thead><tr><th>Action</th><th>Count</th></tr></thead><tbody>${row(s.byAction)}</tbody></table>
</body></html>`;
}


module.exports = { register, handle, renderDashboard, core };
