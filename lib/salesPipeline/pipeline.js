'use strict';
/**
 * lib/salesPipeline/pipeline.js - deal/lead lifecycle + stage transitions + metrics.
 * Stages: NEW_LEAD -> QUALIFIED -> NEGOTIATION -> PROPOSAL_SENT -> WON / LOST.
 */
const cfg = require('./config');
const { paths } = cfg;
const store = require('./store');
const followUps = require('./followUps');
const { nowISO, id } = require('./util');

const read = (tid) => store.readJSON(paths.deals(tid), { deals: [] });
const write = (tid, d) => store.writeJSON(paths.deals(tid), d);

function logHistory(tid, entry) {
  const h = store.readJSON(paths.history(tid), { history: [] });
  h.history.unshift(Object.assign({}, entry, { ts: nowISO() }));
  if (h.history.length > 5000) h.history = h.history.slice(0, 5000);
  store.writeJSON(paths.history(tid), h);
}

function decorate(deal) {
  const stage = cfg.stageById(deal.stage);
  return Object.assign({}, deal, { stageOpen: !!(stage && stage.open), stageLabel: stage ? stage.label : deal.stage });
}

function listDeals(tid, filter = {}) {
  let deals = read(tid).deals.map(decorate);
  if (filter.stage) deals = deals.filter((d) => d.stage === filter.stage);
  if (filter.open === true) deals = deals.filter((d) => d.stageOpen);
  if (filter.open === false) deals = deals.filter((d) => !d.stageOpen);
  if (filter.ownerId) deals = deals.filter((d) => d.ownerId === filter.ownerId);
  if (filter.q) {
    const q = String(filter.q).toLowerCase();
    deals = deals.filter((d) => (d.title || '').toLowerCase().includes(q)
      || (d.contact && (d.contact.name || '').toLowerCase().includes(q))
      || (d.contact && (d.contact.phone || '').includes(q)));
  }
  deals.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return deals;
}

function getDeal(tid, dealId) {
  const d = read(tid).deals.find((x) => x.id === dealId);
  return d ? decorate(d) : null;
}

function createDeal(tid, input = {}) {
  const data = read(tid);
  const stage = cfg.stageById(input.stage) ? input.stage : 'NEW_LEAD';
  const deal = {
    id: id('deal'), tenantId: tid,
    title: input.title || (input.contact && input.contact.name ? input.contact.name + ' - inquiry' : 'New lead'),
    contact: { phone: (input.contact && input.contact.phone) || input.phone || '', name: (input.contact && input.contact.name) || input.name || '' },
    stage, value: Number(input.value || 0), currency: input.currency || cfg.config.currency,
    source: input.source || 'whatsapp', ownerId: input.ownerId || null,
    items: Array.isArray(input.items) ? input.items : [], tags: Array.isArray(input.tags) ? input.tags : [],
    notes: [], quoteIds: [], outcome: null, lostReason: null,
    stageEnteredAt: nowISO(), lastActivityAt: nowISO(), createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.deals.push(deal);
  write(tid, data);
  logHistory(tid, { type: 'deal_created', dealId: deal.id, stage });
  followUps.scheduleForDeal(tid, decorate(deal));
  if (global.wsEvent) global.wsEvent('sales.deal_created', { tenantId: tid, dealId: deal.id, stage });
  return decorate(deal);
}

function updateDeal(tid, dealId, updates = {}) {
  const data = read(tid);
  const d = data.deals.find((x) => x.id === dealId);
  if (!d) return null;
  ['title', 'value', 'currency', 'source', 'ownerId', 'items', 'tags'].forEach((k) => {
    if (updates[k] !== undefined) d[k] = updates[k];
  });
  if (updates.contact) d.contact = Object.assign({}, d.contact, updates.contact);
  d.updatedAt = nowISO();
  write(tid, data);
  return decorate(d);
}

function moveStage(tid, dealId, toStage, meta = {}) {
  const target = cfg.stageById(toStage);
  if (!target) throw new Error('Unknown stage: ' + toStage);
  const data = read(tid);
  const d = data.deals.find((x) => x.id === dealId);
  if (!d) throw new Error('deal not found');
  const from = d.stage;
  d.stage = target.id;
  d.stageEnteredAt = nowISO();
  d.updatedAt = nowISO();
  d.lastActivityAt = nowISO();
  if (target.terminal) {
    d.outcome = target.outcome;
    if (target.outcome === 'lost') d.lostReason = meta.reason || meta.lostReason || '';
    if (target.outcome === 'won') d.wonAt = nowISO();
    followUps.cancelForDeal(tid, dealId);
  }
  write(tid, data);
  logHistory(tid, { type: 'stage_change', dealId, from, to: target.id, outcome: d.outcome || null });
  if (!target.terminal) followUps.scheduleForDeal(tid, decorate(d));
  if (global.wsEvent) global.wsEvent('sales.stage_change', { tenantId: tid, dealId, from, to: target.id });
  return decorate(d);
}

function recordActivity(tid, dealId, note) {
  const data = read(tid);
  const d = data.deals.find((x) => x.id === dealId);
  if (!d) return null;
  d.lastActivityAt = nowISO();
  d.stageEnteredAt = nowISO();
  d.updatedAt = nowISO();
  if (note) { d.notes.unshift({ text: String(note), ts: nowISO() }); if (d.notes.length > 50) d.notes = d.notes.slice(0, 50); }
  write(tid, data);
  followUps.scheduleForDeal(tid, decorate(d));
  return decorate(d);
}

function addNote(tid, dealId, text, by = 'owner') {
  const data = read(tid);
  const d = data.deals.find((x) => x.id === dealId);
  if (!d) return null;
  d.notes.unshift({ text: String(text || ''), by, ts: nowISO() });
  if (d.notes.length > 50) d.notes = d.notes.slice(0, 50);
  d.updatedAt = nowISO();
  write(tid, data);
  return decorate(d);
}

function attachQuote(tid, dealId, quoteId) {
  const data = read(tid);
  const d = data.deals.find((x) => x.id === dealId);
  if (!d) return null;
  d.quoteIds = Array.from(new Set([...(d.quoteIds || []), quoteId]));
  d.updatedAt = nowISO();
  write(tid, data);
  return decorate(d);
}

function metrics(tid) {
  const deals = read(tid).deals;
  const byStage = {};
  cfg.stages.forEach((s) => { byStage[s.id] = { count: 0, value: 0, label: s.label }; });
  let openValue = 0, wonValue = 0, won = 0, lost = 0;
  deals.forEach((d) => {
    if (!byStage[d.stage]) byStage[d.stage] = { count: 0, value: 0, label: d.stage };
    byStage[d.stage].count += 1;
    byStage[d.stage].value += Number(d.value || 0);
    const st = cfg.stageById(d.stage);
    if (st && st.open) openValue += Number(d.value || 0);
    if (d.outcome === 'won') { won += 1; wonValue += Number(d.value || 0); }
    if (d.outcome === 'lost') lost += 1;
  });
  const closed = won + lost;
  return {
    totalDeals: deals.length, byStage,
    openPipelineValue: openValue, wonValue, won, lost,
    winRate: closed ? Math.round((won / closed) * 100) : 0,
    currency: cfg.config.currency,
  };
}

module.exports = {
  listDeals, getDeal, createDeal, updateDeal, moveStage, recordActivity,
  addNote, attachQuote, metrics, logHistory,
};
