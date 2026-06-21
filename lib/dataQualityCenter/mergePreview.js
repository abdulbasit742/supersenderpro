  'use strict';

  const redactor = require('./redactor');


  const LIVE_MERGE = String(process.env.DATA_QUALITY_LIVE_MERGE || 'false') === 'true';

  function completeness(record) {
      return Object.values(record || {}).filter((v) => v != null && String(v).trim() !== '').length;
  }

  // Pick the most complete record as the suggested survivor.
  function suggestSurvivor(records) {
    let best = null;
      let bestScore = -1;
      (records || []).forEach((r) => {
       const s = completeness(r);
       if (s > bestScore) { bestScore = s; best = r; }
      });
      return best;
  }

  function buildFieldPlan(records) {
    const survivor = suggestSurvivor(records) || {};
      const fields = new Set();
      records.forEach((r) => Object.keys(r || {}).forEach((k) => fields.add(k)));
      const plan = {};
      for (const f of fields) {
       const survivorVal = survivor[f];
       const conflicting = records
         .map((r) => r[f])
         .filter((v) => v != null && String(v).trim() !== '' && String(v) !== String(survivorVal));
       plan[f] = {
         keep: survivorVal != null ? survivorVal : (conflicting[0] != null ? conflicting[0] : null),
         conflicts: conflicting.length,
       };
      }
      return { survivorId: survivor.id != null ? survivor.id : null, fields: plan };
  }

  function buildPreview(records) {
    const list = Array.isArray(records) ? records : [];
      const fieldPlan = buildFieldPlan(list);
      return redactor.redactObject({
       generatedAt: new Date().toISOString(),
       mode: 'preview',
       liveMergeEnabled: LIVE_MERGE, // informational; merge is not implemented


     groupSize: list.length,
     memberIds: list.map((r) => r.id),
     suggestedSurvivorId: fieldPlan.survivorId,
     fieldResolution: fieldPlan.fields,
     note: 'PREVIEW ONLY. No merge is performed. Survivor is a suggestion for human review.',
   });
}

function applyMerge() {
   return { merged: false, reason: 'Live merge is disabled by design. This center is preview-only.' };
}

module.exports = { suggestSurvivor, buildFieldPlan, buildPreview, applyMerge, LIVE_MERGE };
