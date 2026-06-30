// lib/broadcast/doctor.js — self-check for the broadcast dept
'use strict';

const { config } = require('./config');
const store = require('./store');

function check() {
  const out = { dept: 'broadcast', ok: true, checks: [] };
  function add(name, ok, detail) { out.checks.push({ name, ok, detail }); if (!ok) out.ok = false; }

  add('config.maxRecipients>0', config.maxRecipients > 0, `max=${config.maxRecipients}`);
  add('live-flag-is-boolean', typeof config.live === 'boolean', `live=${config.live}`);

  // store roundtrip on a throwaway tenant
  try {
    const t = '__doctor__';
    const rec = store.insert(t, { name: 'doctor', message: 'x', state: 'draft', stats: {}, targets: [] });
    const got = store.get(t, rec.id);
    add('store-roundtrip', !!got && got.id === rec.id, got ? got.id : 'missing');
  } catch (e) { add('store-roundtrip', false, e.message); }

  // tenant guard
  try { store.list(); add('tenant-guard', false, 'should have thrown'); }
  catch (_) { add('tenant-guard', true, 'throws without tenantId'); }

  return out;
}

module.exports = { check };
