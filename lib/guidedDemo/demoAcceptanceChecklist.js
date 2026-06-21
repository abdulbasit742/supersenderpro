'use strict';
/** Acceptance checklist across demo readiness categories. Derives pass/warn/fail from file presence + safety flags. */
const fs = require('fs');
const path = require('path');
const safety = require('./demoSafety');
const ROOT = process.cwd();
const has = (p) => { try { fs.accessSync(path.join(ROOT, p)); return true; } catch { return false; } };
const CATS = [
     { id: 'local_server', title: 'Local server readiness', required: true, test: () => has('server.js') },
     { id: 'dashboard_nav', title: 'Dashboard navigation', required: true, test: () => has('public/index.html') },
  { id: 'public_pages', title: 'Public pages present', required: false, test: () => has('public/partners.html') ||
has('public/help.html') },
     { id: 'guided_demo_page', title: 'Guided demo dashboard', required: true, test: () => has('public/guided-demo.html') },
     { id: 'local_demo_data', title: 'Local demo data / Demo Mode', required: true, test: () =>
has('src/modules/demoMode.js') || has('lib/demoSandbox/demoDataFactory.js') },
  { id: 'mock_providers', title: 'Mock providers only', required: true, test: () => safety.mockProvidersOnly() },
  { id: 'approval_audit', title: 'Approval / audit / security preview', required: false, test: () =>
has('src/modules/rbac/rbac.js') },
  { id: 'privacy_secret', title: 'Privacy / secret safety', required: true, test: () =>
has('lib/guidedDemo/demoRedactor.js') },
     { id: 'no_live_action', title: 'No-live-action safety', required: true, test: () => safety.liveActions() === false },
     { id: 'vscode_handoff', title: 'VS Code handoff doc', required: false, test: () => has('docs/GUIDED_DEMO_CENTER.md') },
     { id: 'gumloop_pushlater', title: 'Gumloop push-later readiness', required: false, test: () => has('.gitignore') },
];
function run() {
  const items = CATS.map((c) => { let ok = false; try { ok = !!c.test(); } catch { ok = false; } return { id: c.id,
category: c.id, title: c.title, required: c.required, status: ok ? 'pass' : (c.required ? 'fail' : 'warn'), evidence: ok
? 'present' : 'missing', blockers: !ok && c.required ? [c.id + '_missing'] : [], warnings: !ok && !c.required ? [c.id +
'_missing'] : [] }; });
  return { items, summary: { pass: items.filter((i) => i.status === 'pass').length, warn: items.filter((i) => i.status
=== 'warn').length, fail: items.filter((i) => i.status === 'fail').length }, dryRun: true };
}
module.exports = { CATS, run };
