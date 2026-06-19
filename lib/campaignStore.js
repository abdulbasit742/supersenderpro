'use strict';

/**
 * campaignStore.js
 * Lightweight JSON-backed persistence for SuperSender Pro campaigns.
 * No external DB required - stores under data/campaigns.json so it works
 * the same way as the rest of the file-based stores in this project.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR
  || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'campaigns.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ campaigns: [] }, null, 2));
  }
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const data = JSON.parse(raw || '{}');
    if (!Array.isArray(data.campaigns)) data.campaigns = [];
    return data;
  } catch (err) {
    // Corrupt file - never crash the server, fall back to empty store.
    return { campaigns: [] };
  }
}

function writeAll(data) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, STORE_FILE); // atomic-ish write to avoid partial reads
}

function newId() {
  return 'camp_' + crypto.randomBytes(8).toString('hex');
}

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients)) return [];
  return recipients
    .map((r) => {
      if (typeof r === 'string') {
        // Accept "number" or "number,name" string formats.
        const [to, ...rest] = r.split(',');
        return { to: (to || '').trim(), name: rest.join(',').trim() };
      }
      if (r && typeof r === 'object') {
        return { to: String(r.to || r.number || '').trim(), name: String(r.name || '').trim() };
      }
      return null;
    })
    .filter((r) => r && r.to);
}

function createCampaign(input = {}) {
  const data = readAll();
  const now = new Date().toISOString();
  const recipients = normalizeRecipients(input.recipients);
  const campaign = {
    id: newId(),
    name: String(input.name || 'Untitled campaign').slice(0, 200),
    message: String(input.message || ''),
    recipients,
    // scheduling
    status: input.scheduleAt ? 'scheduled' : 'draft',
    scheduleAt: input.scheduleAt || null, // ISO string, when to start
    // anti-ban throttling
    throttleMs: Math.max(0, parseInt(input.throttleMs, 10) || 2000),
    dailyCap: Math.max(0, parseInt(input.dailyCap, 10) || 0), // 0 = no cap
    // runtime
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    sentToday: 0,
    sentTodayDate: null,
    // per-recipient delivery log
    log: recipients.map((r) => ({
      to: r.to,
      name: r.name,
      status: 'pending', // pending | sent | delivered | read | failed
      attempts: 0,
      error: null,
      sentAt: null,
      updatedAt: now,
    })),
  };
  data.campaigns.push(campaign);
  writeAll(data);
  return campaign;
}

function listCampaigns() {
  return readAll().campaigns;
}

function getCampaign(id) {
  return readAll().campaigns.find((c) => c.id === id) || null;
}

function updateCampaign(id, patch = {}) {
  const data = readAll();
  const idx = data.campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  data.campaigns[idx] = {
    ...data.campaigns[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeAll(data);
  return data.campaigns[idx];
}

function deleteCampaign(id) {
  const data = readAll();
  const before = data.campaigns.length;
  data.campaigns = data.campaigns.filter((c) => c.id !== id);
  writeAll(data);
  return data.campaigns.length < before;
}

/** Update a single recipient log entry inside a campaign. */
function updateLogEntry(id, to, patch = {}) {
  const data = readAll();
  const c = data.campaigns.find((x) => x.id === id);
  if (!c) return null;
  const entry = c.log.find((l) => l.to === to);
  if (!entry) return null;
  Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
  c.updatedAt = new Date().toISOString();
  writeAll(data);
  return entry;
}

/** Aggregate delivery analytics for a single campaign. */
function campaignAnalytics(id) {
  const c = getCampaign(id);
  if (!c) return null;
  const counts = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const l of c.log) counts[l.status] = (counts[l.status] || 0) + 1;
  const total = c.log.length || 0;
  const done = counts.sent + counts.delivered + counts.read;
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    total,
    counts,
    deliveryRate: total ? +(done / total * 100).toFixed(1) : 0,
    failureRate: total ? +(counts.failed / total * 100).toFixed(1) : 0,
    progress: total ? +((done + counts.failed) / total * 100).toFixed(1) : 0,
    startedAt: c.startedAt,
    completedAt: c.completedAt,
  };
}

/** Aggregate analytics across every campaign for the dashboard. */
function summaryAnalytics() {
  const campaigns = listCampaigns();
  const totals = { campaigns: campaigns.length, recipients: 0, sent: 0, failed: 0, pending: 0 };
  for (const c of campaigns) {
    for (const l of c.log) {
      totals.recipients += 1;
      if (l.status === 'failed') totals.failed += 1;
      else if (l.status === 'pending') totals.pending += 1;
      else totals.sent += 1;
    }
  }
  totals.deliveryRate = totals.recipients
    ? +(totals.sent / totals.recipients * 100).toFixed(1) : 0;
  return totals;
}

module.exports = {
  STORE_FILE,
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  updateLogEntry,
  campaignAnalytics,
  summaryAnalytics,
  normalizeRecipients,
};
