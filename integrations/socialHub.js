'use strict';
// integrations/socialHub.js — REAL social publishing via the Meta Graph API.
//
// Previously this was a stub that just console.log'd and returned { success: true } without posting
// anything. It now publishes for real using the Page access token saved by lib/socialOAuth.js.
//
//   Facebook  -> POST /{pageId}/feed            (message + optional link, or /photos for an image)
//   Instagram -> POST /{igId}/media (container) then POST /{igId}/media_publish
//                (Instagram's API REQUIRES an image/video URL — text-only is not allowed)
//
// All calls use the server-side stored token; nothing secret is returned to the caller.

const oauth = require('../lib/socialOAuth');
const GRAPH = oauth.GRAPH;

async function graphPost(pathname, body) {
  const resp = await fetch(`${GRAPH}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json.error) {
    const msg = json.error ? `${json.error.type}: ${json.error.message}` : `graph ${resp.status}`;
    throw new Error(msg);
  }
  return json;
}

async function postToFacebook(account, { message, link, imageUrl }) {
  const token = account.pageToken;
  if (!token) throw new Error('Facebook page token missing — reconnect the account');
  if (imageUrl) {
    const out = await graphPost(`/${account.remoteId}/photos`, { url: imageUrl, caption: message || '', access_token: token });
    return { platform: 'facebook', id: out.post_id || out.id };
  }
  const body = { message: message || '', access_token: token };
  if (link) body.link = link;
  const out = await graphPost(`/${account.remoteId}/feed`, body);
  return { platform: 'facebook', id: out.id };
}

async function postToInstagram(account, { message, imageUrl }) {
  const token = account.pageToken;
  if (!token) throw new Error('Instagram requires the linked Page token — reconnect the account');
  if (!imageUrl) throw new Error('Instagram requires an image or video URL (text-only posts are not supported by the IG API)');
  // 1) create a media container
  const container = await graphPost(`/${account.remoteId}/media`, { image_url: imageUrl, caption: message || '', access_token: token });
  // 2) publish it
  const out = await graphPost(`/${account.remoteId}/media_publish`, { creation_id: container.id, access_token: token });
  return { platform: 'instagram', id: out.id };
}

/**
 * Publish a post to a connected social account.
 * @param {string} storeId
 * @param {string} accountId  e.g. "fb:1234" or "ig:5678" (from socialOAuth.publicAccounts)
 * @param {object} content    { message, link, imageUrl }
 */
async function publish(storeId, accountId, content = {}) {
  const account = oauth.getAccount(storeId, accountId);
  if (!account) throw new Error(`No connected account "${accountId}" — connect it first`);
  if (account.platform === 'facebook') return postToFacebook(account, content);
  if (account.platform === 'instagram') return postToInstagram(account, content);
  throw new Error(`Unsupported platform "${account.platform}"`);
}

// Legacy signature kept so old callers don't crash; routes through the real publisher when possible.
async function postUpdate(platform, message, opts = {}) {
  const storeId = opts.storeId || 'default';
  const accounts = oauth.publicAccounts(storeId).filter(a => a.platform === platform && a.connected);
  if (!accounts.length) throw new Error(`No connected ${platform} account for store ${storeId}`);
  return publish(storeId, accounts[0].id, { message, link: opts.link, imageUrl: opts.imageUrl });
}

module.exports = { publish, postUpdate, postToFacebook, postToInstagram };
