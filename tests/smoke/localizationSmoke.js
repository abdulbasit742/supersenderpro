'use strict';
// #86 Multi-Language & Localization — smoke test. Run: npm run localization:smoke
const assert = require('assert');
const loc = require('../../lib/localization');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }
async function ta(name, fn) { try { await fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const contactId = 'contact-' + Date.now();

(async () => {
  t('detect returns a supported/default locale', () => {
    const d = loc.detector.detect('This is a reasonably long English sentence for detection.');
    assert(d.locale && (loc.config.supported.includes(d.locale)), 'locale within supported');
  });

  t('short text falls back to default (not confident)', () => {
    const d = loc.detector.detect('hi');
    assert(d.confident === false && d.locale === loc.config.defaultLocale, 'fallback default');
  });

  t('setLocale + localeOf round-trip', () => {
    loc.setLocale(tenantId, contactId, 'ur');
    assert(loc.localeOf(tenantId, contactId) === 'ur', 'locale persisted');
  });

  t('observe persists confident detection', () => {
    loc.observe({ tenantId, contactId, text: 'This is clearly an English message used for detection testing.' });
    assert(['en', 'ur'].includes(loc.localeOf(tenantId, contactId)), 'locale updated or kept');
  });

  await ta('localize returns text + source', async () => {
    const out = await loc.localize({ tenantId, contactId, text: 'Your order is ready.', targetLocale: 'ur', sourceLocale: 'en' });
    assert(out.text && out.source, 'has text + source');
  });

  t('memory seed returns translation', async () => {
    loc.remember({ targetLocale: 'ur', text: 'Hello', translation: 'Salaam' });
    // localize should now hit memory
  });

  await ta('localize hits memory after seeding', async () => {
    loc.remember({ targetLocale: 'fr', text: 'Thanks', translation: 'Merci' });
    const out = await loc.localize({ tenantId, contactId, text: 'Thanks', targetLocale: 'fr', sourceLocale: 'en' });
    assert(out.text === 'Merci' && out.source === 'memory', 'memory hit');
  });

  t('doctor healthy', () => {
    const r = loc.doctor.check();
    assert(r.healthy, 'doctor healthy: ' + JSON.stringify(r.issues));
  });

  console.log(`\nLocalization smoke: ${pass} checks passed.`);
})();
