'use strict';

/**
 * lib/webhookStore.js — outbound webhooks for developer integrations.
 * Subscribers receive HMAC-SHA256 signed POSTs when events fire
 * (e.g. campaign.completed, order.created, message.received).
 * Stored under data/webhooks.json. HTTP is injectable for offline testing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'webhooks.json');

let axios = null;
try { axios = require('axios'); } catch (_) {}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ webhooks: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try { const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}'); if (!Array.isArray(d.webhooks)) d.webhooks = []; return d; }
  catch { return { webhooks: [] }; }
}
function writeAll(d) { ensureStore(); const tmp = STORE_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, STORE_FILE); }
function id() { return 'wh_' + crypto.randomBytes(6).toString('hex'); }

const EVENTS = ['campaign.completed', 'order.created', 'message.received', 'channel.shared', 'connection.created'];

function listWebhooks() { return readAll().webhooks; }
function createWebhook(input = {}) {
  const d = readAll();
  const wh = {
    id: id(),
    url: String(input.url || ''),
    events: Array.isArray(input.events) && input.events.length ? input.events : ['*'],
    secret: input.secret || crypto.randomBytes(16).toString('hex'),
    active: input.active !== false,
    createdAt: new Date().toISOString(),
  };
  d.webhooks.push(wh); writeAll(d); return wh;
}
function updateWebhook(wid, patch = {}) {
  const d = readAll();
  const i = d.webhooks.findIndex((w) => w.id === wid);
  if (i === -1) return null;
  d.webhooks[i] = { ...d.webhooks[i], ...patch };
  writeAll(d); return d.webhooks[i];
}
function deleteWebhook(wid) { const d = readAll(); const n = d.webhooks.length; d.webhooks = d.webhooks.filter((w) => w.id !== wid); writeAll(d); return d.webhooks.length < n; }

function sign(secret, body) { return crypto.createHmac('sha256', secret).update(body).digest('hex'); }

async function defaultHttp(opts) {
  if (!axios) throw new Error('axios not available; inject http');
  const res = await axios({ method: 'POST', url: opts.url, headers: opts.headers, data: opts.data, timeout: 15000, validateStatus: () => true });
  return { status: res.status };
}

/** Dispatch an event to every active, subscribed webhook. */
async function dispatch(event, payload, http = defaultHttp) {
  const subs = listWebhooks().filter((w) => w.active && (w.events.includes('*') || w.events.includes(event)));
  const results = [];
  for (const w of subs) {
    const body = JSON.stringify({ event, payload, at: new Date().toISOString() });
    const headers = { 'Content-Type': 'application/json', 'X-SSP-Event': event, 'X-SSP-Signature': 'sha256=' + sign(w.secret, body) };
    try {
      const r = await http({ url: w.url, headers, data: body });
      results.push({ id: w.id, url: w.url, status: r.status, ok: r.status >= 200 && r.status < 300 });
    } catch (e) {
      results.push({ id: w.id, url: w.url, ok: false, error: e.message });
    }
  }
  return results;
}

module.exports = { STORE_FILE, EVENTS, listWebhooks, createWebhook, updateWebhook, deleteWebhook, dispatch, sign };
