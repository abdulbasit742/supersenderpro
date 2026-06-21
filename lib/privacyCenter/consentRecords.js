'use strict';

/**
    * Privacy Center — consent records (read-only preview). Reads the Compliance Center
    * if present; else returns a redacted demo summary. PII masked.
    */


const redactor = require('./redactor');


function tryCompliance() {
  try { const m = require(process.cwd() + '/lib/compliance'); if (m && typeof m.consentSummary === 'function') return m;
} catch (e) {}
  try { const m2 = require(process.cwd() + '/src/modules/compliance'); if (m2 && typeof m2.consentSummary === 'function')
return m2; } catch (e) {}
  return null;
}


function list(opts) {
  const c = tryCompliance();
     if (c) {
       try { return { ok: true, source: 'compliance_center', records: redactor.redact(c.consentSummary(opts || {})), dryRun:
true }; }
    catch (e) { /* fall through */ }
     }
     // Redacted demo records (no real data).
     return {
       ok: true, source: 'demo', dryRun: true,
         records: [
           { subjectMasked: '****100', channel: 'whatsapp', consent: 'opted_in', at: '2026-06-01T00:00:00Z' },
          { subjectMasked: '****101', channel: 'whatsapp', consent: 'opted_out', at: '2026-06-05T00:00:00Z' },

           { subjectMasked: 'a***@example.com', channel: 'email', consent: 'opted_in', at: '2026-06-08T00:00:00Z' },
        ],
        note: 'Demo consent preview. Connect Compliance Center for real (masked) records.',
      };
 }

 module.exports = { list };
