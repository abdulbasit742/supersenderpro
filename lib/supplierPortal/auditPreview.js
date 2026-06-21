  'use strict';
  /**
   * auditPreview.js — redacted audit-trail preview for portal views. Read-only;
      * bridges to an audit ledger if present, else a redacted demo set. No raw PII.
      */
  const redactor = require('./redactor');
  function tryAudit() {
       try { const m = require('../auditLedger'); if (m && typeof m.recent === 'function') return m; } catch (e) {}
       try { const m = require('../../src/modules/audit'); if (m && typeof m.recent === 'function') return m; } catch (e) {}
       return null;
  }
  function preview(limit) {
    const lim = Math.min(200, Number(limit) || 50);
       const a = tryAudit();
       let records;
       if (a) { try { records = redactor.deep((a.recent(lim) || []).slice(0, lim)); } catch (e) { records = null; } }
       if (!records) records = [
         { at: '2026-06-20T09:00:00Z', actor: 'S*** ', action: 'portal_status_viewed_preview', area: 'bill_payment' },
         { at: '2026-06-20T09:03:00Z', actor: 'S*** ', action: 'quote_submit_preview', area: 'quote' },
         { at: '2026-06-20T09:06:00Z', actor: 'system', action: 'message_draft_preview', area: 'message' },
       ];
    return { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true, redactedOnly: true,
  recordsPreview: records, warnings: a ? [] : ['demo_audit_preview_connect_audit_ledger'], blockers: [] };
  }
  module.exports = { preview };
