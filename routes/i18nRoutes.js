// routes/i18nRoutes.js — i18n #1: localization.
//
// Wire-up (server.js):
//   const i18n = require('./lib/i18n/localization');
//   i18n.setTranslateHook(async (text, lang) => aiBrain.processPrompt(`Translate to ${lang}, reply only with the translation:\n${text}`));
//   app.use('/api/i18n', require('./routes/i18nRoutes'));
//   // in the inbound router, learn language: i18n.learnFromMessage(phone, text);
//   // when sending system strings: i18n.t('welcome', i18n.getContactLang(phone));

const express = require('express');
const router = express.Router();

let i18n;
try { i18n = require('../lib/i18n/localization'); } catch { i18n = null; }

function ensure(res) {
  if (!i18n) { res.status(503).json({ ok: false, error: 'i18n not available' }); return false; }
  return true;
}

// Supported locales + the string bundles (for a translations UI).
router.get('/locales', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, supported: i18n.SUPPORTED, default: i18n.DEFAULT_LANG, bundles: i18n.BUNDLES });
});

// Get/set a contact's language.
router.get('/contact/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, phone: req.params.phone, lang: i18n.getContactLang(req.params.phone) });
});
router.put('/contact/:phone', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...i18n.setContactLang(req.params.phone, (req.body || {}).lang) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Detect language of a text snippet.
router.post('/detect', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, lang: i18n.detectLang((req.body || {}).text || '') });
});

// Translate arbitrary text. Body: { text, lang }
router.post('/translate', async (req, res) => {
  if (!ensure(res)) return;
  const { text, lang } = req.body || {};
  res.json({ ok: true, text: await i18n.translate(text || '', lang) });
});

module.exports = router;
