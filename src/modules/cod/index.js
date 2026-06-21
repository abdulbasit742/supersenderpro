// src/modules/cod/index.js
// Express routes + /cod dashboard + tracking scheduler for COD + Courier.


'use strict';

const core = require('./cod');


let _timer = null;

function register(app, deps = {}, opts = {}) {
  app.post('/api/cod/book', async (req, res) => {
      try { res.json({ ok: true, shipment: await core.book(req.body || {}, deps) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

    // Manual status advance (manual adapter / operator override).
    app.post('/api/cod/status', (req, res) => {
      const b = req.body || {};
      if (!b.trackingNumber || !b.status) return res.status(400).json({ ok: false, error: 'trackingNumber and status\nrequired' });
    try { res.json({ ok: true, shipment: core.setStatus(b.trackingNumber, b.status, deps) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

    app.post('/api/cod/remittance', (req, res) => {
      res.json({ ok: true, ...core.reconcileRemittance(req.body || {}) });
    });


    app.post('/api/cod/track-now', async (_req, res) => res.json({ ok: true, ...(await core.trackAll(deps)) }));
    app.get('/api/cod/report', (_req, res) => res.json({ ok: true, ...core.report() }));

    app.get('/cod', (_req, res) => res.send(renderDashboard(core.report())));

    startScheduler(deps, opts);
    return { core };
}

function startScheduler(deps, opts = {}) {
  if (_timer) clearInterval(_timer);
    if (!core.CONFIG.enabled) return;
    const ms = opts.intervalMs || core.CONFIG.trackIntervalMin * 60 * 1000;
    _timer = setInterval(() => core.trackAll(deps).catch((e) => console.error('[cod] track error:', e)), ms);
    if (_timer.unref) _timer.unref();
    setTimeout(() => core.trackAll(deps).catch(() => {}), 15000);
}
function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }

function renderDashboard(r) {
  const cur = r.currency;
  const money = (n) => `${cur} ${Number(n || 0).toLocaleString()}`;
  const color = (st) => ({ booked: '#9ecbff', in_transit: '#f0c674', delivered: '#5fd38a', cash_remitted: '#3fa971', returned: '#f08a8a', cancelled: '#8a8f98' }[st] || '#8a8f98');
  const rows = r.recent.map((s) => {
    const c = color(s.status);
    const rto = s.rtoFlagged ? ' <span class="rto">RTO?</span>' : '';
    return `<tr><td><code>${s.trackingNumber}</code></td><td>${s.orderId}</td><td>${s.courier}</td><td>${s.city || '-'}</td><td>${money(s.codAmount)}</td><td><span class="pill" style="background:${c}22;color:${c}">${s.status.replace('_', ' ')}</span>${rto}</td><td>${s.remitted ? '✅' : '-'}</td></tr>`;
  }).join('') || '<tr><td colspan="7">No shipments yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>COD</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
  .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .card.warn .n{color:#f0c674}.card.good .n{color:#5fd38a}
  table{border-collapse:collapse;width:100%;max-width:900px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  code{color:#9ecbff;font-size:12px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .rto{color:#f08a8a;font-size:11px;font-weight:600;margin-left:6px}
</style></head><body>
  <h1>COD & Courier</h1>
  <div class="muted">${r.couriers.length ? 'Couriers: ' + r.couriers.join(', ') : 'No couriers registered'}${r.config.dryRun ? ' &middot; DRY-RUN' : ''}</div>
  <div class="cards">
    <div class="card"><div class="n">${r.total}</div><div class="l">Shipments</div></div>
    <div class="card good"><div class="n">${r.deliveredCount}</div><div class="l">Delivered</div></div>
    <div class="card warn"><div class="n">${money(r.codOutstanding)}</div><div class="l">COD outstanding</div><div class="l">${r.codOutstandingCount} orders</div></div>
    <div class="card good"><div class="n">${money(r.codCollected)}</div><div class="l">COD collected</div></div>
    <div class="card warn"><div class="n">${r.rtoFlagged}</div><div class="l">RTO flagged</div></div>
  </div>
  <table><thead><tr><th>Tracking</th><th>Order</th><th>Courier</th><th>City</th><th>COD</th><th>Status</th><th>Remitted</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
