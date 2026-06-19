'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const HISTORY_FILE = 'report_sync_history.json';
const EXPORT_FILE = 'google_sheets_export.json';

function nowIso() {
  return new Date().toISOString();
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

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function normalizePrivateKey(value = '') {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function parseServiceAccount(settings = {}) {
  const json = settings.google_service_account_json || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      return null;
    }
  }
  const clientEmail = settings.google_service_account_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = settings.google_private_key || process.env.GOOGLE_PRIVATE_KEY || '';
  if (!clientEmail || !privateKey) return null;
  return {
    client_email: String(clientEmail).trim(),
    private_key: normalizePrivateKey(privateKey)
  };
}

function getSheetsId(settings = {}) {
  return String(settings.google_sheets_id || process.env.GOOGLE_SHEETS_ID || '').trim();
}

function googleConfigured(settings = {}) {
  return Boolean(getSheetsId(settings) && parseServiceAccount(settings));
}

async function getGoogleAccessToken(settings = {}) {
  const credentials = parseServiceAccount(settings);
  if (!credentials) throw new Error('Google service account credentials are missing');
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    exp: issuedAt + 3600,
    iat: issuedAt
  }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(credentials.private_key)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `Google token failed (${response.status})`);
  }
  return body.access_token;
}

async function sheetsRequest(settings, method, range, body, action = '') {
  const spreadsheetId = encodeURIComponent(getSheetsId(settings));
  const encodedRange = encodeURIComponent(range);
  const accessToken = await getGoogleAccessToken(settings);
  const suffix = method === 'PUT' ? '?valueInputOption=USER_ENTERED' : '';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}${action}${suffix}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(parsed.error?.message || `Google Sheets request failed (${response.status})`);
  }
  return parsed;
}

async function clearSheet(settings, sheetName) {
  return sheetsRequest(settings, 'POST', `'${sheetName}'!A:Z`, {}, ':clear');
}

async function writeSheet(settings, sheetName, rows) {
  await clearSheet(settings, sheetName);
  return sheetsRequest(settings, 'PUT', `'${sheetName}'!A1`, { values: rows });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function loadProjectData(dataDir) {
  const file = name => path.join(dataDir, name);
  return {
    orders: asArray(readJSON(file('orders.json'), [])),
    payments: asArray(readJSON(file('payments.json'), [])),
    customers: asArray(readJSON(file('customers.json'), [])),
    products: asArray(readJSON(file('products.json'), [])),
    sellerRates: asArray(readJSON(file('seller_rates.json'), [])),
    campaigns: asArray(readJSON(file('campaigns.json'), [])),
    logs: asArray(readJSON(file('logs.json'), []))
  };
}

function buildWorkbook(dataDir, queue, n8nBridge, buildDetailedReport) {
  const data = loadProjectData(dataDir);
  const detailed = typeof buildDetailedReport === 'function' ? buildDetailedReport(7) : {};
  const queueJobs = queue && typeof queue.getJobs === 'function' ? queue.getJobs({ limit: 200 }) : [];
  const n8nEvents = n8nBridge && typeof n8nBridge.getRecentEvents === 'function' ? n8nBridge.getRecentEvents(200) : [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    'Daily Report': [
      ['Date', 'Metric', 'Value'],
      [today, 'Orders Today', detailed.orders?.count || 0],
      [today, 'Revenue', detailed.orders?.revenue || 0],
      [today, 'Pending Orders', detailed.orders?.pending || 0],
      [today, 'Campaigns', detailed.campaigns?.count || 0],
      [today, 'Messages Recorded', detailed.messaging?.totals?.total || 0],
      [today, 'Safety Logs', detailed.safety?.sendsRecorded || 0]
    ],
    Orders: [
      ['Created', 'Order ID', 'Customer', 'Status', 'Total', 'Items'],
      ...data.orders.slice(-1000).reverse().map(row => [
        row.created || row.createdAt || row.updated || '',
        row.orderNumber || row.orderId || row.id || '',
        row.customerName || row.customer || row.customerNumber || row.number || '',
        row.status || '',
        money(row.total || row.sell_price || row.amount),
        Array.isArray(row.items) ? row.items.map(item => item.name || item.title || item.productId).filter(Boolean).join(', ') : ''
      ])
    ],
    Payments: [
      ['Created', 'Payment ID', 'Customer', 'Method', 'Amount', 'Status', 'Transaction'],
      ...data.payments.slice(-1000).reverse().map(row => [
        row.created || row.createdAt || row.date || '',
        row.id || row.paymentId || '',
        row.customerName || row.customerNumber || row.number || '',
        row.method || row.provider || '',
        money(row.amount),
        row.status || '',
        row.txnId || row.transactionId || row.reference || ''
      ])
    ],
    Customers: [
      ['Created', 'Name', 'Number', 'Status', 'Tags', 'Total Orders', 'Total Spent'],
      ...data.customers.slice(-1500).reverse().map(row => [
        row.created || row.createdAt || '',
        row.name || row.customerName || '',
        row.number || row.phone || row.whatsapp || '',
        row.status || '',
        Array.isArray(row.tags) ? row.tags.join(', ') : '',
        money(row.totalOrders),
        money(row.totalSpent)
      ])
    ],
    'Seller Rates': [
      ['Parsed At', 'Tool', 'Plan', 'Price', 'Seller', 'Number', 'Group'],
      ...data.sellerRates.slice(-1500).reverse().map(row => [
        row.createdAt || row.parsedAt || row.timestamp || '',
        row.tool || row.toolSlug || row.name || '',
        row.plan || row.planName || row.type || '',
        money(row.price || row.rate),
        row.sellerName || row.dealerName || row.name || '',
        row.number || row.dealerNumber || row.sender || '',
        row.groupName || row.groupId || ''
      ])
    ],
    Stock: [
      ['Product', 'Category', 'Price', 'Available', 'Stock', 'Updated'],
      ...data.products.slice(-1500).reverse().map(row => [
        row.name || row.title || '',
        row.category || row.type || '',
        money(row.price),
        row.available === false || row.stock === false ? 'NO' : 'YES',
        row.qty ?? row.quantity ?? row.stockQty ?? '',
        row.updated || row.updatedAt || row.created || ''
      ])
    ],
    Queue: [
      ['Created', 'Job ID', 'Type', 'Status', 'Attempts', 'Source', 'Error'],
      ...queueJobs.map(row => [
        row.createdAt || '',
        row.id || '',
        row.type || '',
        row.status || '',
        row.attempts || 0,
        row.source || '',
        row.error || ''
      ])
    ],
    'n8n Events': [
      ['Timestamp', 'Direction', 'Event', 'Status', 'Reason/Error'],
      ...n8nEvents.map(row => [
        row.timestamp || row.createdAt || '',
        row.direction || '',
        row.event || '',
        row.status || '',
        row.reason || row.error || ''
      ])
    ]
  };
}

function appendHistory(dataDir, row) {
  const file = path.join(dataDir, HISTORY_FILE);
  const rows = asArray(readJSON(file, []));
  rows.unshift({ id: row.id || `sync_${Date.now()}`, at: nowIso(), ...row });
  writeJSON(file, rows.slice(0, 300));
  return rows[0];
}

function createReportingConnectors({ dataDir, getSettings, queue, n8nBridge, buildDetailedReport }) {
  function settings() {
    return typeof getSettings === 'function' ? getSettings() || {} : {};
  }

  function enqueue(type, payload, source) {
    if (!queue || typeof queue.addJob !== 'function') return null;
    return queue.addJob(type, payload, { source: source || 'reporting_connectors' });
  }

  function getStatus() {
    const current = settings();
    const history = asArray(readJSON(path.join(dataDir, HISTORY_FILE), [])).slice(0, 25);
    const sheetsConfigured = googleConfigured(current);
    const n8nStatus = n8nBridge && typeof n8nBridge.getStatus === 'function' ? n8nBridge.getStatus() : {};
    return {
      success: true,
      checkedAt: nowIso(),
      googleSheets: {
        configured: sheetsConfigured,
        sheetsId: getSheetsId(current) ? 'configured' : '',
        serviceAccountConfigured: !!parseServiceAccount(current),
        mode: sheetsConfigured ? 'direct-google-rest' : 'queued-json-fallback'
      },
      n8n: {
        enabled: n8nStatus.enabled === true,
        baseUrl: n8nStatus.baseUrl || '',
        webhookSecretConfigured: !!n8nStatus.webhookSecretConfigured,
        mode: n8nStatus.enabled ? 'webhook' : 'queued-fallback'
      },
      queue: queue && typeof queue.getQueueHealth === 'function' ? queue.getQueueHealth() : null,
      recentHistory: history
    };
  }

  async function syncGoogleSheets(options = {}) {
    const current = settings();
    const workbook = buildWorkbook(dataDir, queue, n8nBridge, buildDetailedReport);
    const requestedSheet = String(options.sheet || 'all').trim();
    const selected = requestedSheet && requestedSheet !== 'all'
      ? Object.fromEntries(Object.entries(workbook).filter(([name]) => name.toLowerCase() === requestedSheet.toLowerCase()))
      : workbook;

    writeJSON(path.join(dataDir, EXPORT_FILE), {
      exportedAt: nowIso(),
      reason: 'local-fallback-copy',
      sheets: workbook
    });

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        configured: googleConfigured(current),
        sheets: Object.fromEntries(Object.entries(selected).map(([name, rows]) => [name, { rows: rows.length, preview: rows.slice(0, 5) }]))
      };
    }

    if (!googleConfigured(current)) {
      const job = options.fromQueue ? null : enqueue('report.sync.google_sheets', { sheet: requestedSheet, requestedAt: nowIso() }, options.source);
      const history = appendHistory(dataDir, {
        type: 'google_sheets',
        status: 'queued_fallback',
        reason: 'Google Sheets credentials missing',
        jobId: job?.id || '',
        exportFile: path.join(dataDir, EXPORT_FILE)
      });
      return { success: false, skipped: true, reason: 'Google Sheets not configured', queued: !!job, job, history };
    }

    const results = [];
    for (const [name, rows] of Object.entries(selected)) {
      const result = await writeSheet(current, name, rows);
      results.push({ sheet: name, rows: rows.length, result });
    }
    const history = appendHistory(dataDir, { type: 'google_sheets', status: 'synced', results });
    return { success: true, synced: results.length, results, history };
  }

  async function triggerN8nWorkflow(input = {}) {
    const event = String(input.event || 'dashboard_sync').trim() || 'dashboard_sync';
    const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
    const meta = { source: input.source || 'reporting_connectors', ...(input.meta || {}) };
    if (!n8nBridge || typeof n8nBridge.triggerWorkflow !== 'function') {
      const job = input.fromQueue ? null : enqueue('report.trigger.n8n', { event, payload, meta, requestedAt: nowIso() }, input.source);
      return { success: false, skipped: true, reason: 'n8n bridge unavailable', queued: !!job, job };
    }
    const result = await n8nBridge.triggerWorkflow(event, payload, meta);
    if (!result.success && !input.fromQueue) {
      const job = enqueue('report.trigger.n8n', { event, payload, meta, requestedAt: nowIso(), previousResult: result }, input.source);
      return { ...result, queued: !!job, job };
    }
    appendHistory(dataDir, { type: 'n8n', event, status: result.success ? 'sent' : 'skipped_or_failed', result });
    return result;
  }

  async function syncAll(options = {}) {
    const sheets = await syncGoogleSheets({ ...options, sheet: 'all' });
    const report = typeof buildDetailedReport === 'function' ? buildDetailedReport(7) : {};
    const n8n = await triggerN8nWorkflow({
      event: 'dashboard_sync',
      payload: {
        report: {
          orders: report.orders || {},
          campaigns: report.campaigns || {},
          messaging: report.messaging?.totals || {},
          generatedAt: nowIso()
        }
      },
      source: options.source || 'sync_all'
    });
    return {
      success: Boolean((sheets.success || sheets.skipped) && (n8n.success || n8n.skipped)),
      sheets,
      n8n
    };
  }

  async function processPendingJobs(options = {}) {
    if (!queue || typeof queue.getJobs !== 'function') return { success: false, error: 'Queue manager unavailable' };
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const jobs = queue.getJobs({ status: 'pending', limit: 500 })
      .filter(job => ['report.sync.google_sheets', 'report.trigger.n8n', 'report.sync.all'].includes(job.type))
      .slice(0, limit);
    const results = [];
    for (const job of jobs) {
      try {
        if (typeof queue.updateJob === 'function') queue.updateJob(job.id, { status: 'active' });
        let result;
        if (job.type === 'report.sync.google_sheets') {
          result = await syncGoogleSheets({ ...(job.payload || {}), fromQueue: true, source: 'queue_worker' });
        } else if (job.type === 'report.trigger.n8n') {
          result = await triggerN8nWorkflow({ ...(job.payload || {}), fromQueue: true, source: 'queue_worker' });
        } else {
          result = await syncAll({ ...(job.payload || {}), fromQueue: true, source: 'queue_worker' });
        }
        if (typeof queue.completeJob === 'function') queue.completeJob(job.id, result);
        results.push({ id: job.id, type: job.type, success: true, result });
      } catch (error) {
        if (typeof queue.failJob === 'function') queue.failJob(job.id, error.message);
        results.push({ id: job.id, type: job.type, success: false, error: error.message });
      }
    }
    return { success: true, processed: results.length, results };
  }

  return {
    getStatus,
    syncGoogleSheets,
    triggerN8nWorkflow,
    syncAll,
    processPendingJobs
  };
}

module.exports = {
  createReportingConnectors,
  googleConfigured,
  buildWorkbook
};
