// src/modules/paymentOCR/index.js
// Express routes + /payment-ocr dashboard + the verify() hook.


'use strict';

const core = require('./paymentOCR');


function register(app, deps = {}) {
 // Verify from pre-extracted text (great for testing) OR a base64 image.
   app.post('/api/payment-ocr/verify', async (req, res) => {
     const body = req.body || {};
     try {
       const input = { customerNumber: body.customerNumber };
         if (body.rawText) input.rawText = body.rawText;
         else if (body.imageBase64) input.imageBuffer = Buffer.from(body.imageBase64, 'base64');
         const decision = await core.verify(input, deps);
         res.json({ ok: true, decision });
     } catch (err) {
       res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
     }
   });

   // Parse only (no order match / no fraud guard) - handy for tuning the regexes.
   app.post('/api/payment-ocr/parse', (req, res) => {
     const text = (req.body && req.body.rawText) || '';
     res.json({ ok: true, parsed: core.parseReceipt(text) });
   });


   app.get('/api/payment-ocr/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/payment-ocr', (_req, res) => res.send(renderDashboard(core.getStats())));

   return { verify: (input) => core.verify(input, deps), core };
}

function renderDashboard(s) {
 const palette = { approve: '#5fd38a', manual_review: '#f0c674', reject: '#f08a8a' };
   const rows = Object.entries(s.byStatus || {})
     .map(([k, v]) => `<tr><td><span class="dot" style="background:${palette[k] || '#8a8f98'}"></span>${k}</td><td>${v}
</td></tr>`)
   .join('') || '<tr><td colspan="2">No verifications yet</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Payment OCR</title>
<style>
   body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
 .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}


    table{border-collapse:collapse;width:100%;max-width:420px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
    .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
  <h1>OCR Payment Verifier</h1>
  <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; tolerance ±Rs ${s.config.amountTolerance} &middot; ${s.config.merchantNumbers} merchant number(s)</div>
    <div class="cards">
      <div class="card"><div class="n">${s.total}</div><div class="l">Verified</div></div>
     <div class="card"><div class="n">${s.uniqueTxns}</div><div class="l">Unique TXNs</div></div>
     <div class="card"><div class="n">${s.byStatus.approve || 0}</div><div class="l">Approved</div></div>
      <div class="card"><div class="n">${s.byStatus.reject || 0}</div><div class="l">Rejected</div></div>
    </div>
  <table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
