// lib/serviceCenter/workOrderService.js
// Read + preview-mutation orchestration for work orders. NEVER writes live.
'use strict';


const store = require('./store');
const model = require('./workOrderModel');
const { redact } = require('./redactor');

const FLAGS = {
     dryRun: process.env.SERVICE_CENTER_DRY_RUN !== 'false', // default true
     liveActionsEnabled: process.env.SERVICE_CENTER_LIVE === 'true', // default false
     liveCompletion: false
};

function list(filter = {}) {
     let rows = store.workOrders.slice();
     if (filter.status) rows = rows.filter((w) => w.status === filter.status);
     if (filter.zone) rows = rows.filter((w) => w.zone === filter.zone);
     if (filter.priority) rows = rows.filter((w) => w.priority === filter.priority);
     if (filter.tech) rows = rows.filter((w) => w.assignedTech === filter.tech);
     return rows.map(redact);
}


function get(woId) {
  const wo = store.getWorkOrder(woId);
     if (!wo) return null;
     const cards = store.jobCardsForWorkOrder(wo.id);
     return redact({ ...wo, jobCards: cards });
}

function createPreview(payload) {
     const v = model.validate(payload);
     if (!v.ok) return { ok: false, errors: v.errors };
     const draft = model.normalize(payload);
     return {
         ok: true,
         dryRun: FLAGS.dryRun,
         wouldCreate: redact({ id: store.id('wo'), ref: 'WO-PREVIEW', ...draft }),
         note: 'Preview only. No work order persisted.'
     };
}

function transitionPreview(woId, toStatus) {
     const wo = store.getWorkOrder(woId);
     if (!wo) return { ok: false, errors: ['work order not found'] };
     const allowed = model.nextStatuses(wo.status);
     if (!allowed.includes(toStatus)) {
         return { ok: false, errors: ['cannot move ' + wo.status + ' -> ' + toStatus], allowed };
     }


   return {
     ok: true,
     dryRun: FLAGS.dryRun,
     wouldTransition: { ref: wo.ref, from: wo.status, to: toStatus },
     blockedByLiveFlag: toStatus === 'completed' && !FLAGS.liveCompletion,
     note: 'Preview only. Status unchanged.'
   };
}

function slaSummary() {
 const now = Date.now();
   const open = store.workOrders.filter((w) => !['closed', 'cancelled', 'completed'].includes(w.status));
   const breached = open.filter((w) => w.slaDueAt && w.slaDueAt < now);
   const atRisk = open.filter((w) => w.slaDueAt && w.slaDueAt >= now && w.slaDueAt - now < 86400000);
   return {
     openCount: open.length,
     breached: breached.map((w) => ({ ref: w.ref, overdueHours: Math.round((now - w.slaDueAt) / 3600000) })),
     atRisk: atRisk.map((w) => ({ ref: w.ref, dueInHours: Math.round((w.slaDueAt - now) / 3600000) }))
   };
}

module.exports = { FLAGS, list, get, createPreview, transitionPreview, slaSummary };
