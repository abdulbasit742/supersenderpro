'use strict';

/**
 * routes/featurePack.js — single entry point that wires EVERY SuperSender Pro
 * feature pack added in this PR. Add ONE block to server.js:
 *
 *   const { mountFeaturePack } = require('./routes/featurePack');
 *   mountFeaturePack(app, {
 *     sendMessage: async (to, msg) => waClient.sendText(to, msg),  // WhatsApp 1:1 / replies
 *     senders: {                                                   // channel fan-out
 *       whatsapp:  async (chId, text, media) => waChannelPublisher.post(chId, text, media),
 *       telegram:  async (chId, text, media) => telegramBridge.post(chId, text, media),
 *       facebook:  async (chId, text) => socialHub.postUpdate('facebook', text),
 *       instagram: async (chId, text) => socialHub.postUpdate('instagram', text),
 *     },
 *   });
 *
 * Every dep is optional — omit `sendMessage`/`senders` and those features run in
 * safe dry-run / draft mode. Each mount is wrapped so one missing module never
 * blocks the rest.
 */

function tryMount(label, fn, mounted, failed) {
  try { fn(); mounted.push(label); }
  catch (e) { failed.push({ label, error: e.message }); }
}

function mountFeaturePack(app, deps = {}) {
  const mounted = [];
  const failed = [];
  const sendMessage = deps.sendMessage;
  const senders = deps.senders || {};

  tryMount('contacts', () => require('./contacts').mountContacts(app), mounted, failed);
  tryMount('templates', () => require('./templates').mountTemplates(app), mounted, failed);
  tryMount('campaigns', () => require('./campaigns').mountCampaigns(app, { sendMessage }), mounted, failed);
  tryMount('automation', () => require('./chatbot').mountChatbot(app, { sendMessage }), mounted, failed);
  tryMount('ecommerce', () => require('./ecommerce').mountEcommerce(app, { sendMessage }), mounted, failed);
  tryMount('channels', () => require('./channels').mountChannelSharing(app, { senders }), mounted, failed);
  tryMount('inbox', () => require('./inbox').mountInbox(app, { sendMessage }), mounted, failed);
  tryMount('developer', () => require('./developer').mountDeveloper(app), mounted, failed);
  tryMount('analytics', () => require('./analytics').mountAnalytics(app), mounted, failed);

  console.log(`[featurePack] mounted: ${mounted.join(', ')}` + (failed.length ? ` | failed: ${failed.map((f) => f.label).join(', ')}` : ''));
  return { mounted, failed };
}

module.exports = { mountFeaturePack };
