'use strict';
const b = require('./_base');

const fs = require('fs');
const path = require('path');
function health() {
 const present = b.anyExists(['lib/launchCenter/runner.js', 'routes/launchCenterRoutes.js']);
 if (!present) return b.unavailable('Launch');
 const reportRel = 'artifacts/launch_report.json';
 if (b.exists(reportRel)) {
     try {
       const rep = JSON.parse(fs.readFileSync(path.join(process.cwd(), reportRel), 'utf8'));
      const score = rep && (rep.score != null ? rep.score : null);
      if (score != null && score < 70) return b.record('blocked', 'Launch readiness score ' + score + ' (<70)', {
category: 'launch', severity: 'high', recommendedFix: 'Resolve blockers in artifacts/launch_report.md.' });
     return b.record('healthy', 'Launch readiness score ' + (score == null ? 'n/a' : score), { category: 'launch' });
     } catch (e) { /* fall through */ }
 }
 return b.record('unknown', 'Launch center present, no recent report', { category: 'launch', recommendedFix: 'Run launch-check to generate a report.' });
}
module.exports = { health };
