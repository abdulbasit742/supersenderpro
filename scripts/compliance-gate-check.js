  'use strict';
  /**
      * scripts/compliance-gate-check.js — verifies the guard loads, protects the right
      * paths, and leaves the webhook + status open. No server, no network. Writes a
      * report to artifacts/.
      */
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));


  function main() {
       const blockers = [];
       const g = R('lib/adminAuth/complianceRouteGuard.js');
       R('lib/adminAuth/routeGuard.js'); // requireable


       const protect = (method, p) => g.isProtected({ method, path: p });
       // Must gate:
       if (!protect('POST', '/optout')) blockers.push('optout_not_gated');
       if (!protect('DELETE', '/optout/923001234567')) blockers.push('optout_delete_not_gated');
       if (!protect('POST', '/import')) blockers.push('import_not_gated');
       if (!protect('POST', '/gate')) blockers.push('gate_not_gated');
       if (!protect('GET', '/list')) blockers.push('list_not_gated');
       if (!protect('GET', '/audit')) blockers.push('audit_not_gated');
       // Must stay open:
       if (protect('POST', '/inbound')) blockers.push('inbound_wrongly_gated');
       if (protect('GET', '/status')) blockers.push('status_wrongly_gated');
       // Absolute-path form should normalize the same way:
       if (!protect('POST', '/api/compliance/optout')) blockers.push('absolute_path_not_gated');


       if (typeof g.apiGuard !== 'function' || typeof g.dashboardGuard !== 'function') blockers.push('guard_exports_missing');

    const result = { generatedAt: new Date().toISOString(), module: 'compliance-auth-gate', warnings: [], blockers, pass:
  blockers.length === 0 };
       const ARTIFACTS = path.join(ROOT, 'artifacts');

       if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
       fs.writeFileSync(path.join(ARTIFACTS, 'compliance_gate_check.json'), JSON.stringify(result, null, 2));
       console.log('[compliance-gate:check] blockers=%d pass=%s', blockers.length, result.pass);
       process.exit(result.pass ? 0 : 1);
  }
  main();
