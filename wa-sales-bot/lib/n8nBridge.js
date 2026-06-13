const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'data', 'n8n_events.json');

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

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

function pushLog(event = {}) {
  const rows = readJSON(logFile, []);
  rows.unshift({
    id: event.id || `wa_n8n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    ...event
  });
  writeJSON(logFile, rows.slice(0, 500));
}

function trimSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function resolveWebhookUrl(kind = '') {
  const directMap = {
    order_created: process.env.N8N_ORDER_WEBHOOK_URL,
    dealer_rate_collected: process.env.N8N_DEALER_RATE_WEBHOOK_URL,
    daily_broadcast: process.env.N8N_BROADCAST_WEBHOOK_URL,
    payment_verification: process.env.N8N_PAYMENT_WEBHOOK_URL,
    followup_sequence: process.env.N8N_FOLLOWUP_WEBHOOK_URL
  };
  if (directMap[kind]) return String(directMap[kind]).trim();

  const baseUrl = trimSlash(process.env.N8N_BASE_URL || '');
  if (!baseUrl) return '';
  const paths = {
    order_created: 'wa-bot-order-created',
    dealer_rate_collected: 'wa-bot-dealer-rate',
    daily_broadcast: 'wa-bot-daily-broadcast',
    payment_verification: 'wa-bot-payment-verification',
    followup_sequence: 'wa-bot-followup-sequence'
  };
  return `${baseUrl}/webhook/${paths[kind] || `wa-bot-${kind}`}`;
}

async function trigger(kind, payload = {}, meta = {}) {
  const enabled = String(process.env.N8N_ENABLED || '').toLowerCase() === 'true';
  const url = resolveWebhookUrl(kind);
  const secret = String(process.env.N8N_WEBHOOK_SECRET || '').trim();

  if (!enabled || !url) {
    pushLog({
      direction: 'outbound',
      event: kind,
      status: 'skipped',
      reason: !enabled ? 'n8n_disabled' : 'webhook_missing',
      url
    });
    return { success: false, skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-n8n-secret': secret } : {})
      },
      body: JSON.stringify({
        event: kind,
        source: 'wa-sales-bot',
        generatedAt: new Date().toISOString(),
        payload,
        meta
      }),
      signal: controller.signal
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(body || `HTTP ${response.status}`);
    }
    pushLog({
      direction: 'outbound',
      event: kind,
      status: 'sent',
      url,
      responseStatus: response.status
    });
    return { success: true };
  } catch (error) {
    pushLog({
      direction: 'outbound',
      event: kind,
      status: 'failed',
      url,
      error: error.message
    });
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  trigger,
  triggerOrderCreated(payload, meta) {
    return trigger('order_created', payload, meta);
  },
  triggerDealerRateCollected(payload, meta) {
    return trigger('dealer_rate_collected', payload, meta);
  },
  triggerDailyBroadcast(payload, meta) {
    return trigger('daily_broadcast', payload, meta);
  },
  triggerPaymentVerification(payload, meta) {
    return trigger('payment_verification', payload, meta);
  },
  triggerFollowupSequence(payload, meta) {
    return trigger('followup_sequence', payload, meta);
  }
};
