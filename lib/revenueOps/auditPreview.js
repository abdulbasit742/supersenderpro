// lib/revenueOps/auditPreview.js — masked, read-only audit preview. No raw audit/PII.
'use strict';
const { maskName } = require('./redactor');

function auditPreview() {
  const now = new Date().toISOString();
  return [
    { ts: now, actorPreview: maskName('Bilal Khan'), action: 'view_pipeline_dashboard_preview', target: 'revenue-ops', result: 'ok_preview' },
    { ts: now, actorPreview: maskName('Ayesha Ali'), action: 'run_deal_score_preview', target: 'opp_demo_****', result: 'ok_preview' },
    { ts: now, actorPreview: maskName('System'), action: 'forecast_preview_generated', target: 'pipeline', result: 'ok_preview' },
  ];
}
module.exports = { auditPreview };
