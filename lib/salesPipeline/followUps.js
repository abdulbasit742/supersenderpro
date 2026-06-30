'use strict';
/**
 * lib/salesPipeline/followUps.js - auto follow-up scheduling + due processing.
 * Schedules are derived from config.followUpCadenceHours relative to stage entry.
 * Safe: when config.dryRun is true (default), messages are PREPARED, not sent.
 */
const cfg = require('./config');
const { paths, config } = cfg;
const store = require('./store');
const ai = require('./aiCopy');
const { nowISO, id } = require('./util');

const read = (tid) => store.readJSON(paths.followups(tid), { followups: [] });
const write = (tid, d) => store.writeJSON(paths.followups(tid), d);

function scheduleForDeal(tid, deal) {
  if (!deal || !deal.id) return [];
  const data = read(tid);
  data.followups = data.followups.filter((f) => !(f.dealId === deal.id && f.status === 'pending'));
  const stage = cfg.stageById(deal.stage);
  if (stage && stage.terminal) { write(tid, data); return []; }
  const created = [];
  const base = new Date(deal.stageEnteredAt || deal.updatedAt || nowISO()).getTime();
  config.followUpCadenceHours.forEach((h, step) => {
    const fu = {
      id: id('fu'), tenantId: tid, dealId: deal.id, phone: deal.contact && deal.contact.phone,
      stage: deal.stage, step, status: 'pending',
      scheduledAt: new Date(base + h * 3600000).toISOString(), createdAt: nowISO(),
    };
    data.followups.push(fu); created.push(fu);
  });
  write(tid, data);
  return created;
}

function cancelForDeal(tid, dealId) {
  const data = read(tid);
  let n = 0;
  data.followups.forEach((f) => { if (f.dealId === dealId && f.status === 'pending') { f.status = 'cancelled'; f.cancelledAt = nowISO(); n++; } });
  write(tid, data);
  return n;
}

function listDue(tid, atISO) {
  const at = atISO || nowISO();
  return read(tid).followups.filter((f) => f.status === 'pending' && f.scheduledAt <= at);
}

async function processDue(tid, pipeline) {
  const data = read(tid);
  const at = nowISO();
  const due = data.followups.filter((f) => f.status === 'pending' && f.scheduledAt <= at);
  const prepared = [];
  for (const f of due) {
    const deal = pipeline ? pipeline.getDeal(tid, f.dealId) : null;
    if (!deal || !deal.stageOpen) { f.status = 'skipped'; f.skippedAt = at; continue; }
    const message = await ai.followUpCopy(deal, f.step);
    f.message = message;
    let sent = false;
    if (!config.dryRun && typeof global.sendWhatsApp === 'function' && f.phone) {
      try { await global.sendWhatsApp(f.phone, message, { tenantId: tid, source: 'sales_pipeline_followup' }); sent = true; } catch { sent = false; }
    }
    f.status = sent ? 'sent' : (config.dryRun ? 'prepared' : 'failed');
    f[sent ? 'sentAt' : 'preparedAt'] = at;
    prepared.push({ id: f.id, dealId: f.dealId, step: f.step, status: f.status, message });
    if (global.wsEvent) global.wsEvent('sales.followup', { tenantId: tid, dealId: f.dealId, status: f.status });
  }
  write(tid, data);
  return { dryRun: config.dryRun, count: prepared.length, prepared };
}

function listForDeal(tid, dealId) {
  return read(tid).followups.filter((f) => f.dealId === dealId);
}

module.exports = { scheduleForDeal, cancelForDeal, listDue, processDue, listForDeal };
