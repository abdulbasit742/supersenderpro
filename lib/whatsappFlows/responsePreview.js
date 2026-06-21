 'use strict';
 /**

  * responsePreview.js — preview-only analytics over captured responses: completion
  * counts per flow + a masked sample. No real customer data leaves masked.
  */
 const responseStore = require('./responseStore');
 function overview(flows) {
   const all = responseStore.list(null, 1000);
   const byFlow = {};
   all.forEach((r) => { byFlow[r.flowId] = (byFlow[r.flowId] || 0) + 1; });
   return {
     ok: true, dryRun: true,
     totalResponsesPreview: all.length,
     perFlowPreview: (flows || []).map((f) => ({ flowId: f.id, name: f.name, responsesPreview: byFlow[f.id] || 0 })),
     recentSampleMasked: all.slice(0, 10),
     note: 'Preview values only; answers masked.',
   };
 }
 module.exports = { overview };
