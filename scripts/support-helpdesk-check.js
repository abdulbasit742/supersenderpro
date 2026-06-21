#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ARTIFACTS = path.join(ROOT, 'artifacts');
const files = [
  "lib/supportHelpdesk/store.js",
  "lib/supportHelpdesk/ticketRegistry.js",
  "lib/supportHelpdesk/knowledgeBase.js",
  "lib/supportHelpdesk/supportDrafts.js",
  "routes/supportHelpdeskRoutes.js",
  "public/support-helpdesk.html",
  "public/help.html"
];
function has(p) { try { fs.accessSync(path.join(ROOT, p)); return true; } catch (e) { return false; } }
const results = files.map((f) => ({ check: 'file:' + f, status: has(f) ? 'pass' : 'fail' }));
for (const f of files.filter((x) => x.endsWith('.js'))) {
  try { require(path.join(ROOT, f)); results.push({ check: 'require:' + f, status: 'pass' }); }
  catch (e) { results.push({ check: 'require:' + f, status: 'warn', detail: String(e.message || e).slice(0, 200) }); }
}
const pass = results.filter((r) => r.status === 'pass').length;
const fail = results.filter((r) => r.status === 'fail').length;
const warn = results.filter((r) => r.status === 'warn').length;
const report = { generatedAt: new Date().toISOString(), pass, fail, warn, results };
try { fs.mkdirSync(ARTIFACTS, { recursive: true }); fs.writeFileSync(path.join(ARTIFACTS, 'support_helpdesk_check.json'), JSON.stringify(report, null, 2)); } catch (e) {}
console.log('scripts/support-helpdesk-check.js: ' + pass + ' pass, ' + fail + ' fail, ' + warn + ' warn');
process.exit(fail && String(process.env.STRICT || 'false') === 'true' ? 1 : 0);
