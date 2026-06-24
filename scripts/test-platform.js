'use strict';

/**
 * scripts/test-platform.js
 * Offline smoke test for the platform pack: team inbox, API keys, webhooks,
 * analytics overview, and the mountFeaturePack wiring helper.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-plat-'));

const inbox = require('../lib/inboxStore');
const keys = require('../lib/apiKeyStore');
const hooks = require('../lib/webhookStore');
const analytics = require('../lib/analytics');

let failures = 0;
function assert(c, m) { if (c) console.log('  \u2713 ' + m); else { console.error('  \u2717 ' + m); failures++; } }

(async () => {
  console.log('Platform (inbox + developer + analytics) smoke test');

  // ---- team inbox ----
  const agent = inbox.createAgent({ name: 'Sara', email: 's@x.com' });
  assert(agent.id && inbox.listAgents().length === 1, 'agent created');
  const conv = inbox.getOrCreateByContact('92-300-1234567', 'Ali');
  assert(conv.contact.number === '923001234567', 'conversation number normalized');
  const conv2 = inbox.getOrCreateByContact('923001234567');
  assert(conv2.id === conv.id, 'same open conversation reused');
  inbox.addMessage(conv.id, { direction: 'in', text: 'hello' });
  assert(inbox.getConversation(conv.id).unread === 1, 'inbound increments unread');
  inbox.addMessage(conv.id, { direction: 'out', text: 'hi!', agent: agent.id });
  assert(inbox.getConversation(conv.id).status === 'pending', 'reply moves status to pending');
  assert(inbox.assign(conv.id, agent.id).assignedTo === agent.id, 'assign agent');
  assert(inbox.addTag(conv.id, 'vip').tags.includes('vip'), 'tag added');
  assert(inbox.markRead(conv.id).unread === 0, 'mark read clears unread');
  assert(inbox.setStatus(conv.id, 'closed').status === 'closed', 'status closed');
  const fresh = inbox.getOrCreateByContact('923001234567');
  assert(fresh.id !== conv.id, 'closed conversation -> new one created');
  assert(inbox.counts().total === 2, 'inbox counts total');

  // ---- API keys ----
  const made = keys.generate('CI key', ['send', 'read']);
  assert(made.key.startsWith('ssp_'), 'raw key issued');
  assert(keys.list()[0].hash === undefined && keys.list()[0].prefix, 'hash hidden, prefix shown');
  const rec = keys.verify(made.key);
  assert(rec && rec.id === made.id, 'verify valid key');
  assert(keys.verify('ssp_wrong') === null, 'verify rejects bad key');
  assert(keys.hasScope(rec, 'send') && !keys.hasScope(rec, 'admin'), 'scope check');
  assert(keys.revoke(made.id) && keys.verify(made.key) === null, 'revoked key fails verify');

  // ---- webhooks (mock http) ----
  const calls = [];
  const mockHttp = async (opts) => { calls.push(opts); return { status: 200 }; };
  const wh = hooks.createWebhook({ url: 'https://hook.test/x', events: ['campaign.completed'] });
  assert(wh.secret && wh.id, 'webhook created with secret');
  let r = await hooks.dispatch('campaign.completed', { id: 'c1' }, mockHttp);
  assert(r.length === 1 && r[0].ok, 'event dispatched to subscriber');
  assert(calls[0].headers['X-SSP-Signature'].startsWith('sha256='), 'HMAC signature header present');
  const sigBody = calls[0].data;
  assert(calls[0].headers['X-SSP-Signature'] === 'sha256=' + hooks.sign(wh.secret, sigBody), 'signature matches body');
  r = await hooks.dispatch('order.created', {}, mockHttp);
  assert(r.length === 0, 'non-subscribed event not delivered');
  hooks.updateWebhook(wh.id, { active: false });
  r = await hooks.dispatch('campaign.completed', {}, mockHttp);
  assert(r.length === 0, 'inactive webhook skipped');

  // ---- analytics overview ----
  const ov = analytics.overview();
  assert(ov.inbox && ov.inbox.total === 2, 'analytics reflects inbox');
  assert(ov.developer && ov.developer.webhooks === 0, 'analytics reflects developer (inactive excluded)');
  assert(ov.campaigns && typeof ov.campaigns.total === 'number', 'analytics includes campaigns block');

  // ---- mountFeaturePack wires everything ----
  const express = require('express');
  const app = express();
  const { mountFeaturePack } = require('../routes/featurePack');
  const out = mountFeaturePack(app, {});
  assert(out.failed.length === 0, 'all feature mounts succeeded');
  assert(out.mounted.length === 9, 'nine feature packs mounted');

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
