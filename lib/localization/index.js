'use strict';
// #86 Multi-Language & Localization — barrel + high-level helpers.
const config = require('./config');
const store = require('./store');
const detector = require('./detector');
const translator = require('./translator');
const doctor = require('./doctor');

// Get a contact's stored locale (or default).
function localeOf(tenantId, contactId) {
  const db = store.load();
  const rec = db.contacts[store.ckey(tenantId, contactId)];
  return rec ? rec.locale : config.defaultLocale;
}

// Set/override a contact's locale.
function setLocale(tenantId, contactId, locale) {
  const db = store.load();
  const loc = (locale || config.defaultLocale).toLowerCase();
  db.contacts[store.ckey(tenantId, contactId)] = { tenantId: tenantId || 'default', contactId, locale: loc, updatedAt: new Date().toISOString() };
  store.save(db);
  return loc;
}

// Observe an inbound message: detect + persist locale if confident.
function observe({ tenantId, contactId, text }) {
  const det = detector.detect(text);
  if (det.confident) setLocale(tenantId, contactId, det.locale);
  return det;
}

// Translate text for a contact (uses their stored locale unless target given).
async function localize({ tenantId, contactId, text, targetLocale, sourceLocale }) {
  const target = targetLocale || localeOf(tenantId, contactId);
  const db = store.load();
  const res = await translator.translate(db, { text, targetLocale: target, sourceLocale });
  store.save(db);
  return Object.assign({ targetLocale: target }, res);
}

function remember(args) { const db = store.load(); translator.remember(db, args); store.save(db); return true; }

module.exports = { config, store, detector, translator, doctor, localeOf, setLocale, observe, localize, remember };
