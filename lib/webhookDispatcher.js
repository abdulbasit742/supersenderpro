// webhookDispatcher.js — Outbound Event Webhook Dispatcher (Zapier/Make/Respond.io style).
// Lets the store register external webhook URLs that fire on CRM events (new_lead, stage_change,
// payment_received, bot_escalation, opt_out, loyalty_earn, etc.). Each delivery is signed with an
// HMAC-SHA256 signature so receivers can verify authenticity, and every attempt is logged.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) fs.mkdirSync(CRM_DIR, { recursive: true });

const hooksFile = (storeId) => path.join(CRM_DIR, `${storeId}_webhooks.json`);
const logFile = (storeId) => path.join(CRM_DIR, `${storeId}_webhook_logs.json`);

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

const SUPPORTED_EVENTS = [
  'new_lead', 'stage_change', 'payment_received', 'order_completed',
  'bot_escalation', 'opt_out', 'opt_in', 'loyalty_earn', 'loyalty_redeem', 'campaign_completed'
];

class WebhookDispatcher {
  registerWebhook(storeId, url, events = [], secret = '') {
    if (!url || !/^https?:\/\//i.test(url)) throw new Error('A valid http(s) url is required');
    const data = readJSON(hooksFile(storeId), { webhooks: [] });
    const hook = {
      id: `WH-${Date.now()}`,
      url,
      events: (events && events.length) ? events.filter(e => SUPPORTED_EVENTS.includes(e)) : ['*'],
      secret: secret || crypto.randomBytes(16).toString('hex'),
      active: true,
      createdAt: new Date().toISOString(),
      deliveries: 0,
      failures: 0
    };
    data.webhooks.push(hook);
    writeJSON(hooksFile(storeId), data);
    return hook;
  }

  listWebhooks(storeId) {
    return readJSON(hooksFile(storeId), { webhooks: [] }).webhooks;
  }

  setActive(storeId, id, active) {
    const data = readJSON(hooksFile(storeId), { webhooks: [] });
    const hook = data.webhooks.find(h => h.id === id);
    if (hook) { hook.active = !!active; writeJSON(hooksFile(storeId), data); }
    return hook;
  }

  deleteWebhook(storeId, id) {
    const data = readJSON(hooksFile(storeId), { webhooks: [] });
    const before = data.webhooks.length;
    data.webhooks = data.webhooks.filter(h => h.id !== id);
    writeJSON(hooksFile(storeId), data);
    return { deleted: before - data.webhooks.length };
  }

  _sign(secret, body) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Fire an event to all subscribed, active webhooks. Non-blocking (fire-and-forget) with logging.
   */
  async dispatch(storeId, event, payload = {}) {
    if (!SUPPORTED_EVENTS.includes(event)) {
      console.warn(`[WebhookDispatcher] Unknown event "${event}" — dispatching anyway.`);
    }
    const data = readJSON(hooksFile(storeId), { webhooks: [] });
    const targets = data.webhooks.filter(h => h.active && (h.events.includes('*') || h.events.includes(event)));
    if (!targets.length) return { dispatched: 0 };

    const envelope = JSON.stringify({ event, storeId, payload, timestamp: new Date().toISOString() });
    const logs = readJSON(logFile(storeId), { logs: [] });
    let dispatched = 0;

    for (const hook of targets) {
      const signature = this._sign(hook.secret, envelope);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SuperSender-Event': event,
            'X-SuperSender-Signature': `sha256=${signature}`
          },
          body: envelope,
          signal: controller.signal
        });
        clearTimeout(timer);
        hook.deliveries = (hook.deliveries || 0) + 1;
        dispatched++;
        logs.logs.unshift({ hookId: hook.id, event, status: resp.status, ok: resp.ok, ts: new Date().toISOString() });
      } catch (err) {
        hook.failures = (hook.failures || 0) + 1;
        logs.logs.unshift({ hookId: hook.id, event, status: 'error', error: err.message, ts: new Date().toISOString() });
      }
    }

    if (logs.logs.length > 500) logs.logs = logs.logs.slice(0, 500);
    writeJSON(hooksFile(storeId), data);
    writeJSON(logFile(storeId), logs);
    return { dispatched, targets: targets.length };
  }

  getDeliveryLogs(storeId, limit = 100) {
    return readJSON(logFile(storeId), { logs: [] }).logs.slice(0, limit);
  }

  getSupportedEvents() { return SUPPORTED_EVENTS; }
}

module.exports = WebhookDispatcher;
