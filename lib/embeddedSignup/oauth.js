'use strict';
/**
 * lib/embeddedSignup/oauth.js - the server side of Embedded Signup.
 *
 * Flow: the frontend launcher (FB.login with config_id) returns a short-lived `code`. We exchange
 * it for a business access token, then read the connected WABA + phone number. When the module is
 * not live (no creds / EMBEDDED_SIGNUP_LIVE!=true), every Meta call is STUBBED with deterministic
 * fake data so the whole flow is testable end-to-end before App Review.
 */
const cfg = require('./config');
const connections = require('./connections');
const { nowISO } = require('./util');

// Lazy fetch: Node 18+ has global fetch; fall back to a clear error if missing in live mode.
async function httpGetJSON(url) {
  if (typeof fetch !== 'function') throw new Error('global fetch unavailable - upgrade Node or inject a fetch polyfill');
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Meta API ' + r.status + ': ' + (j && j.error && j.error.message ? j.error.message : 'request failed'));
  return j;
}

/** Exchange the Embedded Signup `code` for a business access token. */
async function exchangeCode(code) {
  if (!cfg.isLive()) {
    return { stub: true, accessToken: 'STUB_TOKEN_' + String(code || 'nocode').slice(0, 6), tokenType: 'bearer' };
  }
  const c = cfg.config;
  const url = cfg.graph.tokenUrl + '?client_id=' + encodeURIComponent(c.appId)
    + '&client_secret=' + encodeURIComponent(c.appSecret)
    + '&code=' + encodeURIComponent(code);
  const j = await httpGetJSON(url);
  return { stub: false, accessToken: j.access_token, tokenType: j.token_type || 'bearer' };
}

/** Read the WABA + first phone number that the user shared during signup. */
async function readAssets(accessToken, hints = {}) {
  if (!cfg.isLive()) {
    const waba = hints.wabaId || 'STUB_WABA_' + Date.now().toString(36);
    return {
      stub: true, wabaId: waba,
      phoneNumberId: hints.phoneNumberId || 'STUB_PHONE_' + Date.now().toString(36),
      displayPhoneNumber: hints.displayPhoneNumber || '+92 300 0000000',
      verifiedName: hints.verifiedName || 'Demo Business',
    };
  }
  // Live: resolve shared WABA, then its first phone number.
  const wabaId = hints.wabaId;
  if (!wabaId) throw new Error('wabaId hint required in live mode (from ES callback payload)');
  const phones = await httpGetJSON(cfg.graph.base + '/' + wabaId + '/phone_numbers?access_token=' + encodeURIComponent(accessToken));
  const first = (phones.data || [])[0] || {};
  return {
    stub: false, wabaId,
    phoneNumberId: first.id || hints.phoneNumberId || '',
    displayPhoneNumber: first.display_phone_number || '',
    verifiedName: first.verified_name || '',
  };
}

/** Subscribe our app to the WABA's webhooks (so we receive inbound messages + statuses). */
async function subscribeWebhooks(accessToken, wabaId) {
  if (!cfg.isLive()) return { stub: true, subscribed: true };
  const r = await (async () => {
    if (typeof fetch !== 'function') throw new Error('global fetch unavailable');
    const res = await fetch(cfg.graph.base + '/' + wabaId + '/subscribed_apps?access_token=' + encodeURIComponent(accessToken), { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error('subscribe failed ' + res.status + ': ' + (j && j.error && j.error.message ? j.error.message : ''));
    return j;
  })();
  return { stub: false, subscribed: !!(r && r.success) };
}

/**
 * Full onboarding: exchange code -> read assets -> persist connection -> subscribe webhooks.
 * Returns the (redaction happens at the route layer) stored connection + step results.
 */
async function completeSignup(tid, payload = {}) {
  const code = payload.code;
  if (!code) throw new Error('code is required (from the Embedded Signup launcher)');
  const token = await exchangeCode(code);
  const assets = await readAssets(token.accessToken, payload);
  const conn = connections.upsert(tid, {
    wabaId: assets.wabaId,
    phoneNumberId: assets.phoneNumberId,
    displayPhoneNumber: assets.displayPhoneNumber,
    verifiedName: assets.verifiedName,
    accessToken: token.accessToken,
    status: 'connected',
  });
  let subscribe = { stub: token.stub, subscribed: false };
  try { subscribe = await subscribeWebhooks(token.accessToken, assets.wabaId); }
  catch (e) { subscribe = { error: e.message, subscribed: false }; }
  connections.setStatus(tid, conn.id, subscribe.subscribed ? 'active' : 'connected');
  return {
    live: cfg.isLive(), stub: !!token.stub,
    connectionId: conn.id, wabaId: assets.wabaId,
    steps: { tokenExchanged: true, assetsRead: true, webhookSubscribed: subscribe.subscribed, subscribeDetail: subscribe },
    at: nowISO(),
  };
}

module.exports = { exchangeCode, readAssets, subscribeWebhooks, completeSignup };
