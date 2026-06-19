'use strict';

/**
 * routes/analytics.js — unified analytics overview endpoint.
 *   const { mountAnalytics } = require('./routes/analytics');
 *   mountAnalytics(app);
 */

const express = require('express');
const analytics = require('../lib/analytics');

function mountAnalytics(app) {
  const router = express.Router();
  router.get('/analytics/overview', (req, res) => res.json({ ok: true, overview: analytics.overview() }));
  app.use('/api', router);
  return { router };
}

module.exports = { mountAnalytics };
