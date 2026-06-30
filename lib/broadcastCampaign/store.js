'use strict';

const fs = require('fs');
const path = require('path');

// File-backed JSON store with mtime read-cache, tenant-scoped under data/broadcastCampaign/.
const ROOT = path.join(process.cwd(), 'data', 'broadcastCampaign');
const _cache = new Map(); // file -> { mtimeMs, data }

function tenantFile(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  const safe = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(ROOT, safe + '.json');
}

function ensureDir() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
}

function readAll(tenantId) {
  const file = tenantFile(tenantId);
  try {
    const stat = fs.statSync(file);
    const hit = _cache.get(file);
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw || '{"campaigns":[]}');
    _cache.set(file, { mtimeMs: stat.mtimeMs, data });
    return data;
  } catch (e) {
    return { campaigns: [] };
  }
}

function writeAll(tenantId, data) {
  ensureDir();
  const file = tenantFile(tenantId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  try {
    const stat = fs.statSync(file);
    _cache.set(file, { mtimeMs: stat.mtimeMs, data });
  } catch (e) { /* ignore */ }
  return data;
}

function listCampaigns(tenantId) {
  return readAll(tenantId).campaigns || [];
}

function getCampaign(tenantId, id) {
  return listCampaigns(tenantId).find((c) => c.id === id) || null;
}

function saveCampaign(tenantId, campaign) {
  const data = readAll(tenantId);
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) data.campaigns[idx] = campaign;
  else data.campaigns.push(campaign);
  writeAll(tenantId, data);
  return campaign;
}

module.exports = { listCampaigns, getCampaign, saveCampaign, readAll, writeAll };
