// lib/reEngagement/engine.js
// The core: turn churn predictions + CRM segments into a concrete, rendered,
// safety-checked win-back batch. Pure-ish: it reads data via the modules it
// orchestrates but performs NO sends itself — planning and execution are split
// so the dashboard can preview a plan before anything goes out.

const crypto = require('crypto');
const storeCRM = require('../storeCRM');
const { renderMergeFields } = require('../mergeFields');
const churnModel = require('../analyticsInsights/churnModel');
const { TEMPLATES, LOYALTY_PERK, pickTemplate } = require('./templates');
const ledger = require('./campaignStore');

const DAY = 86400000;

function cfg() {
  return {
    live: String(process.env.REENGAGE_LIVE || 'false').toLowerCase() === 'true',
    dailyCap: Number(process.env.REENGAGE_DAILY_CAP || 50),
    cooldownDays: Number(process.env.REENGAGE_COOLDOWN_DAYS || 14),
    minRisk: Number(process.env.REENGAGE_MIN_RISK || 40), // skip low-risk
  };
}

function newId() {
  try { if (crypto.randomUUID) return 're_' + crypto.randomUUID().slice(0, 12); } catch {}
  return 're_' + crypto.randomBytes(8).toString('hex');
}

// Build the candidate list for a store, newest churn signal first.
function candidates(storeId, now = Date.now()) {
  const customers = storeCRM.getAllCustomers(storeId) || [];
  if (!customers.length) return [];
  const scored = churnModel.buildScores(customers, now);
  // Everyone at/above the min risk, highest revenue-at-risk first.
  return scored.topRisk
    .concat(scored.saveList)
    .filter((s, i, arr) => arr.findIndex((x) => x.phone === s.phone) === i); // dedupe
}

function eligibility(storeId, cand, conf, now) {
  if (cand.churnRisk < conf.minRisk) return { ok: false, reason: 'below min risk' };
  if (cand.band === 'low') return { ok: false, reason: 'low band' };
  const customer = storeCRM.getCustomer(storeId, cand.phone) || {};
  if (customer.promoOptIn === false) return { ok: false, reason: 'opted out' };
  if (customer.status === 'blocked') return { ok: false, reason: 'blocked' };
  const last = ledger.lastSentAt(storeId, cand.phone);
  if (last && now - new Date(last).getTime() < conf.cooldownDays * DAY) {
    return { ok: false, reason: 'cooldown' };
  }
  return { ok: true, customer };
}

function buildMessage(storeId, cand, customer, settings) {
  const templateKey = pickTemplate({
    band: cand.band,
    frequency: cand.frequency,
    monetary: cand.monetary,
    kind: cand.kind,
  });
  const tpl = TEMPLATES[templateKey];
  const context = {
    settings: settings || {},
    customer,
    vars: {
      name: cand.name || customer.name || 'Customer',
      loyalty_perk: LOYALTY_PERK[cand.band] || LOYALTY_PERK.medium,
    },
  };
  return { templateKey, templateLabel: tpl.label, text: renderMergeFields(tpl.body, context) };
}

/**
 * Plan a win-back batch. Returns a campaign object WITHOUT sending anything.
 * `settings` is the store settings blob (for merge fields like business name).
 */
function planCampaign(storeId = 'default_store', settings = {}, now = Date.now()) {
  const conf = cfg();
  const sentToday = ledger.sentSince(storeId, startOfDay(now));
  let budget = Math.max(0, conf.dailyCap - sentToday);

  const targets = [];
  const skipped = [];
  for (const cand of candidates(storeId, now)) {
    const elig = eligibility(storeId, cand, conf, now);
    if (!elig.ok) { skipped.push({ phone: mask(cand.phone), reason: elig.reason }); continue; }
    if (budget <= 0) { skipped.push({ phone: mask(cand.phone), reason: 'daily cap reached' }); continue; }
    const msg = buildMessage(storeId, cand, elig.customer, settings);
    targets.push({
      phone: cand.phone,
      name: cand.name || '',
      band: cand.band,
      churnRisk: cand.churnRisk,
      revenueAtRisk: cand.revenueAtRisk,
      recencyDays: cand.recencyDays,
      reasons: cand.reasons || [],
      templateKey: msg.templateKey,
      message: msg.text,
    });
    budget -= 1;
  }

  return {
    id: newId(),
    storeId,
    createdAt: new Date(now).toISOString(),
    status: 'planned', // planned | queued | sent | cancelled
    mode: conf.live ? 'live' : 'dry-run',
    config: conf,
    summary: {
      targeted: targets.length,
      skipped: skipped.length,
      revenueAtRiskTargeted: round(targets.reduce((s, t) => s + (t.revenueAtRisk || 0), 0)),
      sentToday,
      dailyCap: conf.dailyCap,
    },
    targets,
    skipped: skipped.slice(0, 100),
  };
}

// --- helpers ----------------------------------------------------------------
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function mask(phone) {
  const s = String(phone || '');
  return s.length > 5 ? s.slice(0, 4) + '****' + s.slice(-2) : '****';
}

module.exports = { planCampaign, candidates, cfg, mask };
