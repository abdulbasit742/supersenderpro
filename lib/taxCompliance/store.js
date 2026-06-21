  'use strict';
  /**
   * store.js — JSON-backed tax store (rules + sample figures). Degrades to in-memory.
      * No real customer data, no secrets persisted.
      */
  const fs = require('fs');
  const path = require('path');
  const FILE = path.join(process.cwd(), 'data', 'tax-compliance.json');

  let mem = null;
  function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
  rules: {} }; } if (!mem.rules) mem.rules = {}; return mem; }
  function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
  JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
  function allRules() { return Object.values(load().rules); }
  function getRule(id) { return load().rules[id] || null; }
  function putRule(r) { const d = load(); d.rules[r.id] = r; persist(); return r; }
  function bulkPutRules(list) { (list || []).forEach(putRule); return allRules().length; }
  module.exports = { allRules, getRule, putRule, bulkPutRules, FILE };
