'use strict';

/**
 * routes/chatbot.js + quick replies REST API (WATI-style automation).
 *
 * Wiring (near other route mounts in server.js):
 *   const { mountChatbot } = require('./routes/chatbot');
 *   mountChatbot(app, {
 *     // optional: auto-send the bot reply over WhatsApp on inbound messages
 *     sendMessage: async (to, message) => waClient.sendText(to, message),
 *   });
 *
 * The /incoming endpoint is webhook-friendly: point your WhatsApp inbound
 * handler at it and it returns (and optionally sends) the auto-reply.
 */

const express = require('express');
const botStore = require('../lib/chatbotStore');
const engine = require('../lib/chatbotEngine');
const qr = require('../lib/quickReplyStore');

function mountChatbot(app, deps = {}) {
  const router = express.Router();
  const send = typeof deps.sendMessage === 'function' ? deps.sendMessage : null;

  // ---- settings ----
  router.get('/chatbot/settings', (req, res) => res.json({ ok: true, settings: botStore.getSettings() }));
  router.put('/chatbot/settings', (req, res) => res.json({ ok: true, settings: botStore.updateSettings(req.body || {}) }));

  // ---- rules ----
  router.get('/chatbot/rules', (req, res) => res.json({ ok: true, rules: botStore.listRules() }));
  router.post('/chatbot/rules', (req, res) => {
    const b = req.body || {};
    if (!b.match || !Array.isArray(b.match.keywords) || !b.match.keywords.length) {
      return res.status(400).json({ ok: false, error: 'match.keywords[] is required' });
    }
    res.status(201).json({ ok: true, rule: botStore.createRule(b) });
  });
  router.get('/chatbot/rules/:id', (req, res) => {
    const r = botStore.getRule(req.params.id);
    if (!r) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, rule: r });
  });
  router.put('/chatbot/rules/:id', (req, res) => {
    const r = botStore.updateRule(req.params.id, req.body || {});
    if (!r) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, rule: r });
  });
  router.delete('/chatbot/rules/:id', (req, res) => {
    if (!botStore.deleteRule(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  // ---- simulate (no send) ----
  router.post('/chatbot/simulate', (req, res) => {
    const b = req.body || {};
    res.json({ ok: true, result: engine.evaluate(b.text || '', { vars: b.vars || {} }) });
  });

  // ---- incoming webhook (evaluate + optionally auto-send) ----
  router.post('/chatbot/incoming', async (req, res) => {
    const b = req.body || {};
    const from = b.from || b.to || '';
    const result = engine.evaluate(b.text || '', { vars: { name: b.name || 'there', to: from } });
    let sent = false;
    if (result.reply && send && from) {
      try { await send(from, result.reply); sent = true; } catch (e) { /* swallow; reply still returned */ }
    }
    res.json({ ok: true, from, sent, ...result });
  });

  // ---- quick replies ----
  router.get('/quick-replies', (req, res) => res.json({ ok: true, replies: qr.listReplies() }));
  router.post('/quick-replies', (req, res) => {
    const b = req.body || {};
    if (!b.body || !String(b.body).trim()) return res.status(400).json({ ok: false, error: 'body is required' });
    res.status(201).json({ ok: true, reply: qr.createReply(b) });
  });
  router.get('/quick-replies/by-shortcut/:sc', (req, res) => {
    const r = qr.findByShortcut(req.params.sc);
    if (!r) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, reply: r });
  });
  router.put('/quick-replies/:id', (req, res) => {
    const r = qr.updateReply(req.params.id, req.body || {});
    if (!r) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, reply: r });
  });
  router.delete('/quick-replies/:id', (req, res) => {
    if (!qr.deleteReply(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountChatbot };
