'use strict';
/**
 * salesPipeline.js — CRM Feature #2: the sales pipeline (deals + stages).
 *
 * Customer 360 (#1) tells you WHO a customer is. The pipeline tracks the DEAL: where each
 * opportunity sits (lead -> qualified -> negotiation -> won/lost), its value, and how it moves. This
 * is where revenue is forecast and where "follow up" work comes from.
 *
 * Integrations:
 *   - Each deal links to a Customer 360 profile (by phone). Stage moves are recorded back on the 360
 *     timeline (injected recorder) so the profile shows the sales story too.
 *   - Open deals by stage power a weighted forecast.
 *
 * Storage: JSON (data/crm_deals.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'crm_deals.json');

// Default stages with win probability (%) for weighted forecast. Configurable.
let STAGES = [
  { id: 'lead',         name: 'Lead',         probability: 10 },
  { id: 'qualified',    name: 'Qualified',    probability: 30 },
  { id: 'negotiation',  name: 'Negotiation',  probability: 60 },
  { id: 'won',          name: 'Won',          probability: 100, terminal: true, win: true },
  { id: 'lost',         name: 'Lost',         probability: 0,   terminal: true, win: false }
];

// Optional: record stage changes back onto Customer 360. (profile, event) => void
let timelineRecorder = null;
function setTimelineRecorder(fn) { timelineRecorder = typeof fn === 'function' ? fn : null; }
function configureStages(stages) { if (Array.isArray(stages) && stages.length) STAGES = stages.slice(); return STAGES; }
function stageById(id) { return STAGES.find(s => s.id === id) || null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { deals: [] }; }
  catch { return { deals: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Create a deal.
 * @param {Object} opts { title, customerPhone, value, stage?, ownerId?, expectedCloseAt? }
 */
function createDeal(opts = {}) {
  if (!opts.title) throw new Error('deal needs a title');
  const stage = opts.stage && stageById(opts.stage) ? opts.stage : 'lead';
  const data = load();
  const deal = {
    id: `DEAL-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    title: opts.title,
    customerPhone: opts.customerPhone ? String(opts.customerPhone) : null,
    value: round2(opts.value || 0),
    stage,
    ownerId: opts.ownerId || null,
    expectedCloseAt: opts.expectedCloseAt || null,
    status: 'open',                 // open | won | lost
    history: [{ stage, at: nowIso() }],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  data.deals.push(deal);
  save(data);
  recordToTimeline(deal, `Deal created in ${stage}`);
  return deal;
}

function recordToTimeline(deal, text) {
  if (timelineRecorder && deal.customerPhone) {
    try { timelineRecorder(deal.customerPhone, { type: 'stage', text, ref: deal.id, at: nowIso() }); } catch { /* ignore */ }
  }
}

/** Move a deal to a new stage. Terminal stages set status won/lost. */
function moveDeal(dealId, toStage) {
  const st = stageById(toStage);
  if (!st) throw new Error(`unknown stage "${toStage}"`);
  const data = load();
  const deal = data.deals.find(d => d.id === dealId);
  if (!deal) return null;
  deal.stage = toStage;
  deal.history.push({ stage: toStage, at: nowIso() });
  if (st.terminal) deal.status = st.win ? 'won' : 'lost';
  else deal.status = 'open';
  deal.updatedAt = nowIso();
  save(data);
  recordToTimeline(deal, `Deal moved to ${st.name}`);
  return deal;
}

function updateDeal(dealId, patch = {}) {
  const data = load();
  const deal = data.deals.find(d => d.id === dealId);
  if (!deal) return null;
  for (const f of ['title', 'value', 'ownerId', 'expectedCloseAt']) {
    if (patch[f] !== undefined) deal[f] = f === 'value' ? round2(patch[f]) : patch[f];
  }
  deal.updatedAt = nowIso();
  save(data);
  return deal;
}

function getDeal(dealId) { return load().deals.find(d => d.id === dealId) || null; }
function listDeals(filter = {}) {
  let rows = load().deals;
  if (filter.stage) rows = rows.filter(d => d.stage === filter.stage);
  if (filter.status) rows = rows.filter(d => d.status === filter.status);
  if (filter.customerPhone) rows = rows.filter(d => d.customerPhone === String(filter.customerPhone));
  if (filter.ownerId) rows = rows.filter(d => d.ownerId === filter.ownerId);
  return rows;
}

/** Board view: deals grouped by stage with per-stage totals. */
function board() {
  const data = load();
  const cols = STAGES.map(s => ({ stage: s.id, name: s.name, probability: s.probability, deals: [], value: 0 }));
  const byId = Object.fromEntries(cols.map(c => [c.stage, c]));
  for (const d of data.deals) {
    const col = byId[d.stage];
    if (col) { col.deals.push(d); col.value = round2(col.value + d.value); }
  }
  return cols;
}

/**
 * Weighted forecast: sum of (open deal value * stage probability). Plus pipeline value and win rate.
 */
function forecast() {
  const data = load();
  let openValue = 0, weighted = 0, won = 0, lost = 0, wonValue = 0;
  for (const d of data.deals) {
    const st = stageById(d.stage);
    if (d.status === 'open') {
      openValue += d.value;
      weighted += d.value * ((st ? st.probability : 0) / 100);
    } else if (d.status === 'won') { won++; wonValue += d.value; }
    else if (d.status === 'lost') { lost++; }
  }
  const closed = won + lost;
  return {
    openPipelineValue: round2(openValue),
    weightedForecast: round2(weighted),
    wonCount: won,
    lostCount: lost,
    wonValue: round2(wonValue),
    winRatePct: closed ? Math.round((won / closed) * 1000) / 10 : 0
  };
}

module.exports = {
  configureStages,
  setTimelineRecorder,
  STAGES,
  createDeal,
  moveDeal,
  updateDeal,
  getDeal,
  listDeals,
  board,
  forecast
};
