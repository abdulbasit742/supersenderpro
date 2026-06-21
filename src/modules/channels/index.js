// src/modules/channels/index.js
// Express routes (per-channel webhooks) + /channels dashboard for the omnichannel layer.


'use strict';

const core = require('./channels');


function register(app, deps = {}) {
  if (typeof deps.onMessage === 'function') core.setOnMessage(deps.onMessage);

  // --- Telegram webhook (set this URL via Telegram setWebhook) ---
  app.post('/api/channels/telegram/webhook', async (req, res) => {
    await core.handleWebhook('telegram', req.body || {});
    res.sendStatus(200);
  });

  // --- Instagram / Meta webhook: GET = verify handshake, POST = events ---
  app.get('/api/channels/instagram/webhook', (req, res) => {
    const verifyToken = process.env.IG_VERIFY_TOKEN || process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.sendStatus(403);
  });
  app.post('/api/channels/instagram/webhook', async (req, res) => {
    // NOTE: verify X-Hub-Signature-256 via the security module before trusting this.
    await core.handleWebhook('instagram', req.body || {});
    res.sendStatus(200);
  });

  // --- Generic inbound (manual/test or any pre-normalized source) ---
  app.post('/api/channels/inbound', async (req, res) => {
    const b = req.body || {};
    if (!b.channel || b.from == null) return res.status(400).json({ ok: false, error: 'channel and from required' });
    res.json(await core.ingest(b.channel, { from: b.from, text: b.text, name: b.name, raw: b.raw }));
  });

  // --- Unified send ---
  app.post('/api/channels/send', async (req, res) => {
    const b = req.body || {};
    if (!b.channel || b.to == null) return res.status(400).json({ ok: false, error: 'channel and to required' });
    res.json(await core.send({ channel: b.channel, to: b.to, text: b.text || '' }));
  });

  app.post('/api/channels/link-identities', (req, res) => {
    const b = req.body || {};
    res.json(core.linkIdentities(b.keyA, b.keyB));
  });


     app.get('/api/channels/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

     app.get('/channels', (_req, res) => res.send(renderDashboard(core.getStats())));
     return { core };
 }

 function renderDashboard(s) {
  const icon = { whatsapp: '🟢', telegram: '✈️', instagram: '📷', snapchat: '👻', test: '🧪' };
  const cards = Object.entries(s.byChannel).map(([c, d]) => {
    const linkOnly = d.kind === 'link-only';
    return `<div class="card">
      <div class="ch">${icon[c] || '💬'} ${c}${linkOnly ? ' <span class="lo">link-only</span>' : ''}</div>
      <div class="row"><span>In</span><b>${d.in}</b></div>
      <div class="row"><span>Out</span><b>${d.out}</b></div>
      <div class="row"><span>Customers</span><b>${d.customers}</b></div>
    </div>`;
  }).join('') || '<div class="muted">No channels registered</div>';
  const recent = s.recent.map((m) => `<tr><td>${icon[m.channel] || ''} ${m.channel}</td><td>${m.dir === 'in' ? '⬇️ in' : '⬆️ out'}</td><td class="txt">${(m.text || '').replace(/[<>&]/g, '')}</td></tr>`).join('') || '<tr><td colspan="3">No messages yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Channels</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:170px}
  .ch{font-weight:700;margin-bottom:10px;text-transform:capitalize}
  .lo{font-size:10px;color:#f0c674;border:1px solid #3a3012;border-radius:4px;padding:1px 5px;margin-left:4px}
  .row{display:flex;justify-content:space-between;color:#8a8f98;font-size:13px}
  .row b{color:#e6e6e6}
  table{border-collapse:collapse;width:100%;max-width:720px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  .txt{color:#cfd3da}
</style></head><body>
  <h1>Omnichannel Messaging</h1>
  <div class="muted">${s.channels.length} channels &middot; ${s.totalCustomers} customers &middot; ${s.totalMessages} messages${s.config.dryRun ? ' &middot; DRY-RUN' : ''}</div>
  <div class="cards">${cards}</div>
  <h2>Recent messages</h2>
  <table><thead><tr><th>Channel</th><th>Dir</th><th>Text</th></tr></thead><tbody>${recent}</tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
