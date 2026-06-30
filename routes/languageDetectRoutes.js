'use strict';
/**
 * #107 Language Detection routes (self-mountable).
 * Mount with: require('./routes/languageDetectRoutes')(app)
 * or via the AI suite mountAll(). Does NOT touch server.js.
 */
const express = require('express');
const langDetect = require('../lib/languageDetect/languageDetect');

function build() {
  const router = express.Router();

  router.get('/health', (req, res) => res.json({ ok: true, feature: 'language-detect', langs: Object.keys(langDetect.LANG_NAMES) }));

  // POST /detect { text, tenantId?, contactId?, useAI? }
  router.post('/detect', async (req, res) => {
    try {
      const { text, tenantId, contactId, useAI } = req.body || {};
      if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, error: 'text required' });
      const out = await langDetect.detect(text, { tenantId, contactId, useAI });
      res.json({ ok: true, result: out });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e && e.message || e) });
    }
  });

  // POST /forget { tenantId, contactId } - clear sticky language memory
  router.post('/forget', (req, res) => {
    const { tenantId, contactId } = req.body || {};
    if (!contactId) return res.status(400).json({ ok: false, error: 'contactId required' });
    langDetect.forgetContact(tenantId, contactId);
    res.json({ ok: true });
  });

  return router;
}

module.exports = function mount(app, base = '/api/ai-language') {
  app.use(base, build());
  return app;
};
module.exports.build = build;
