'use strict';

/**
 * scripts/test-channels.js
 * Offline smoke test for channel-to-channel content sharing.
 * Covers the scrubber pipeline, route matching, dedup, draft mode, multi-platform
 * fan-out (via mock senders), blacklist, filters, and draft approval.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-ch-'));

const scrubber = require('../lib/channelSharing/scrubber');
const store = require('../lib/channelSharing/store');
const engine = require('../lib/channelSharing/engine');

let failures = 0;
function assert(c, m) { if (c) console.log('  \u2713 ' + m); else { console.error('  \u2717 ' + m); failures++; } }

(async () => {
  console.log('Channel sharing smoke test');

  // ---- scrubber ----
  assert(scrubber.scrubPhones('Call 0300-1234567 now') === 'Call  now', 'phone scrubbed');
  assert(scrubber.scrubLinks('see https://x.com/y and t.me/z') === 'see  and ', 'links scrubbed');
  assert(scrubber.findReplace('buy from ShopA', [{ from: 'ShopA', to: 'MyStore' }]) === 'buy from MyStore', 'find/replace');
  assert(scrubber.applyBranding('Hello', '— MyStore').endsWith('— MyStore'), 'branding footer appended');
  assert(scrubber.applyBranding('Hello\n\n— MyStore', '— MyStore').split('— MyStore').length === 2, 'branding not doubled');
  const full = scrubber.transform('Deal! call 03001234567 http://x.co', { scrubPhones: true, scrubLinks: true, branding: { enabled: true, footer: 'BRAND' } });
  assert(full.includes('BRAND') && !/\d{7}/.test(full) && !full.includes('http'), 'full pipeline cleans + brands');
  assert(scrubber.passesFilters('hi', { minLen: 10 }).ok === false, 'min length filter');
  assert(scrubber.passesFilters('buy weapons', { blockKeywords: ['weapons'] }).ok === false, 'blocked keyword filter');

  // ---- settings + presets ----
  assert(store.updateSettings({ preset: 'max' }).preset === 'max', 'preset saved');
  assert(store.throttleMs() === store.PRESETS.max, 'throttle reflects preset');
  store.updateSettings({ preset: 'safe', draftMode: false, branding: { enabled: false } });

  // ---- route ----
  const route = store.createRoute({
    name: 'MRF -> my channels',
    sources: ['src-1'],
    targets: [{ platform: 'whatsapp', channelId: 'wa-1' }, { platform: 'telegram', channelId: 'tg-1' }],
    transform: { scrubPhones: true, scrubLinks: true, branding: { enabled: true, footer: 'via MyStore' } },
  });
  assert(store.listRoutes().length === 1, 'route created');

  // ---- live fan-out via mock senders ----
  const sent = [];
  const senders = {
    whatsapp: async (ch, text) => sent.push(['whatsapp', ch, text]),
    telegram: async (ch, text) => sent.push(['telegram', ch, text]),
  };
  const r1 = await engine.processPost({ channelId: 'src-1', messageId: 'm1', text: 'Hot deal! 03001234567 https://x.co' }, { senders, throttle: 0 });
  assert(r1.processed && r1.results.filter((x) => x.status === 'sent').length === 2, 'fanned out to 2 targets');
  assert(sent.length === 2 && sent[0][2].includes('via MyStore') && !/\d{7}/.test(sent[0][2]), 'sent content branded + scrubbed');

  // ---- dedup ----
  const r2 = await engine.processPost({ channelId: 'src-1', messageId: 'm1', text: 'Hot deal!' }, { senders, throttle: 0 });
  assert(r2.results.every((x) => x.status === 'duplicate'), 'duplicate message skipped');

  // ---- no matching route ----
  const r3 = await engine.processPost({ channelId: 'other', messageId: 'm2', text: 'x' }, { senders, throttle: 0 });
  assert(r3.reason === 'no-matching-route', 'no route -> skipped');

  // ---- blacklist ----
  store.setBlacklist(['src-1']);
  const r4 = await engine.processPost({ channelId: 'src-1', messageId: 'm3', text: 'blocked source' }, { senders, throttle: 0 });
  assert(r4.reason === 'source-blacklisted', 'blacklisted source blocked');
  store.setBlacklist([]);

  // ---- draft mode (no sender for platform -> queue) ----
  store.updateSettings({ draftMode: true });
  const r5 = await engine.processPost({ channelId: 'src-1', messageId: 'm4', text: 'Draft me please long enough' }, { senders, throttle: 0 });
  assert(r5.results.every((x) => x.status === 'drafted'), 'draft mode queues instead of sending');
  const drafts = store.listDrafts();
  assert(drafts.length === 2, 'two drafts queued');

  // ---- approve a draft ----
  const before = sent.length;
  const appr = await engine.approveDraft(drafts[0].id, senders);
  assert(appr.ok && sent.length === before + 1, 'draft approved + sent');

  // ---- filter blocks a route target ----
  store.updateSettings({ draftMode: false });
  store.updateRoute(route.id, { transform: { ...route.transform, minLen: 1000 } });
  const r6 = await engine.processPost({ channelId: 'src-1', messageId: 'm5', text: 'short' }, { senders, throttle: 0 });
  assert(r6.results.every((x) => x.status === 'filtered'), 'min-length filter blocks send');

  // ---- logs recorded ----
  assert(store.listLogs().length > 0, 'delivery logs recorded');

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
