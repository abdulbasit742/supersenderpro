  'use strict';
  /**
   * supportRequestPreview.js — previews a supplier support request. NEVER creates a
   * live ticket. liveTicketCreation:false + previewOnly:true. Masks contact.
   */
  const service = require('./supplierPortalService');
  function preview(previewToken, input) {
    const s = service.getByToken(previewToken);
    const i = input || {};
    const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true,
  liveTicketCreation: false, warnings: [], blockers: [] };
    if (!s) return Object.assign(base, { ok: false, blockers: ['supplier_not_found'] });
    return Object.assign(base, {
      previewToken: s.previewToken,
      requestPreview: {
        fromMasked: { displayNameSafe: s.displayNameSafe, phoneMasked: s.phoneMasked, emailMasked: s.emailMasked },
        subjectPreview: String(i.subject || '').slice(0, 120) || '(no subject)',
        bodyPreview: String(i.body || '').slice(0, 1000),
        categoryPreview: i.category || 'general',
        wouldRouteTo: 'procurement_support_preview',
      },
      note: 'Support request preview only; no ticket created.',
    });
  }
  module.exports = { preview };
