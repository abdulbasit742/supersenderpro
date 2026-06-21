  'use strict';

  /** Receivables Center — JSON store for invoices + quotations. */

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');


  const ROOT = process.cwd();
  function abs(p, fb) { const r = (p && String(p).trim()) || fb; return path.isAbsolute(r) ? r : path.resolve(ROOT, r); }


  const PATHS = {
       invoices: abs(process.env.RECEIVABLES_INVOICES_PATH, 'data/receivables-invoices.json'),
       quotations: abs(process.env.RECEIVABLES_QUOTATIONS_PATH, 'data/receivables-quotations.json'),
  };

  function readJson(p, fb) { try { if (!fs.existsSync(p)) return fb; const raw = fs.readFileSync(p, 'utf8'); return
  raw.trim() ? JSON.parse(raw) : fb; } catch (_e) { return fb; } }
  function writeJson(p, data) { const dir = path.dirname(p); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true
  }); const tmp = p + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, p); }
  function genId(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(6).toString('hex'); }


  function readInvoices() { const d = readJson(PATHS.invoices, { invoices: [] }); return Array.isArray(d.invoices) ?
  d.invoices : []; }
  function writeInvoices(items) { writeJson(PATHS.invoices, { invoices: items, updatedAt: new Date().toISOString() }); }
  function readQuotations() { const d = readJson(PATHS.quotations, { quotations: [] }); return Array.isArray(d.quotations)
  ? d.quotations : []; }
  function writeQuotations(items) { writeJson(PATHS.quotations, { quotations: items, updatedAt: new Date().toISOString()
  }); }


  // Simple sequential-ish doc numbers (preview).
  function nextNumber(prefix, count) { return `${prefix}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4,
  '0')}`; }


  module.exports = { PATHS, readJson, writeJson, genId, readInvoices, writeInvoices, readQuotations, writeQuotations,
  nextNumber, ROOT };
