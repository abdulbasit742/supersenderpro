  'use strict';


  /** Approval Center — approver notification DRAFT (never sends). */

  const approvalService = require('./approvalService');
  const { maskActor } = require('./redactor');


  function build(requestId, channel, recipient) {
    const r = approvalService.getRaw(requestId);
      if (!r) return { ok: false, error: 'request not found' };
      const ch = ['whatsapp_preview', 'email_preview'].includes(channel) ? channel : 'whatsapp_preview';
    const message = `Approval needed: "${r.title}" (${r.requestType}, risk ${r.riskLevel}). Requested by
  ${r.requestedBySafe}. Review in Approval Center. (preview)`;
    return { ok: true, dryRun: true, liveSend: false, channel: ch, recipientMasked: recipient ? maskActor(recipient) :
  'approver', messagePreview: message, warnings: [], blockers: ['live_send_disabled'] };
  }


  module.exports = { build };
