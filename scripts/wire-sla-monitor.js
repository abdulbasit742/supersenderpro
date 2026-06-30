'use strict';
// Idempotent wiring helper. Mounts the SLA Monitor router onto an app without
// touching server.js. Safe to call multiple times.

function wire(app, base) {
  if (!app || typeof app.use !== 'function') throw new Error('wire-sla-monitor: express app required');
  if (app.__slaMonitorWired) return app;
  const mountRouter = require('../routes/slaMonitorRoutes');
  mountRouter.mount(app, base || '/api/sla');
  app.__slaMonitorWired = true;
  return app;
}

module.exports = wire;

if (require.main === module) {
  // Smoke: ensure it mounts on a throwaway express app.
  try {
    const express = require('express');
    const app = express();
    wire(app);
    console.log('[wire-sla-monitor] mounted OK at /api/sla');
  } catch (e) {
    console.error('[wire-sla-monitor] FAILED:', e.message);
    process.exit(1);
  }
}
