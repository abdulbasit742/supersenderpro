'use strict';


/**
 * Privacy Center — audit export PREVIEW (redacted only). Reads an Audit Ledger if
    * present; else returns a redacted demo set. Never exports raw audit data.
    */


const redactor = require('./redactor');

function tryAudit() {
  try { const m = require(process.cwd() + '/lib/auditLedger'); if (m && typeof m.recent === 'function') return m; } catch
(e) {}
  try { const m2 = require(process.cwd() + '/src/modules/audit'); if (m2 && typeof m2.recent === 'function') return m2; }
catch (e) {}
     return null;
}


function run(opts) {
     const o = opts || {};
     const limit = Math.min(500, parseInt(o.limit, 10) || 100);
     const warnings = ['Redacted preview only. No raw audit export produced.'];
     const a = tryAudit();
     let records;
     if (a) {
       try { records = redactor.redact((a.recent(limit) || []).slice(0, limit)); }
       catch (e) { records = null; warnings.push('Audit ledger read failed safely.'); }
     }
     if (!records) {
       records = redactor.redact([
         { at: '2026-06-19T10:00:00Z', actor: 'admin', action: 'login', detail: 'ok' },
          { at: '2026-06-19T10:05:00Z', actor: 'admin', action: 'export_preview', detail: 'privacy request preview' },
          { at: '2026-06-19T10:10:00Z', actor: 'system', action: 'retention_preview', detail: 'leads policy preview' },
       ]);
       warnings.push('Demo audit preview. Connect Audit Ledger for real (redacted) records.');
     }
     return { ok: true, dryRun: true, liveExport: false, redactedOnly: true, recordsPreview: records, warnings: warnings,
blockers: [] };
}

module.exports = { run };
