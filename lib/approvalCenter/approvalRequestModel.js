  'use strict';


  /** Approval Center — request model vocab + builder. */

  const store = require('./store');
  const { maskActor } = require('./redactor');


  const REQUEST_TYPES = ['price_change_preview', 'discount_rule_preview', 'stock_adjustment_preview',
  'purchase_order_preview', 'vendor_bill_payment_preview', 'invoice_send_preview', 'refund_preview',
  'loyalty_credit_preview', 'report_export_preview', 'campaign_send_preview', 'whatsapp_broadcast_preview',
  'team_permission_change_preview', 'alert_action_preview', 'custom_change_preview'];
  const STATUSES = ['draft', 'pending_approval', 'approved_preview', 'rejected_preview', 'needs_more_info',
  'cancelled_preview', 'expired_preview'];
  const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
  const PRIORITIES = ['low', 'normal', 'high', 'urgent'];


  function build(input) {
    const i = input || {};
       const now = new Date().toISOString();
       return {
        id: store.genId('apr'),
        requestType: REQUEST_TYPES.includes(i.requestType) ? i.requestType : 'custom_change_preview',
        title: String(i.title || 'Change request').slice(0, 120),
        sourceModule: String(i.sourceModule || 'unknown').slice(0, 40),
        requestedBySafe: maskActor(i.requestedBy || 'maker'),
        approverSafe: i.approver ? maskActor(i.approver) : null,
        status: 'pending_approval',
        priority: PRIORITIES.includes(i.priority) ? i.priority : 'normal',
        riskLevel: RISK_LEVELS.includes(i.riskLevel) ? i.riskLevel : 'medium',
        beforePreview: i.before && typeof i.before === 'object' ? i.before : {},


         afterPreview: i.after && typeof i.after === 'object' ? i.after : {},
         reason: String(i.reason || '').slice(0, 300) || null,
         requiredApprovals: Math.max(1, Number(i.requiredApprovals) || 1),
         approvalsGiven: 0,
         dryRun: true,
         createdAt: now,
         updatedAt: now,
       };
  }

  module.exports = { REQUEST_TYPES, STATUSES, RISK_LEVELS, PRIORITIES, build };
