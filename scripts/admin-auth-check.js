  'use strict';
  /**
   * scripts/admin-auth-check.js — loads admin-auth modules, reports config issues
   * (without leaking values), confirms login is safe-by-default. Read-only; writes
   * a small report to artifacts/. No network, no secrets printed.
   */
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));

  function main() {
    const { config, issues } = R('lib/adminAuth/authConfig.js');
    R('lib/adminAuth/sessionStore.js');
    R('lib/adminAuth/passwordAuth.js');
    R('lib/adminAuth/authMiddleware.js');
    R('lib/adminAuth/routeGuard.js');

    const c = config();
    const i = issues();
    const result = {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      module: 'admin-auth',
      enabled: c.enabled,
      demoMode: c.demoMode,
      requireLogin: c.requireLogin,
      hasPasswordHash: !!c.adminPasswordHash, // boolean only, never the value
      hasSessionSecret: !!c.sessionSecret,
      warnings: i.warnings,
      blockers: i.blockers,
      pass: i.blockers.length === 0,
    };

    const ARTIFACTS = path.join(ROOT, 'artifacts');
    if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS, 'admin_auth_check.json'), JSON.stringify(result, null, 2));

    console.log('[admin-auth:check] enabled=%s requireLogin=%s hasHash=%s blockers=%d pass=%s',
      result.enabled, result.requireLogin, result.hasPasswordHash, result.blockers.length, result.pass);

    process.exit(result.pass ? 0 : 1);
  }
  main();
