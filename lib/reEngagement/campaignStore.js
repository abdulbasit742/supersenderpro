// lib/reEngagement/campaignStore.js — JSON-backed campaigns + send ledger (cooldown/cap).
const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.REENGAGE_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'reengagement');
const CAMPAIGN_FILE = path.join(DATA_DIR, 'campaigns.json');
const LEDGER_FILE = path.join(DATA_DIR, 'send_ledger.json');
function read(f, fb) { try { if (!fs.existsSync(f)) return fb; return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } }
function write(f, d) { try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); } catch {} }
function listCampaigns(storeId) { const all = read(CAMPAIGN_FILE, { campaigns: [] }).campaigns || []; return storeId ? all.filter((c) => c.storeId === storeId) : all; }
function saveCampaign(c) { const d = read(CAMPAIGN_FILE, { campaigns: [] }); d.campaigns = d.campaigns || []; const i = d.campaigns.findIndex((x) => x.id === c.id); if (i >= 0) d.campaigns[i] = c; else d.campaigns.unshift(c); if (d.campaigns.length > 500) d.campaigns = d.campaigns.slice(0, 500); write(CAMPAIGN_FILE, d); return c; }
function getCampaign(id) { return (read(CAMPAIGN_FILE, { campaigns: [] }).campaigns || []).find((c) => c.id === id) || null; }
function recordSends(storeId, phones, campaignId) { const d = read(LEDGER_FILE, { sends: {} }); d.sends = d.sends || {}; const now = new Date().toISOString(); for (const p of phones) d.sends[`${storeId}:${p}`] = { lastSentAt: now, campaignId }; write(LEDGER_FILE, d); }
function lastSentAt(storeId, phone) { const d = read(LEDGER_FILE, { sends: {} }); const r = (d.sends || {})[`${storeId}:${phone}`]; return r ? r.lastSentAt : null; }
function sentSince(storeId, sinceTs) { const d = read(LEDGER_FILE, { sends: {} }); let n = 0; for (const [k, r] of Object.entries(d.sends || {})) { if (!k.startsWith(`${storeId}:`)) continue; if (new Date(r.lastSentAt).getTime() >= sinceTs) n += 1; } return n; }
module.exports = { listCampaigns, saveCampaign, getCampaign, recordSends, lastSentAt, sentSince, DATA_DIR };
