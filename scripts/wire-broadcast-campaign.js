'use strict';

// Idempotent wiring helper. Mounts the broadcast campaign router on an existing
// express app WITHOUT touching server.js. Safe to call multiple times.
const { createRouter, mountPath } = require('../routes/broadcastCampaignRoutes');

function wire(app) {
  if (!app || typeof app.use !== 'function') {
    throw new Error('wire(app): an express app instance is required');
  }
  if (app.__broadcastCampaignWired) return app; // idempotent
  app.use(mountPath, createRouter());
  app.__broadcastCampaignWired = true;
  return app;
}

module.exports = { wire, mountPath };
