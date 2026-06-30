// routes/i18nRoutes.js — Localization #1.
//
// Wire-up (server.js):
//   app.use('/api/i18n', require('./routes/i18nRoutes'));
//
// Use anywhere you send a system message:
//   const i18n = require('./lib/i18n/i18n');
//   const text = i18n.tFor(tenantId, 'payment.success', { name });

const express = require('express');
const router = express.Router();

let i18n;
try { i18n = require('../lib/i18n/i18n'); } catch { i18n = null; }

function ensure(res) {
  if (!i18n) { res.status(503).json({ ok: false, error: 'i18n not available' }); return false; }
  return true;
}

// Available locales + translatable keys.
router.get('/meta', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, locales: i18n.locales(), keys: i18n.keys() });
});

// Get/set a tenant's default locale.
router.get('/tenant/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, locale: i18n.getTenantLocale(req.params.tenantId) });
});
router.put('/tenant/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...i18n.setTenantLocale(req.params.tenantId, (req.body || {}).locale) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Translate. Query: ?key=&locale=  Body vars: { vars: {...} }
router.post('/translate', (req, res) => {
  if (!ensure(res)) return;
  const { key, locale, vars } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'key required' });
  res.json({ ok: true, text: i18n.t(key, vars || {}, locale) });
});

// Add/extend a locale. Body: { locale, strings: { key: value } }
router.post('/strings', (req, res) => {
  if (!ensure(res)) return;
  const { locale, strings } = req.body || {};
  if (!locale || !strings) return res.status(400).json({ ok: false, error: 'locale and strings required' });
  res.json({ ok: true, count: i18n.addStrings(locale, strings) });
});

module.exports = router;
