 'use strict';
 /**
     * copySafetyScanner.js — scans supplied safe-source text for secrets / PII and
     * returns redacted previews only. Never prints raw values. Raises blockers.
  */
 const { redactText } = require('./redactor');


 function scanFile(relPath, text) {
      const { found } = redactText(text);
      const secrets = found.filter((f) => ['api_key', 'bearer', 'private_key', 'db_url_pw', 'jwt'].includes(f.type));
      const pii = found.filter((f) => ['email', 'phone'].includes(f.type));
      return {
        path: relPath,
        secretFindings: secrets.length,
        piiFindings: pii.length,
        previews: found.slice(0, 10), // redacted previews only
        blocker: secrets.length > 0,
      };
 }


 function scan(files) {
   // files: [{ path, text }]
      const results = (files || []).map((f) => scanFile(f.path, f.text));
      const blockers = results.filter((r) => r.blocker);

  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    scanned: results.length,
    totalSecretFindings: results.reduce((a, r) => a + r.secretFindings, 0),
    totalPiiFindings: results.reduce((a, r) => a + r.piiFindings, 0),
    blockers: blockers.map((b) => ({ path: b.path, reason: 'secret_detected', action: 'redact_or_mustNotCopy' })),
    results,
  };
}


module.exports = { scan, scanFile };
