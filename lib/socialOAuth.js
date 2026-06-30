'use strict';
// lib/socialOAuth.js — REAL Meta (Facebook + Instagram) OAuth + token handling.
//
// This replaces the old fake socialHub stub. It implements the actual Facebook Login flow:
//   1. getAuthUrl()       -> URL we redirect the user to (with a signed CSRF `state`)
//   2. exchangeCode()     -> code -> short-lived user token -> long-lived (~60d) user token
//   3. fetchPages()       -> the user's managed Pages + each Page's access token
//   4. fetchInstagram()   -> the IG Business account linked to a Page (for IG publishing)
//   5. saveAccounts()     -> persist everything to data/social_accounts.json (per storeId)
//
// Env required (see docs/SOCIAL_OAUTH_SETUP.md):
//   FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI, FB_GRAPH_VERSION (default v21.0),
//   SOCIAL_STATE_SECRET (random string for signing the OAuth state)
//
// SECURITY: app secret and access tokens are NEVER logged or returned to the browser. The browser
// only ever gets non-secret account metadata (platform, name, id, connected flag).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const DATA_DIR = process.env.SOCIAL_DATA_DIR || path.join(__dirname, '..', 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'social_accounts.json');

// Scopes needed to (a) read the user's Pages and (b) publish to Page + linked IG business account.
const DEFAULT_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
  'instagram_basic',
  'instagram_content_publish'
];

function appId() { return process.env.FB_APP_ID || ''; }
function appSecret() { return process.env.FB_APP_SECRET || ''; }
function redirectUri() { return process.env.FB_REDIRECT_URI || ''; }
function stateSecret() { return process.env.SOCIAL_STATE_SECRET || appSecret() || 'dev-only-state-secret'; }

function isConfigured() {
  return !!(appId() && appSecret() && redirectUri());
}

// ---------------------------------------------------------------------------
// CSRF state: sign storeId+nonce+ts so the callback can't be forged or replayed.
// ---------------------------------------------------------------------------
function makeState(storeId) {
  const payload = `${storeId || 'default'}.${crypto.randomBytes(8).toString('hex')}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyState(state) {
  try {
    const decoded = Buffer.from(String(state || ''), 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 4) return null;
    const [storeId, nonce, ts, sig] = parts;
    const expected = crypto.createHmac('sha256', stateSecret()).update(`${storeId}.${nonce}.${ts}`).digest('hex').slice(0, 32);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Date.now() - Number(ts) > 10 * 60 * 1000) return null; // 10 min expiry
    return { storeId };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------
async function graphGet(pathname, params = {}) {
  const url = new URL(`${GRAPH}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const resp = await fetch(url, { method: 'GET' });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json.error) {
    const msg = json.error ? `${json.error.type}: ${json.error.message}` : `graph ${resp.status}`;
    throw new Error(msg);
  }
  return json;
}

// ---------------------------------------------------------------------------
// OAuth flow
// ---------------------------------------------------------------------------
function getAuthUrl(storeId, scopes = DEFAULT_SCOPES) {
  if (!isConfigured()) throw new Error('Facebook app not configured (set FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI)');
  const url = new URL(DIALOG);
  url.searchParams.set('client_id', appId());
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', makeState(storeId));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(','));
  return url.toString();
}

async function exchangeCode(code) {
  // 1) code -> short-lived user token
  const short = await graphGet('/oauth/access_token', {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri(),
    code
  });
  // 2) short-lived -> long-lived (~60 days)
  const long = await graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: short.access_token
  });
  const expiresInSec = Number(long.expires_in || 60 * 24 * 3600);
  return {
    userToken: long.access_token,
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString()
  };
}

// The user's managed Pages, each with its own long-lived Page token (used for posting).
async function fetchPages(userToken) {
  const res = await graphGet('/me/accounts', { access_token: userToken, fields: 'id,name,access_token,tasks' });
  return (res.data || []).map(p => ({
    pageId: p.id,
    name: p.name,
    pageToken: p.access_token,
    canPost: Array.isArray(p.tasks) ? p.tasks.includes('CREATE_CONTENT') : true
  }));
}

// The IG Business account linked to a Page (needed to publish to Instagram).
async function fetchInstagram(pageId, pageToken) {
  try {
    const res = await graphGet(`/${pageId}`, { access_token: pageToken, fields: 'instagram_business_account{id,username}' });
    const ig = res.instagram_business_account;
    return ig ? { igId: ig.id, username: ig.username } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Persistence (per storeId). Tokens stored server-side only.
// ---------------------------------------------------------------------------
function readAll() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) || {};
  } catch {}
  return {};
}

function writeAll(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

function saveAccounts(storeId, { userToken, expiresAt, pages }) {
  const all = readAll();
  const key = storeId || 'default';
  const accounts = [];
  for (const page of pages) {
    accounts.push({
      id: `fb:${page.pageId}`,
      platform: 'facebook',
      name: page.name,
      remoteId: page.pageId,
      pageToken: page.pageToken,
      canPost: page.canPost,
      connected: true,
      connectedAt: new Date().toISOString()
    });
    if (page.instagram) {
      accounts.push({
        id: `ig:${page.instagram.igId}`,
        platform: 'instagram',
        name: `@${page.instagram.username}`,
        remoteId: page.instagram.igId,
        pageId: page.pageId,
        pageToken: page.pageToken, // IG publish uses the linked Page token
        connected: true,
        connectedAt: new Date().toISOString()
      });
    }
  }
  all[key] = { userToken, userTokenExpiresAt: expiresAt, accounts, updatedAt: new Date().toISOString() };
  writeAll(all);
  return publicAccounts(storeId);
}

// Browser-safe view: strip every token before returning to the client.
function publicAccounts(storeId) {
  const all = readAll();
  const rec = all[storeId || 'default'];
  if (!rec) return [];
  return rec.accounts.map(a => ({
    id: a.id, platform: a.platform, name: a.name, remoteId: a.remoteId,
    connected: a.connected, connectedAt: a.connectedAt, canPost: a.canPost !== false
  }));
}

// Internal: full account record incl. token (server-side use only, never sent to browser).
function getAccount(storeId, accountId) {
  const all = readAll();
  const rec = all[storeId || 'default'];
  if (!rec) return null;
  return rec.accounts.find(a => a.id === accountId) || null;
}

function disconnect(storeId, accountId) {
  const all = readAll();
  const rec = all[storeId || 'default'];
  if (!rec) return { removed: 0 };
  const before = rec.accounts.length;
  rec.accounts = rec.accounts.filter(a => a.id !== accountId);
  writeAll(all);
  return { removed: before - rec.accounts.length };
}

// Full connect: run after the OAuth callback returns a code.
async function completeConnect(storeId, code) {
  const { userToken, expiresAt } = await exchangeCode(code);
  const pages = await fetchPages(userToken);
  for (const page of pages) {
    page.instagram = await fetchInstagram(page.pageId, page.pageToken);
  }
  return saveAccounts(storeId, { userToken, expiresAt, pages });
}

module.exports = {
  GRAPH, GRAPH_VERSION, DEFAULT_SCOPES,
  isConfigured, getAuthUrl, verifyState, exchangeCode,
  fetchPages, fetchInstagram, completeConnect,
  saveAccounts, publicAccounts, getAccount, disconnect
};
