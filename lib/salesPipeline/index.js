'use strict';
/**
 * lib/salesPipeline/index.js - Sales & Pipeline (deal-closing) command center.
 * "Yahan paisa banta hai": lead lifecycle, auto follow-ups, cart recovery, quotes/invoices.
 *
 * Safe defaults: SALES_PIPELINE_DRY_RUN=true prepares messages without sending;
 * invoices are documents (no live payment capture).
 */
const config = require('./config');
const store = require('./store');
const pipeline = require('./pipeline');
const followUps = require('./followUps');
const cartRecovery = require('./cartRecovery');
const quotes = require('./quotes');
const aiCopy = require('./aiCopy');
const doctor = require('./doctor');

async function tick(tid = 'default') {
  const f = await followUps.processDue(tid, pipeline);
  const c = await cartRecovery.processRecovery(tid);
  return { tenantId: tid, followUps: f, cartRecovery: c };
}

module.exports = {
  config: config.config,
  paths: config.paths,
  stages: config.stages,
  store, pipeline, followUps, cartRecovery, quotes, aiCopy, doctor, tick,
};
