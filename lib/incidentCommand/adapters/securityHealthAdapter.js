'use strict';
const b = require('./_base');
const fs = require('fs');
const path = require('path');
function health() {
    const present = b.anyExists(['lib/securityScan/scanner.js', 'routes/securityScanRoutes.js']);
    if (!present) return b.unavailable('Security');
    // Read last report safely if it exists; never parse secrets out of it.
    const reportRel = 'artifacts/security_report.json';
    if (b.exists(reportRel)) {
      try {
       const rep = JSON.parse(fs.readFileSync(path.join(process.cwd(), reportRel), 'utf8'));
       const findings = (rep && (rep.findingsCount || (rep.findings ? rep.findings.length : 0))) || 0;
      if (findings > 0) return b.record('warning', 'Security scan reported ' + findings + ' finding(s)', { category:
'security', severity: 'medium', recommendedFix: 'Review artifacts/security_report.md.' });
       return b.record('healthy', 'Security scan present, no findings in last report', { category: 'security' });
     } catch (e) { /* fall through */ }
    }
    return b.record('unknown', 'Security scan present, no recent report', { category: 'security', recommendedFix: 'Run the security scan to generate a report.' });
}
module.exports = { health };
