const env = require('../config/env');

function trimSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function webhookPath(kind = '') {
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

async function triggerWorkflow(kind, payload = {}) {
  const baseUrl = trimSlash(env.n8nBaseUrl);
  if (!baseUrl || typeof fetch !== 'function') {
    return { success: false, skipped: true, reason: 'n8n base URL or fetch unavailable' };
  }
  const url = `${baseUrl}/webhook/${webhookPath(kind)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.n8nWebhookSecret ? { 'x-supersender-secret': env.n8nWebhookSecret } : {})
    },
    body: JSON.stringify({
      event: kind,
      source: 'ai-tools-business-backend',
      timestamp: new Date().toISOString(),
      payload
    })
  });
  const text = await response.text();
  return {
    success: response.ok,
    status: response.status,
    url,
    body: text.slice(0, 1000)
  };
}

module.exports = { triggerWorkflow };
