  'use strict';
  /**
   * store.js — JSON-backed manufacturing store (BOMs + production orders). Degrades
      * to in-memory. No real customer data, no secrets, no stock mutation here.
      */
  const fs = require('fs');
  const path = require('path');
  const FILE = path.join(process.cwd(), 'data', 'manufacturing-center.json');

  let mem = null;
  function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = { boms:
  {}, orders: {} }; } if (!mem.boms) mem.boms = {}; if (!mem.orders) mem.orders = {}; return mem; }
  function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
  JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
  function allBoms() { return Object.values(load().boms); }
  function getBom(id) { return load().boms[id] || null; }
  function putBom(b) { const d = load(); d.boms[b.id] = b; persist(); return b; }
  function allOrders() { return Object.values(load().orders); }
  function getOrder(id) { return load().orders[id] || null; }
  function putOrder(o) { const d = load(); d.orders[o.id] = o; persist(); return o; }
  function bulkPutBoms(list) { (list || []).forEach(putBom); return allBoms().length; }

  function bulkPutOrders(list) { (list || []).forEach(putOrder); return allOrders().length; }
  module.exports = { allBoms, getBom, putBom, allOrders, getOrder, putOrder, bulkPutBoms, bulkPutOrders, FILE };
