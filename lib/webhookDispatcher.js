// webhookDispatcher.js — Outbound Event Webhook Dispatcher (Zapier/Make/Respond.io style).
// Lets the store register external webhook URLs that fire on CRM events (new_lead, stage_change,
// payment_received, bot_escalation, opt_out, loyalty_earn, etc.). Each delivery is signed with an
// HMAC-SHA256 signature so receivers can verify authenticity, and every attempt is logged.
//
// SECURITY: All target URLs are validated against an SSRF blocklist. We reject non-http(s) URLs and
// any host that resolves to a private, loopback, link-local, or cloud-metadata address. The check is
// run BOTH at registration time and again at dispatch time (after DNS resolution) to defeat DNS
// rebinding attacks where a public hostname later resolves to an internal IP.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

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

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------
// Allow opting out (e.g. for trusted internal testing) via WEBHOOK_ALLOW_PRIVATE=1.
function privateTargetsAllowed() {
  return /^(1|true|yes)$/i.test(String(process.env.WEBHOOK_ALLOW_PRIVATE || ''));
}

function ipv4ToLong(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIPv4(ip) {
  const long = ipv4ToLong(ip);
  if (long === null) return true; // treat unparseable as unsafe
  const inRange = (start, end) => long >= ipv4ToLong(start) && long <= ipv4ToLong(end);
  return (
    inRange('0.0.0.0', '0.255.255.255') ||       // "this" network
    inRange('10.0.0.0', '10.255.255.255') ||      // private
    inRange('100.64.0.0', '100.127.255.255') ||   // carrier-grade NAT
    inRange('127.0.0.0', '127.255.255.255') ||    // loopback
    inRange('169.254.0.0', '169.254.255.255') ||  // link-local + cloud metadata (169.254.169.254)
    inRange('172.16.0.0', '172.31.255.255') ||    // private
    inRange('192.0.0.0', '192.0.0.255') ||        // IETF protocol assignments
    inRange('192.168.0.0', '192.168.255.255') ||  // private
    inRange('198.18.0.0', '198.19.255.255') ||    // benchmarking
    inRange('224.0.0.0', '239.255.255.255') ||    // multicast
    inRange('240.0.0.0', '255.255.255.255')       // reserved + broadcast
  );
}

function isPrivateIPv6(ip) {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (addr === '::1' || addr === '::') return true;              // loopback / unspecified
  if (addr.startsWith('fe80')) return true;                       // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // unique local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) -> validate the embedded IPv4
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isUnsafeAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format -> unsafe
}

// Synchronous structural validation (no DNS). Used at registration.
function validateUrlShape(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return { ok: false, reason: 'invalid url' }; }
  if (!/^https?:$/.test(parsed.protocol)) return { ok: false, reason: 'only http(s) allowed' };
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    return { ok: false, reason: 'host points to internal service' };
  }
  // If the host is already a literal IP, validate it now.
  const literal = host.replace(/^\[|\]$/g, '');
  if (net.isIP(literal) && isUnsafeAddress(literal)) {
    return { ok: false, reason: 'target resolves to a private/reserved address' };
  }
  return { ok: true, parsed };
}

// Full validation including DNS resolution. Used at dispatch (defeats DNS rebinding).
async function validateUrlResolved(url) {
  const shape = validateUrlShape(url);
  if (!shape.ok) return shape;
  if (privateTargetsAllowed()) return { ok: true };
  const host = shape.parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return { ok: true }; // already validated as public in shape check
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) return { ok: false, reason: 'host did not resolve' };
    for (const rec of records) {
      if (isUnsafeAddress(rec.address)) {
        return { ok: false, reason: `host resolves to private address ${rec.address}` };
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `dns lookup failed: ${err.message}` };
  }
}

class WebhookDispatcher {
  registerWebhook(storeId, url, events = [], secret = '') {
    if (!url || !/^https?:\/\//i.test(url)) throw new Error('A valid http(s) url is required');
    if (!privateTargetsAllowed()) {
      const check = validateUrlShape(url);
      if (!check.ok) throw new Error(`Refusing to register webhook: ${check.reason}`);
    }
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
   * Each target is re-validated against the SSRF blocklist immediately before the request.
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
    let blocked = 0;

    for (const hook of targets) {
      const safety = await validateUrlResolved(hook.url);
      if (!safety.ok) {
        blocked++;
        hook.failures = (hook.failures || 0) + 1;
        logs.logs.unshift({ hookId: hook.id, event, status: 'blocked', error: `SSRF guard: ${safety.reason}`, ts: new Date().toISOString() });
        continue;
      }
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
          signal: controller.signal,
          redirect: 'manual' // do not follow redirects into internal hosts
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
    return { dispatched, blocked, targets: targets.length };
  }

  getDeliveryLogs(storeId, limit = 100) {
    return readJSON(logFile(storeId), { logs: [] }).logs.slice(0, limit);
  }

  getSupportedEvents() { return SUPPORTED_EVENTS; }
}

module.exports = WebhookDispatcher;
