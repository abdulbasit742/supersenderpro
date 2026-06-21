 'use strict';
 /**
  * auditTrailPreview.js — redacted audit-trail preview for vault actions. Bridges
     * read-only to an audit ledger / privacy center if present, else returns a
     * redacted demo set. Never exports raw audit data.
  */
 const redactor = require('./metadataRedactor');
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
      if (!records) {
        records = [
           { at: '2026-06-20T10:00:00Z', actor: 'admin', action: 'document_attached_preview', documentId: 'doc_s1' },
           { at: '2026-06-20T10:05:00Z', actor: 'finance', action: 'verify_preview', documentId: 'doc_s2' },
           { at: '2026-06-20T10:10:00Z', actor: 'system', action: 'expiry_alert_preview', documentId: 'doc_s3' },
        ];
      }
      return { ok: true, dryRun: true, liveExport: false, redactedOnly: true, recordsPreview: records, warnings: a ? [] :
 ['demo_audit_preview_connect_audit_ledger'], blockers: [] };
 }
 module.exports = { preview };
