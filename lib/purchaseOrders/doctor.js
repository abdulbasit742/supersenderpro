// lib/purchaseOrders/doctor.js
// Self-check for the Purchase Orders department.

'use strict';

const fs = require('fs');
const cfg = require('./config');

function check() {
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  try { require('./store'); ok('store loads', true); } catch (e) { ok('store loads', false, e.message); }
  try { require('./supplierStore'); ok('supplierStore loads', true); } catch (e) { ok('supplierStore loads', false, e.message); }
  try { require('./poEngine'); ok('poEngine loads', true); } catch (e) { ok('poEngine loads', false, e.message); }
  try { require('./privacy'); ok('privacy loads', true); } catch (e) { ok('privacy loads', false, e.message); }

  ok('PO_STATES defined', Array.isArray(cfg.PO_STATES) && cfg.PO_STATES.length >= 4);
  ok('data dir resolvable', typeof cfg.DATA_DIR === 'string' && cfg.DATA_DIR.length > 0);

  // Inventory (#66) integration is optional.
  let invPresent = false;
  try { require('../inventory'); invPresent = true; } catch (_) {}
  ok('inventory(#66) integration', true, invPresent ? 'present: receiving will restock' : 'absent: receiving degrades to advisory');

  try { fs.mkdirSync(cfg.DATA_DIR, { recursive: true }); ok('data dir writable', true); }
  catch (e) { ok('data dir writable', false, e.message); }

  const passed = results.every((r) => r.pass);
  return { dept: 'purchase-orders', passed, results };
}

module.exports = { check };
