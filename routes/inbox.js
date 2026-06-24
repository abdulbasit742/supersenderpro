'use strict';

/**
 * routes/inbox.js — WATI-style team inbox REST API.
 *
 * Wiring:
 *   const { mountInbox } = require('./routes/inbox');
 *   mountInbox(app, { sendMessage: async (to, msg) => waClient.sendText(to, msg) });
 *
 * Inbound messages: POST /api/inbox/incoming records the message and (if a
 * chatbot engine is present) can be combined with auto-replies upstream.
 */

const express = require('express');
const store = require('../lib/inboxStore');

function mountInbox(app, deps = {}) {
  const router = express.Router();
  const send = typeof deps.sendMessage === 'function' ? deps.sendMessage : null;

  // ---- agents ----
  router.get('/inbox/agents', (req, res) => res.json({ ok: true, agents: store.listAgents() }));
  router.post('/inbox/agents', (req, res) => {
    if (!(req.body && req.body.name)) return res.status(400).json({ ok: false, error: 'name required' });
    res.status(201).json({ ok: true, agent: store.createAgent(req.body) });
  });
  router.delete('/inbox/agents/:id', (req, res) => {
    if (!store.deleteAgent(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  // ---- conversations ----
  router.get('/inbox/conversations', (req, res) => {
    res.json({ ok: true, counts: store.counts(), conversations: store.listConversations({ status: req.query.status, assignedTo: req.query.assignedTo, tag: req.query.tag }) });
  });
  router.get('/inbox/conversations/:id', (req, res) => {
    const c = store.getConversation(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });

  // Inbound message webhook -> records into a conversation
  router.post('/inbox/incoming', (req, res) => {
    const b = req.body || {};
    if (!b.from) return res.status(400).json({ ok: false, error: 'from (number) required' });
    const conv = store.getOrCreateByContact(b.from, b.name);
    const msg = store.addMessage(conv.id, { direction: 'in', text: b.text || '' });
    res.json({ ok: true, conversationId: conv.id, message: msg });
  });

  // Agent reply -> records + sends over WhatsApp if wired
  router.post('/inbox/conversations/:id/reply', async (req, res) => {
    const c = store.getConversation(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    const text = (req.body || {}).text;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    let sent = false;
    if (send && c.contact.number) { try { await send(c.contact.number, text); sent = true; } catch (e) { /* still log */ } }
    const msg = store.addMessage(c.id, { direction: 'out', text, agent: (req.body || {}).agent || null });
    res.json({ ok: true, sent, message: msg });
  });

  router.post('/inbox/conversations/:id/assign', (req, res) => {
    const c = store.assign(req.params.id, (req.body || {}).agentId || null);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });
  router.post('/inbox/conversations/:id/status', (req, res) => {
    const c = store.setStatus(req.params.id, (req.body || {}).status);
    if (!c) return res.status(400).json({ ok: false, error: 'invalid status or not found' });
    res.json({ ok: true, conversation: c });
  });
  router.post('/inbox/conversations/:id/note', (req, res) => {
    const c = store.setNote(req.params.id, (req.body || {}).note);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });
  router.post('/inbox/conversations/:id/read', (req, res) => {
    const c = store.markRead(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });
  router.post('/inbox/conversations/:id/tags', (req, res) => {
    const c = store.addTag(req.params.id, (req.body || {}).tag);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });
  router.delete('/inbox/conversations/:id/tags/:tag', (req, res) => {
    const c = store.removeTag(req.params.id, req.params.tag);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, conversation: c });
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountInbox };
