// lib/reEngagement/campaignStore.js
// Tiny JSON-backed store for re-engagement campaigns + a send ledger.
// Mirrors the defensive style of txnStore/queueManager: never throws, JSON file
// is the source of truth so the dashboard works with or without Redis.
//
// The ledger powers two safety rails:
//   1. per-customer cooldown (don't re-message someone we just messaged)
//   2. daily send cap accounting

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.REENGAGE_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'reengagement');
const CAMPAIGN_FILE = path.join(DATA_DIR, 'campaigns.json');
const LEDGER_FILE = path.join(DATA_DIR, 'send_ledger.json');

function read(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function write(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    /* best-effort */
  }
}

function listCampaigns(storeId) {
  const all = read(CAMPAIGN_FILE, { campaigns: [] }).campaigns || [];
  return storeId ? all.filter((c) => c.storeId === storeId) : all;
}

function saveCampaign(campaign) {
  const data = read(CAMPAIGN_FILE, { campaigns: [] });
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) data.campaigns[idx] = campaign;
  else data.campaigns.unshift(campaign);
  if (data.campaigns.length > 500) data.campaigns = data.campaigns.slice(0, 500);
  write(CAMPAIGN_FILE, data);
  return campaign;
}

function getCampaign(id) {
  return (read(CAMPAIGN_FILE, { campaigns: [] }).campaigns || []).find((c) => c.id === id) || null;
}

// --- Send ledger ------------------------------------------------------------
function recordSends(storeId, phones, campaignId) {
  const data = read(LEDGER_FILE, { sends: {} });
  data.sends = data.sends || {};
  const now = new Date().toISOString();
  for (const phone of phones) {
    data.sends[`${storeId}:${phone}`] = { lastSentAt: now, campaignId };
  }
  write(LEDGER_FILE, data);
}

function lastSentAt(storeId, phone) {
  const data = read(LEDGER_FILE, { sends: {} });
  const rec = (data.sends || {})[`${storeId}:${phone}`];
  return rec ? rec.lastSentAt : null;
}

function sentSince(storeId, sinceTs) {
  const data = read(LEDGER_FILE, { sends: {} });
  let n = 0;
  for (const [key, rec] of Object.entries(data.sends || {})) {
    if (!key.startsWith(`${storeId}:`)) continue;
    if (new Date(rec.lastSentAt).getTime() >= sinceTs) n += 1;
  }
  return n;
}

module.exports = { listCampaigns, saveCampaign, getCampaign, recordSends, lastSentAt, sentSince, DATA_DIR };
