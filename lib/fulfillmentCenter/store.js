  'use strict';

  /** Fulfillment Center — JSON store for fulfillment orders + return requests. */

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');


  const ROOT = process.cwd();
  function abs(p, fb) { const r = (p && String(p).trim()) || fb; return path.isAbsolute(r) ? r : path.resolve(ROOT, r); }


  const PATHS = {
       orders: abs(process.env.FULFILLMENT_ORDERS_PATH, 'data/fulfillment-orders.json'),
       returns: abs(process.env.FULFILLMENT_RETURNS_PATH, 'data/fulfillment-returns.json'),
  };

  function readJson(p, fb) { try { if (!fs.existsSync(p)) return fb; const raw = fs.readFileSync(p, 'utf8'); return
  raw.trim() ? JSON.parse(raw) : fb; } catch (_e) { return fb; } }
  function writeJson(p, data) { const dir = path.dirname(p); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); const tmp = p + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, p); }
  function genId(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(6).toString('hex'); }


  function readOrders() { const d = readJson(PATHS.orders, { orders: [] }); return Array.isArray(d.orders) ? d.orders : [];
  }
  function writeOrders(items) { writeJson(PATHS.orders, { orders: items, updatedAt: new Date().toISOString() }); }
  function readReturns() { const d = readJson(PATHS.returns, { returns: [] }); return Array.isArray(d.returns) ? d.returns
  : []; }
  function writeReturns(items) { writeJson(PATHS.returns, { returns: items, updatedAt: new Date().toISOString() }); }

  module.exports = { PATHS, readJson, writeJson, genId, readOrders, writeOrders, readReturns, writeReturns, ROOT };
