'use strict';

/**
 * lib/channelSharing/engine.js
 * Core channel-to-channel content sharing engine.
 *
 * processPost(post, { senders, now }) takes an incoming source-channel post,
 * finds matching routes, applies the transform pipeline (branding, scrubbing,
 * find/replace, filters), dedupes, and either queues a draft (manual approval)
 * or fans out to every target platform via pluggable bridges — with throttling.
 *
 * `senders` is a map { whatsapp:fn, telegram:fn, facebook:fn, instagram:fn }.
 * Omitting it routes everything to drafts (safe by default).
 */

const store = require('./store');
const scrubber = require('./scrubber');
const bridges = require('./bridges');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Merge global scrub/branding settings with a route's transform config. */
function effectiveTransform(route, settings) {
  const t = route.transform || {};
  return {
    scrubPhones: t.scrubPhones != null ? t.scrubPhones : settings.scrub.phones,
    scrubLinks: t.scrubLinks != null ? t.scrubLinks : settings.scrub.links,
    findReplace: t.findReplace || [],
    branding: {
      enabled: (t.branding && t.branding.enabled) || settings.branding.enabled,
      footer: (t.branding && t.branding.footer) || settings.branding.footer,
    },
  };
}

/**
 * @param {object} post - { channelId, messageId, text, media?:[{type,url}] }
 * @param {object} opts - { senders, now, throttle }
 * @returns {Promise<{processed:boolean, reason?:string, results:Array}>}
 */
async function processPost(post = {}, opts = {}) {
  const settings = store.getSettings();
  const results = [];
  if (!settings.enabled) return { processed: false, reason: 'sharing-disabled', results };

  const src = String(post.channelId || '');
  const msgId = String(post.messageId || '');
  if (!src || !msgId) return { processed: false, reason: 'missing-source-or-id', results };
  if (store.getBlacklist().includes(src)) return { processed: false, reason: 'source-blacklisted', results };

  const routes = store.listRoutes().filter((r) => r.enabled && (r.sources || []).includes(src));
  if (!routes.length) return { processed: false, reason: 'no-matching-route', results };

  const senders = opts.senders || {};
  const throttle = opts.throttle != null ? opts.throttle : store.throttleMs();
  let firstSend = true;

  for (const route of routes) {
    const tcfg = effectiveTransform(route, settings);
    const content = scrubber.transform(post.text, tcfg);
    const filter = scrubber.passesFilters(content, { minLen: route.transform.minLen, blockKeywords: route.transform.blockKeywords });

    for (const target of route.targets || []) {
      const key = `${msgId}:${route.id}:${target.platform}:${target.channelId}`;
      if (store.isDuplicate(key)) { results.push({ target, status: 'duplicate' }); continue; }
      if (!filter.ok) { results.push({ target, status: 'filtered', reason: filter.reason }); continue; }

      // Draft / manual-approval path
      if (settings.draftMode || route.draft || !senders[String(target.platform).toLowerCase()]) {
        const draft = store.addDraft({ routeId: route.id, source: src, messageId: msgId, platform: target.platform, channelId: target.channelId, content, media: post.media || [] });
        store.markSeen(key);
        store.addLog({ from: src, to: target.channelId, platform: target.platform, status: 'drafted', preview: content.slice(0, 120) });
        results.push({ target, status: 'drafted', draftId: draft.id });
        continue;
      }

      // Live send with throttle between sends
      if (!firstSend && throttle > 0) await sleep(throttle);
      firstSend = false;
      try {
        await bridges.send(target.platform, target.channelId, content, post.media || [], senders);
        store.markSeen(key);
        store.addLog({ from: src, to: target.channelId, platform: target.platform, status: 'sent', preview: content.slice(0, 120) });
        results.push({ target, status: 'sent' });
      } catch (e) {
        store.addLog({ from: src, to: target.channelId, platform: target.platform, status: 'failed', error: e.message, preview: content.slice(0, 120) });
        results.push({ target, status: 'failed', error: e.message });
      }
    }
  }
  return { processed: true, results };
}

/** Approve a queued draft and send it now via the provided senders. */
async function approveDraft(draftId, senders = {}) {
  const draft = store.listDrafts().find((d) => d.id === draftId);
  if (!draft) return { ok: false, error: 'draft not found' };
  try {
    await bridges.send(draft.platform, draft.channelId, draft.content, draft.media || [], senders);
    store.updateDraft(draftId, { status: 'sent', sentAt: new Date().toISOString() });
    store.addLog({ from: draft.source, to: draft.channelId, platform: draft.platform, status: 'sent', preview: (draft.content || '').slice(0, 120) });
    return { ok: true };
  } catch (e) {
    store.updateDraft(draftId, { status: 'failed', error: e.message });
    return { ok: false, error: e.message };
  }
}

module.exports = { processPost, approveDraft, effectiveTransform };
