'use strict';
/**
 * Offline smoke test. Forces OLLAMA_HOST unreachable so we verify the
 * deterministic core + template fallback work with NO model.
 * Run: node tests/smoke/businessHoursAutoSmoke.js
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:1';

const assert = require('assert');
const bha = require('../../lib/businessHoursAuto/businessHoursAuto');

const TENANT = 'smoke-tenant';
const CONTACT = '+923001234567';

(async function () {
  bha.saveConfig(TENANT, {
    timezone: 'Asia/Karachi',
    hours: { 1: [['09:00', '18:00']] },
    cooldownMinutes: 60,
    holidays: ['2026-08-14'],
    awayMessage: 'We are closed right now.'
  });

  const openState = bha.isOpen(bha.loadConfig(TENANT), '2026-06-29T05:00:00Z');
  assert.strictEqual(openState.open, true, 'should be open Monday 10:00 PKT');

  const closedState = bha.isOpen(bha.loadConfig(TENANT), '2026-06-29T15:00:00Z');
  assert.strictEqual(closedState.open, false, 'should be closed Monday 20:00 PKT');

  const holiday = bha.isOpen(bha.loadConfig(TENANT), '2026-08-14T05:00:00Z');
  assert.strictEqual(holiday.open, false, 'holiday should be closed');
  assert.strictEqual(holiday.reason, 'holiday');

  const r1 = await bha.handleIncoming({ tenantId: TENANT, contact: CONTACT, when: '2026-06-29T15:00:00Z' });
  assert.strictEqual(r1.shouldReply, true, 'first closed-hours msg should auto-reply');
  assert.ok(r1.message && r1.message.length > 0, 'must have a message');

  const r2 = await bha.handleIncoming({ tenantId: TENANT, contact: CONTACT, when: '2026-06-29T15:01:00Z' });
  assert.strictEqual(r2.shouldReply, false, 'cooldown should suppress second reply');
  assert.strictEqual(r2.reason, 'cooldown');

  const r3 = await bha.handleIncoming({ tenantId: TENANT, contact: '+923009999999', when: '2026-06-29T05:00:00Z' });
  assert.strictEqual(r3.shouldReply, false, 'open hours -> no auto-reply');

  let threw = false;
  try { await bha.handleIncoming({ contact: CONTACT }); } catch (_) { threw = true; }
  assert.strictEqual(threw, true, 'missing tenantId must throw');

  console.log('businessHoursAuto smoke: PASS');
})().catch(function (e) { console.error('businessHoursAuto smoke: FAIL', e); process.exit(1); });
