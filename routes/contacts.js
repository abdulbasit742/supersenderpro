'use strict';

/**
 * routes/contacts.js
 * REST API for the contact book: tags, attributes, CSV import/export,
 * and segment queries that feed straight into campaigns.
 *
 * Wiring (add near other route mounts in server.js):
 *   const { mountContacts } = require('./routes/contacts');
 *   mountContacts(app);
 */

const express = require('express');
const store = require('../lib/contactStore');

function mountContacts(app) {
  const router = express.Router();

  router.get('/contacts', (req, res) => {
    res.json({ ok: true, contacts: store.listContacts() });
  });

  router.post('/contacts', (req, res) => {
    const c = store.upsertContact(req.body || {});
    if (!c) return res.status(400).json({ ok: false, error: 'number is required' });
    res.status(201).json({ ok: true, contact: c });
  });

  router.get('/contacts/tags', (req, res) => {
    res.json({ ok: true, tags: store.tagCounts() });
  });

  // Segment query -> matching contacts (+ ready-to-use recipients)
  router.get('/contacts/segment', (req, res) => {
    const tags = (req.query.tags ? String(req.query.tags).split(',') : []).map((t) => t.trim()).filter(Boolean);
    const match = req.query.match === 'all' ? 'all' : 'any';
    const contacts = store.segment({ tags, match });
    res.json({ ok: true, count: contacts.length, contacts, recipients: store.toRecipients({ tags, match }) });
  });

  router.get('/contacts/export', (req, res) => {
    res.type('text/csv').send(store.exportCsv());
  });

  router.post('/contacts/import', (req, res) => {
    const b = req.body || {};
    if (b.csv) return res.json({ ok: true, ...store.importCsv(b.csv) });
    if (Array.isArray(b.contacts)) {
      let imported = 0;
      for (const c of b.contacts) if (store.upsertContact(c)) imported++;
      return res.json({ ok: true, imported });
    }
    res.status(400).json({ ok: false, error: 'provide csv string or contacts array' });
  });

  router.get('/contacts/:id', (req, res) => {
    const c = store.getContact(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, contact: c });
  });

  router.delete('/contacts/:id', (req, res) => {
    if (!store.deleteContact(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  router.post('/contacts/:id/tags', (req, res) => {
    const c = store.addTag(req.params.id, (req.body || {}).tag);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, contact: c });
  });

  router.delete('/contacts/:id/tags/:tag', (req, res) => {
    const c = store.removeTag(req.params.id, req.params.tag);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, contact: c });
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountContacts };
