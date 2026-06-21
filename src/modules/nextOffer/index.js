// src/modules/nextOffer/index.js
// Express routes + /next-offer dashboard for the Next-Best-Offer module.


'use strict';

const core = require('./nextOffer');


function register(app, deps = {}) {
  app.post('/api/next-offer/purchase', (req, res) => {
      const b = req.body || {};
      if (!b.customerNumber || !b.productId) return res.status(400).json({ ok: false, error: 'customerNumber and productId\nrequired' });
    res.json({ ok: true, basket: core.recordPurchase(b.customerNumber, b.productId) });
    });

    app.get('/api/next-offer/recommend/:number', async (req, res) => {
      try { res.json({ ok: true, offers: await core.recommendAll(req.params.number, deps) }); }
      catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });


    app.get('/api/next-offer/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

    app.get('/next-offer', (_req, res) => res.send(renderDashboard(core.getStats())));

    // Expose a clean in-process API for the bot/renewal layer.
  return { core, api: { recommend: (num) => core.recommend(num, deps), recommendAll: (num) => core.recommendAll(num,
deps) } };
}


function renderDashboard(s) {
  const prodRows = s.topProducts.map((p) => `<tr><td>${p.id}</td><td>${p.count}</td></tr>`).join('') || '<tr><td\ncolspan="2">No purchases tracked</td></tr>';
  const pairRows = s.topPairs.map((p) => `<tr><td>${p.pair[0]} + ${p.pair[1]}</td><td>${p.count}</td></tr>`).join('') ||
'<tr><td colspan="2">No pairs learned yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Next-Best-Offer</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    .tables{display:flex;gap:16px;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;max-width:340px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
</style></head><body>
    <h1>Next-Best-Offer Recommender</h1>
    <div class="muted">Learns co-purchase patterns to upsell & cross-sell</div>


   <div class="cards">
     <div class="card"><div class="n">${s.trackedProducts}</div><div class="l">Products</div></div>
     <div class="card"><div class="n">${s.trackedCustomers}</div><div class="l">Customers</div></div>
     <div class="card"><div class="n">${s.learnedPairs}</div><div class="l">Learned pairs</div></div>
   </div>
   <div class="tables">
     <div><h2>Top products</h2><table><thead><tr><th>Product</th><th>Sold</th></tr></thead><tbody>${prodRows}</tbody>
 </table></div>
     <div><h2>Top co-purchase pairs</h2><table><thead><tr><th>Pair</th><th>Count</th></tr></thead><tbody>${pairRows}
 </tbody></table></div>
   </div>
 </body></html>`;
 }

 module.exports = { register, renderDashboard, core };
