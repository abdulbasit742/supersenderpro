  'use strict';
  /**
   * store.js — JSON-backed cashbook store. Masks refs/names at write time. Degrades
      * to in-memory. No real customer data, no secrets, no raw payment text persisted.
      */
  const fs = require('fs');
  const path = require('path');
  const redactor = require('./redactor');
  const FILE = path.join(process.cwd(), 'data', 'cashbook-center.json');

  let mem = null;
  function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
  transactions: {} }; } if (!mem.transactions) mem.transactions = {}; return mem; }
  function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
  JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }

  function all() { return Object.values(load().transactions); }
  function get(id) { return load().transactions[id] || null; }
  function put(t) {
    const d = load();
    const safe = Object.assign({}, t, {
      referenceMasked: redactor.maskRef(t.reference || t.referenceMasked),
      payerNameSafe: redactor.maskName(t.payerName || t.payerNameSafe),
      payeeNameSafe: redactor.maskName(t.payeeName || t.payeeNameSafe),
    });
    delete safe.reference; delete safe.payerName; delete safe.payeeName; delete safe.rawText;
    d.transactions[t.id] = safe; persist(); return d.transactions[t.id];
  }
  function bulkPut(list) { (list || []).forEach(put); return all().length; }
  module.exports = { all, get, put, bulkPut, FILE };
