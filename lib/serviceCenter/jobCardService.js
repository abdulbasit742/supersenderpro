// lib/serviceCenter/jobCardService.js
// Job card read + preview-mutation orchestration. NEVER writes live.
'use strict';


const store = require('./store');
const model = require('./jobCardModel');
const { redact } = require('./redactor');

const FLAGS = {
     dryRun: process.env.SERVICE_CENTER_DRY_RUN !== 'false',
     liveCompletion: false
};

function list(filter = {}) {
  let rows = store.jobCards.slice();
     if (filter.workOrderId) rows = rows.filter((j) => j.workOrderId === filter.workOrderId);
     if (filter.tech) rows = rows.filter((j) => j.techId === filter.tech);
     if (filter.status) rows = rows.filter((j) => j.status === filter.status);
     return rows.map((j) => redact({ ...j, partsCost: model.partsCost(j) }));
}

function get(jcId) {
  const jc = store.getJobCard(jcId);
     if (!jc) return null;
     return redact({ ...jc, partsCost: model.partsCost(jc) });
}

function createPreview(payload) {
  const v = model.validate(payload);
     if (!v.ok) return { ok: false, errors: v.errors };
     const wo = store.getWorkOrder(payload.workOrderId);
     if (!wo) return { ok: false, errors: ['work order not found: ' + payload.workOrderId] };
     const draft = model.normalize(payload);
     return {
       ok: true,
       dryRun: FLAGS.dryRun,
       wouldCreate: redact({ id: store.id('jc'), ref: 'JC-PREVIEW', ...draft, partsCost: model.partsCost(draft) }),
       note: 'Preview only. No job card persisted.'
     };
}


function completePreview(jcId) {
  const jc = store.getJobCard(jcId);
     if (!jc) return { ok: false, errors: ['job card not found'] };
     return {
       ok: true,
       dryRun: FLAGS.dryRun,
       blockedByLiveFlag: !FLAGS.liveCompletion,
       wouldComplete: { ref: jc.ref, partsCost: model.partsCost(jc), laborHours: jc.laborHours },


     note: 'Preview only. Job card NOT completed. Live completion disabled.'
   };
}


module.exports = { FLAGS, list, get, createPreview, completePreview };
