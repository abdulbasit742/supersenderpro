'use strict';
/**
 * lib/bootstrap/registerSubsystems.js - one entry point that wires every Phase 1/2/5 subsystem
 * into an existing Express app, in the correct order, each guarded so a single failure can't
 * abort boot.
 *
 * This is the first safe step of Phase 3 (modularizing the 2.1MB server.js): instead of nine
 * separate hook blocks edited into the monolith, server.js gets ONE call:
 *
 *   require('./lib/bootstrap/registerSubsystems').registerAll(app, server);
 *
 * Order matters and is encoded here:
 *   0. security headers + body-size guard (first, applies to everything)
 *   1. observability request tracing (so all later routes are traced)
 *   2. rate-limit guards (before the routes they protect)
 *   3. feature routers (auth, billing, health, alerts, sales, observability ops, ops dashboard)
 *   4. error handler (last middleware)
 *   5. uptime monitor + graceful shutdown (need the server handle)
 */
function safe(report, name, fn) {
  try { fn(); report.mounted.push(name); }
  catch (e) { report.failed.push({ name, error: e && e.message }); if (report.logger) report.logger.warn ? report.logger.warn({ msg: 'subsystem_mount_failed', name, err: e && e.message }) : console.warn('[bootstrap] ' + name + ' failed: ' + (e && e.message)); }
}

function registerAll(app, server) {
  if (!app || typeof app.use !== 'function') throw new Error('registerAll(app, server): a valid Express app is required');
  let logger = console; try { logger = require('../observability/logger'); } catch {}
  const report = { mounted: [], failed: [], logger };

  // 0) security headers + body-size guard first (applies to everything)
  safe(report, 'security.headers', () => {
    const h = require('../security/headers');
    app.use(h.securityHeaders());
    app.use(h.bodySizeGuard());
  });

  // 1) request tracing
  safe(report, 'observability.tracing', () => { const obs = require('../observability'); app.use(obs.requestTracing()); });

  // 2) rate-limit guards before protected routes
  safe(report, 'security.rateLimits', () => {
    const g = require('../security/guards');
    app.use('/api/auth', g.authGuard);
    app.use('/api/billing/webhook', g.webhookGuard);
    app.use('/api', g.apiGuard);
  });

  // 3) feature routers
  const routers = [
    ['auth', '/api/auth', '../../routes/authRoutes'],
    ['billing', '/api/billing', '../../routes/billingRoutes'],
    ['health', '/api/health', '../../routes/healthRoutes'],
    ['adminAlerts', '/api/admin-alerts', '../../routes/adminAlertRoutes'],
    ['salesPipeline', '/api/sales-pipeline', '../../routes/salesPipelineRoutes'],
    ['observabilityOps', '/api/ops', '../../routes/observabilityRoutes'],
    ['opsDashboard', '/api/ops', '../../routes/opsDashboardRoutes'],
    ['conversationalSupport', '/api/conversational-support', '../../routes/conversationalSupportRoutes'],
  ];
  for (const [name, mount, modPath] of routers) {
    safe(report, name, () => { app.use(mount, require(modPath)); });
  }

  // 4) error handler last
  safe(report, 'observability.errorHandler', () => { const obs = require('../observability'); app.use(obs.errorHandler()); });

  // 5) background + lifecycle (need server handle)
  safe(report, 'uptimeMonitor', () => { require('../observability/uptime').start(); });
  safe(report, 'gracefulShutdown', () => { require('../lifecycle').install(server || null); });
  safe(report, 'adminAlerts.polling', () => { require('../adminAlert').startPolling(); });

  const line = { msg: 'subsystems_registered', mounted: report.mounted.length, failed: report.failed.length };
  (logger.info ? logger.info(line) : console.log('[bootstrap]', JSON.stringify(line)));
  if (report.failed.length) console.warn('[bootstrap] failed:', report.failed.map((f) => f.name).join(', '));
  return report;
}

module.exports = { registerAll };
