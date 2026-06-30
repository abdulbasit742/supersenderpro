'use strict';
/**
 * lib/embeddedSignup/index.js - WhatsApp Embedded Signup (Meta official OAuth onboarding, v4).
 *
 * Lets each tenant connect THEIR OWN WhatsApp Business number from inside SuperSender - the
 * "Connect WhatsApp" button every Tech Provider needs. SIMULATION-SAFE by default: no Meta API
 * calls until EMBEDDED_SIGNUP_LIVE=true AND Meta creds are set, so the whole flow is testable
 * before Tech Provider App Review is approved. Flip one flag to go live.
 *
 * Wire the API with: node scripts/wire-embedded-signup.js
 */
const config = require('./config');
const store = require('./store');
const connections = require('./connections');
const oauth = require('./oauth');
const launcher = require('./launcher');
const { redactConnection } = require('./util');

module.exports = {
  config: config.config,
  isLive: () => config.isLive(),
  paths: config.paths,
  graph: config.graph,
  store, connections, oauth, launcher,
  redactConnection,
  completeSignup: oauth.completeSignup,
  publicConfig: launcher.publicConfig,
  doctor: require('./doctor'),
};
