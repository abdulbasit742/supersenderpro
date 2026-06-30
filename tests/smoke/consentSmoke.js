// tests/smoke/consentSmoke.js
// Offline smoke test for the consent manager. No model: opt-out confirmation
// uses the template. Focus: the send gate (opt-out blocks, no-opt-in blocks,
// quiet hours block) + keyword detection + audit trail. Exit code 0 = pass.
//
// Run: node tests/smoke/consentSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template confirm

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const consent = require('../../lib/consent/consentManager');
const { inQuietHours } = consent._internal;

function clear(storeId) {
  for (const s of ['_ledger.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'consent', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'consent_smoke';
  clear(STORE);
  // disable quiet hours for the gate tests by setting a window that won\'t match much,
  // then test quiet hours separately with explicit times
  consent.setConfig(STORE, { defaultOptedIn: false, quietStart: '23:59', quietEnd: '23:58' });

  // strict default: unknown contact cannot be marketed to
  let gate = consent.canSendMarketing({ storeId: STORE, phone: '+92300' });
  assert.strictEqual(gate.allowed, false); assert.ok(/no opt-in/.test(gate.reason)); passed++;

  // opt in -> allowed (quiet window is a 1-min sliver, almost always allowed)
  consent.optIn({ storeId: STORE, phone: '+92300', source: 'signup' });
  gate = consent.canSendMarketing({ storeId: STORE, phone: '+92300', ignoreQuietHours: true });
  assert.strictEqual(gate.allowed, true); passed++;

  // opt out -> blocked
  consent.optOut({ storeId: STORE, phone: '+92300', source: 'manual' });
  gate = consent.canSendMarketing({ storeId: STORE, phone: '+92300', ignoreQuietHours: true });
  assert.strictEqual(gate.allowed, false); assert.ok(/opted out/.test(gate.reason)); passed++;

  // keyword detection: STOP opts out, START opts in
  consent.optIn({ storeId: STORE, phone: '+92301', source: 'signup' });
  const stop = await consent.processInbound({ storeId: STORE, phone: '+92301', text: 'STOP' });
  assert.strictEqual(stop.action, 'opt_out'); assert.ok(stop.confirm && stop.confirm.length); passed++;
  assert.strictEqual(consent.canSendMarketing({ storeId: STORE, phone: '+92301', ignoreQuietHours: true }).allowed, false); passed++;
  const start = await consent.processInbound({ storeId: STORE, phone: '+92301', text: 'start' });
  assert.strictEqual(start.action, 'opt_in'); passed++;
  assert.strictEqual(consent.canSendMarketing({ storeId: STORE, phone: '+92301', ignoreQuietHours: true }).allowed, true); passed++;

  // Roman-Urdu opt-out keyword
  consent.optIn({ storeId: STORE, phone: '+92302', source: 'signup' });
  const urdu = await consent.processInbound({ storeId: STORE, phone: '+92302', text: 'band karo please' });
  assert.strictEqual(urdu.action, 'opt_out'); passed++;

  // a normal message is not a consent action
  assert.strictEqual((await consent.processInbound({ storeId: STORE, phone: '+92303', text: 'what is the price?' })).action, 'none'); passed++;

  // quiet hours logic: 21:00->09:00 window wraps midnight
  const cfgQuiet = { timezone: 'Asia/Karachi', quietStart: '21:00', quietEnd: '09:00' };
  // build a Date at 23:00 PKT and 14:00 PKT (UTC+5)
  function pkt(h) { const d = new Date(); d.setUTCHours((h - 5 + 24) % 24, 0, 0, 0); return d; }
  assert.strictEqual(inQuietHours(cfgQuiet, pkt(23)), true, '23:00 should be quiet'); passed++;
  assert.strictEqual(inQuietHours(cfgQuiet, pkt(14)), false, '14:00 should not be quiet'); passed++;
  assert.strictEqual(inQuietHours(cfgQuiet, pkt(7)), true, '07:00 should be quiet'); passed++;

  // filterSendable splits a list
  consent.optIn({ storeId: STORE, phone: '+92310', source: 's' });
  consent.optOut({ storeId: STORE, phone: '+92311', source: 's' });
  const f = consent.filterSendable({ storeId: STORE, phones: ['+92310', '+92311', '+92312'], ignoreQuietHours: true });
  assert.ok(f.allowed.includes('+92310')); passed++;
  assert.ok(!f.allowed.includes('+92311') && !f.allowed.includes('+92312')); passed++;

  // audit trail proves the opt-in then opt-out history
  const audit = consent.exportAudit({ storeId: STORE, phone: '+92301' });
  assert.ok(audit.audit.length >= 2 && audit.audit.some(a => a.action === 'opt_out')); passed++;

  // stats
  const st = consent.stats({ storeId: STORE });
  assert.ok(st.contacts >= 3 && st.optedOut >= 1 && st.optedIn >= 1); passed++;

  // missing args throw
  let threw = false; try { consent.canSendMarketing({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'canSendMarketing without phone should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 consent smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c consent smoke failed:', e); process.exit(1); });
