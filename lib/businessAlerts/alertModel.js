  'use strict';


  /** Business Alerts — alert model vocab + builder. */

  const store = require('./store');


  const CATEGORIES = ['finance', 'revenue', 'profit_loss', 'cashflow', 'inventory', 'products', 'sales', 'receivables',
  'payables', 'fulfillment', 'customers', 'marketing', 'loyalty', 'compliance', 'system_health'];
  const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
  const STATUSES = ['new', 'acknowledged_preview', 'in_review_preview', 'action_suggested_preview', 'resolved_preview',
  'dismissed_preview'];

  function build(input) {
       const i = input || {};
       const now = new Date().toISOString();
       return {
         id: store.genId('alr'),
         title: String(i.title || 'Alert').slice(0, 120),
         category: CATEGORIES.includes(i.category) ? i.category : 'finance',
         severity: SEVERITIES.includes(i.severity) ? i.severity : 'medium',
         sourceModule: String(i.sourceModule || 'unknown').slice(0, 40),
         signalKey: String(i.signalKey || '').slice(0, 60),
         summary: String(i.summary || '').slice(0, 300),
         detectedValuePreview: Number.isFinite(Number(i.detectedValue)) ? Number(i.detectedValue) : null,
         thresholdPreview: Number.isFinite(Number(i.threshold)) ? Number(i.threshold) : null,
         recommendedAction: String(i.recommendedAction || '').slice(0, 200) || null,
         status: 'new',
         dryRun: true,
         createdAt: now,
         updatedAt: now,
       };
  }


  module.exports = { CATEGORIES, SEVERITIES, STATUSES, build };
