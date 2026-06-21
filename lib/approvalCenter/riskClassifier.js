  'use strict';


  /**
      * Approval Center — risk classifier.
      *
      * Derives a risk level from request type + magnitude of the change.
      */

  const HIGH_RISK_TYPES = new Set(['vendor_bill_payment_preview', 'refund_preview', 'team_permission_change_preview',
  'whatsapp_broadcast_preview', 'campaign_send_preview', 'report_export_preview']);
  const CRITICAL_TYPES = new Set(['team_permission_change_preview']);

  function classify(input) {
       const i = input || {};
       let level = 'low';
       const value = Number(i.value) || 0;
       const pct = Math.abs(Number(i.changePct) || 0);

       if (value >= 100000 || pct >= 30) level = 'high';
       else if (value >= 20000 || pct >= 10) level = 'medium';

       if (HIGH_RISK_TYPES.has(i.requestType) && level === 'low') level = 'medium';
       if (HIGH_RISK_TYPES.has(i.requestType) && (value >= 50000 || pct >= 20)) level = 'high';
    if (CRITICAL_TYPES.has(i.requestType) || (i.requestType === 'vendor_bill_payment_preview' && value >= 100000)) level =
  'critical';


       return level;
  }


  module.exports = { classify, HIGH_RISK_TYPES, CRITICAL_TYPES };
