'use strict';
/**
 * lib/embeddedSignup/config.js - config for WhatsApp Embedded Signup (Meta's official OAuth
 * onboarding flow, v4). Lets each tenant connect THEIR OWN WhatsApp Business number from
 * inside SuperSender.
 *
 * SIMULATION-SAFE: until EMBEDDED_SIGNUP_LIVE=true AND Meta creds are present, the token
 * exchange + webhook subscribe are stubbed (no Meta API calls). This lets you wire + test the
 * whole flow before Tech Provider App Review is approved, then flip one flag to go live.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const DATA_DIR = path.join(__dirname, '../../data/embedded_signup');

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';

module.exports = {
  paths: {
    dir: DATA_DIR,
    connections: (tid) => path.join(DATA_DIR, tid + '_connections.json'),
  },
  graph: {
    version: GRAPH_VERSION,
    tokenUrl: 'https://graph.facebook.com/' + GRAPH_VERSION + '/oauth/access_token',
    base: 'https://graph.facebook.com/' + GRAPH_VERSION,
  },
  config: {
    enabled: bool(process.env.EMBEDDED_SIGNUP_ENABLED, true),
    // Master switch: false => no Meta API calls (token exchange + subscribe are stubbed).
    live: bool(process.env.EMBEDDED_SIGNUP_LIVE, false),
    requireAdmin: bool(process.env.EMBEDDED_SIGNUP_REQUIRE_ADMIN, true),
    // Public (frontend) values - safe to expose to the launcher.
    appId: process.env.META_APP_ID || '',
    configId: process.env.META_ES_CONFIG_ID || '', // Embedded Signup configuration id
    graphVersion: GRAPH_VERSION,
    // Secret (server-only) - NEVER sent to the client / never returned in API output.
    appSecret: process.env.META_APP_SECRET || '',
  },
  /** True only when we have everything needed to actually call Meta. */
  isLive() {
    const c = this.config;
    return !!(c.live && c.appId && c.appSecret && c.configId);
  },
};
