// lib/kpiDigest/kpiDigest.js
// Feature #116 - Scheduled KPI Digest & CSV Exporter
// Deterministic core: rolls up sales/ops KPIs from existing feature stores and
// emits a digest payload + CSV. A cron-style scheduler triggers it on an interval.
// AI (self-hosted Ollama, cloud fallback) only writes a one-line headline narrative.
// Works fully with NO model. ZERO new npm deps. server.js untouched.

'use strict';

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch (_) { aiBrain = null; }

const DATA_DIR = path.join(process.cwd(), 'data', 'kpiDigest');

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('kpiDigest: tenantId is required');
  }
  return tenantId;
}

function storeDir(tenantId) {
  return path.join(DATA_DIR, requireTenant(tenantId));
}

function readJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (_) { return fallback; }
}

// ---- KPI sources -------------------------------------------------------
// We pull from sibling feature stores when present. Every source is optional;
// a missing store simply contributes zero. This keeps the digest resilient.
function loadSourceArray(relDir, tenantId) {
  const dir = path.join(process.cwd(), 'data', relDir, tenantId);
  const out = [];
  try {
    if (!fs.existsSync(dir)) return out;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const v = readJsonSafe(path.join(dir, f), null);
      if (Array.isArray(v)) out.push(...v);
      else if (v && typeof v === 'object') out.push(v);
    }
  } catch (_) {}
  return out;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function withinWindow(ts, sinceMs) {
  const t = typeof ts === 'number' ? ts : Date.parse(ts || '');
  return Number.isFinite(t) && t >= sinceMs;
}

// ---- Core rollup -------------------------------------------------------
function computeKpis(tenantId, opts) {
  requireTenant(tenantId);
  opts = opts || {};
  const windowHours = num(opts.windowHours) || 24;
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const sinceMs = now - windowHours * 3600 * 1000;

  const orders = loadSourceArray('orders', tenantId).filter(o => withinWindow(o.createdAt || o.ts, sinceMs));
  const carts = loadSourceArray('cartRecovery', tenantId);
  const leads = loadSourceArray('leadIntel', tenantId).filter(l => withinWindow(l.createdAt || l.ts, sinceMs));
  const convos = loadSourceArray('supportAgent', tenantId).filter(c => withinWindow(c.ts, sinceMs));

  const revenue = orders.reduce((s, o) => s + num(o.total || o.amount), 0);
  const orderCount = orders.length;
  const aov = orderCount ? Math.round((revenue / orderCount) * 100) / 100 : 0;
  const openCarts = carts.filter(c => (c.status || 'open') === 'open').length;
  const newLeads = leads.length;
  const handled = convos.length;
  const escalated = convos.filter(c => c.escalated === true).length;
  const deflectRate = handled ? Math.round(((handled - escalated) / handled) * 1000) / 10 : 0;

  return {
    tenantId,
    windowHours,
    generatedAt: new Date(now).toISOString(),
    kpis: {
      revenue: Math.round(revenue * 100) / 100,
      orders: orderCount,
      avgOrderValue: aov,
      openCarts,
      newLeads,
      conversationsHandled: handled,
      escalations: escalated,
      deflectionRatePct: deflectRate
    }
  };
}

function toCsv(digest) {
  const k = digest.kpis;
  const rows = [
    ['metric', 'value'],
    ['window_hours', digest.windowHours],
    ['generated_at', digest.generatedAt],
    ['revenue', k.revenue],
    ['orders', k.orders],
    ['avg_order_value', k.avgOrderValue],
    ['open_carts', k.openCarts],
    ['new_leads', k.newLeads],
    ['conversations_handled', k.conversationsHandled],
    ['escalations', k.escalations],
    ['deflection_rate_pct', k.deflectionRatePct]
  ];
  return rows.map(r => r.map(c => {
    const s = String(c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n') + '\n';
}

function deterministicHeadline(digest) {
  const k = digest.kpis;
  return `Last ${digest.windowHours}h: PKR ${k.revenue} across ${k.orders} orders (AOV ${k.avgOrderValue}). ` +
    `${k.newLeads} new leads, ${k.openCarts} carts open, ${k.deflectionRatePct}% auto-deflected.`;
}

async function narrate(digest) {
  const base = deterministicHeadline(digest);
  if (!aiBrain || typeof aiBrain.processPrompt !== 'function') return base;
  try {
    const prompt = `Rewrite this WhatsApp business KPI summary in ONE upbeat sentence, keep the numbers exact:\n${base}`;
    const out = await aiBrain.processPrompt(prompt, { maxTokens: 120, temperature: 0.3 });
    const text = (out && (out.text || out.content || out)) || '';
    const clean = String(text).trim();
    return clean ? clean.split('\n')[0].slice(0, 400) : base;
  } catch (_) { return base; }
}

async function buildDigest(tenantId, opts) {
  const digest = computeKpis(tenantId, opts);
  digest.headline = await narrate(digest);
  digest.csv = toCsv(digest);
  return digest;
}

function persistDigest(tenantId, digest) {
  const dir = storeDir(tenantId);
  ensureDir(dir);
  const stamp = digest.generatedAt.replace(/[:.]/g, '-');
  const jsonFile = path.join(dir, `digest-${stamp}.json`);
  const csvFile = path.join(dir, `digest-${stamp}.csv`);
  try { fs.writeFileSync(jsonFile, JSON.stringify(digest, null, 2)); } catch (_) {}
  try { fs.writeFileSync(csvFile, digest.csv); } catch (_) {}
  return { jsonFile, csvFile };
}

// ---- Scheduler ---------------------------------------------------------
// Lightweight in-process cron (no deps). Registers tenants and fires a callback
// on an interval. Default = every 24h. Safe to start/stop; survives missing AI.
const _timers = new Map();

function scheduleDigest(tenantId, opts) {
  requireTenant(tenantId);
  opts = opts || {};
  const everyMs = num(opts.everyMs) || 24 * 3600 * 1000;
  stopSchedule(tenantId);
  const tick = async () => {
    try {
      const digest = await buildDigest(tenantId, opts);
      const files = persistDigest(tenantId, digest);
      if (typeof opts.onDigest === 'function') {
        try { await opts.onDigest(digest, files); } catch (_) {}
      }
    } catch (_) {}
  };
  const handle = setInterval(tick, everyMs);
  if (handle && typeof handle.unref === 'function') handle.unref();
  _timers.set(tenantId, handle);
  if (opts.runNow) { tick(); }
  return { tenantId, everyMs };
}

function stopSchedule(tenantId) {
  const h = _timers.get(tenantId);
  if (h) { clearInterval(h); _timers.delete(tenantId); return true; }
  return false;
}

function listSchedules() {
  return Array.from(_timers.keys());
}

module.exports = {
  computeKpis,
  toCsv,
  deterministicHeadline,
  buildDigest,
  persistDigest,
  scheduleDigest,
  stopSchedule,
  listSchedules
};
