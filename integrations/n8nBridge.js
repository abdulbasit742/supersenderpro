const fs = require('fs');
const path = require('path');

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function trimSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function defaultWebhookPath(kind) {
  const map = {
    order_created: 'supersender-order-created',
    dealer_rate_collected: 'supersender-dealer-rate',
    daily_broadcast: 'supersender-daily-broadcast',
    payment_verification: 'supersender-payment-verification',
    followup_sequence: 'supersender-followup-sequence',
    dashboard_sync: 'supersender-dashboard-sync'
  };
  return map[kind] || `supersender-${String(kind || 'event').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`;
}

function resolveWebhookUrl(settings = {}, kind = '') {
  const directMap = {
    order_created: settings.n8n_order_webhook_url,
    dealer_rate_collected: settings.n8n_dealer_rate_webhook_url,
    daily_broadcast: settings.n8n_broadcast_webhook_url,
    payment_verification: settings.n8n_payment_webhook_url,
    followup_sequence: settings.n8n_followup_webhook_url,
    dashboard_sync: settings.n8n_dashboard_sync_webhook_url
  };
  if (directMap[kind]) return String(directMap[kind]).trim();

  const baseUrl = trimSlash(settings.n8n_base_url || '');
  if (!baseUrl) return '';
  return `${baseUrl}/webhook/${defaultWebhookPath(kind)}`;
}

function looksJson(text = '') {
  const value = String(text || '').trim();
  return value.startsWith('{') || value.startsWith('[');
}

function normalizeInboundDashboardPatch(payload = {}) {
  const directPatch = payload.dashboardState || payload.dashboard_update || payload.statePatch || payload.patch;
  if (directPatch && typeof directPatch === 'object' && !Array.isArray(directPatch)) return directPatch;
  if (payload.event === 'dashboard_update' && payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)) {
    return payload.payload;
  }
  return null;
}

function createN8nBridge({ dataDir, getSettings, io = null }) {
  const eventsFile = path.join(dataDir, 'n8n_events.json');
  const dashboardStateFile = path.join(dataDir, 'n8n_dashboard_state.json');

  function ensureFiles() {
    if (!fs.existsSync(eventsFile)) writeJSON(eventsFile, []);
    if (!fs.existsSync(dashboardStateFile)) writeJSON(dashboardStateFile, {});
  }

  function readEvents() {
    ensureFiles();
    const rows = readJSON(eventsFile, []);
    return Array.isArray(rows) ? rows : [];
  }

  function writeEvents(rows) {
    ensureFiles();
    writeJSON(eventsFile, rows.slice(0, 500));
  }

  function readDashboardState() {
    ensureFiles();
    const value = readJSON(dashboardStateFile, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function saveEvent(event = {}) {
    const rows = readEvents();
    rows.unshift({
      id: event.id || `n8n_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: event.timestamp || nowIso(),
      ...event
    });
    writeEvents(rows);
    return rows[0];
  }

  function updateDashboardState(patch = {}, source = 'n8n') {
    const current = readDashboardState();
    const next = {
      ...current,
      ...patch,
      lastSource: source,
      updatedAt: nowIso()
    };
    writeJSON(dashboardStateFile, next);
    if (io) {
      io.emit('n8n:dashboard_update', next);
    }
    return next;
  }

  async function postJSON(url, payload, headers = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const raw = await response.text();
      const body = looksJson(raw) ? JSON.parse(raw) : raw;
      if (!response.ok) {
        throw new Error(typeof body === 'string' && body ? body : `HTTP ${response.status}`);
      }
      return { ok: true, status: response.status, body };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function triggerWorkflow(kind, payload = {}, meta = {}) {
    const settings = typeof getSettings === 'function' ? getSettings() || {} : {};
    const url = resolveWebhookUrl(settings, kind);
    const enabled = settings.n8n_enabled ?? false;
    const envelope = {
      event: kind,
      source: 'supersender-pro',
      generatedAt: nowIso(),
      payload,
      meta
    };

    if (!enabled || !url) {
      saveEvent({
        direction: 'outbound',
        event: kind,
        status: 'skipped',
        reason: !enabled ? 'n8n_disabled' : 'webhook_missing',
        url,
        payloadPreview: {
          keys: Object.keys(payload || {}).slice(0, 12)
        }
      });
      return { success: false, skipped: true, reason: !enabled ? 'n8n_disabled' : 'webhook_missing' };
    }

    try {
      const response = await postJSON(url, envelope, {
        'x-n8n-secret': String(settings.n8n_webhook_secret || process.env.N8N_WEBHOOK_SECRET || '').trim()
      });
      saveEvent({
        direction: 'outbound',
        event: kind,
        status: 'sent',
        url,
        responseStatus: response.status,
        payloadPreview: {
          keys: Object.keys(payload || {}).slice(0, 12)
        }
      });
      return { success: true, url, response };
    } catch (error) {
      saveEvent({
        direction: 'outbound',
        event: kind,
        status: 'failed',
        url,
        error: error.message,
        payloadPreview: {
          keys: Object.keys(payload || {}).slice(0, 12)
        }
      });
      return { success: false, url, error: error.message };
    }
  }

  function validateSecret(req) {
    const settings = typeof getSettings === 'function' ? getSettings() || {} : {};
    const expected = String(settings.n8n_webhook_secret || process.env.N8N_WEBHOOK_SECRET || '').trim();
    if (!expected) return true;
    const provided = String(req.headers['x-n8n-secret'] || req.headers['x-webhook-secret'] || req.query.secret || '').trim();
    return expected === provided;
  }

  function handleInboundWebhook(req, res) {
    if (!validateSecret(req)) {
      return res.status(401).json({ success: false, error: 'Invalid n8n webhook secret' });
    }

    const payload = req.body || {};
    const eventType = String(payload.event || payload.type || payload.action || 'n8n_event').trim() || 'n8n_event';
    const patch = normalizeInboundDashboardPatch(payload);
    const snapshot = patch ? updateDashboardState(patch, 'n8n_webhook') : readDashboardState();

    const eventRow = saveEvent({
      direction: 'inbound',
      event: eventType,
      status: 'received',
      payloadPreview: {
        keys: Object.keys(payload || {}).slice(0, 12)
      }
    });

    return res.json({
      success: true,
      received: true,
      event: eventType,
      dashboardState: snapshot,
      logId: eventRow.id
    });
  }

  function getRecentEvents(limit = 50) {
    return readEvents().slice(0, Math.max(1, Number(limit || 50)));
  }

  function getStatus() {
    const settings = typeof getSettings === 'function' ? getSettings() || {} : {};
    return {
      enabled: settings.n8n_enabled ?? false,
      baseUrl: String(settings.n8n_base_url || '').trim(),
      webhookSecretConfigured: !!String(settings.n8n_webhook_secret || process.env.N8N_WEBHOOK_SECRET || '').trim(),
      webhooks: {
        order_created: resolveWebhookUrl(settings, 'order_created'),
        dealer_rate_collected: resolveWebhookUrl(settings, 'dealer_rate_collected'),
        daily_broadcast: resolveWebhookUrl(settings, 'daily_broadcast'),
        payment_verification: resolveWebhookUrl(settings, 'payment_verification'),
        followup_sequence: resolveWebhookUrl(settings, 'followup_sequence'),
        dashboard_sync: resolveWebhookUrl(settings, 'dashboard_sync')
      },
      dashboardState: readDashboardState(),
      recentEvents: getRecentEvents(15)
    };
  }

  ensureFiles();

  return {
    triggerWorkflow,
    triggerOrderCreated(payload, meta = {}) {
      return triggerWorkflow('order_created', payload, meta);
    },
    triggerDealerRateCollected(payload, meta = {}) {
      return triggerWorkflow('dealer_rate_collected', payload, meta);
    },
    triggerDailyBroadcast(payload, meta = {}) {
      return triggerWorkflow('daily_broadcast', payload, meta);
    },
    triggerPaymentVerification(payload, meta = {}) {
      return triggerWorkflow('payment_verification', payload, meta);
    },
    triggerFollowupSequence(payload, meta = {}) {
      return triggerWorkflow('followup_sequence', payload, meta);
    },
    updateDashboardState,
    getDashboardState: readDashboardState,
    getRecentEvents,
    getStatus,
    handleInboundWebhook
  };
}

module.exports = {
  createN8nBridge
};
