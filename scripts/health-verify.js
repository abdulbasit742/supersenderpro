'use strict';
/**
 * scripts/health-verify.js - targeted verification command (backlog TASK-0003).
 * Runs the health check once and exits non-zero if status is 'down'.
 * Usage: node scripts/health-verify.js [--strict]
 *   --strict: also fail (exit 1) on 'degraded'.
 */
const H = require('../lib/healthCheck');

(async () => {
  const strict = process.argv.includes('--strict');
  try {
    const r = await H.getHealth({ force: true });
    console.log(JSON.stringify(r, null, 2));
    const bad = r.status === 'down' || (strict && r.status === 'degraded');
    console.log('\nOverall: ' + r.status.toUpperCase() + (bad ? ' -> FAIL' : ' -> PASS'));
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.error('health-verify crashed:', e.message);
    process.exit(1);
  }
})();
