 'use strict';

 // Shared helpers for all health adapters. No external calls.
 const fs = require('fs');
 const path = require('path');
 const guard = require('../safetyGuard');

 function exists(rel) {
   try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; }
 }
 function anyExists(rels) { return (rels || []).some(exists); }
 function envSet(name) { return guard.isTrue(process.env[name]) || (process.env[name] != null &&
 String(process.env[name]).trim() !== ''); }
 function envTrue(name) { return guard.isTrue(process.env[name]); }

 // Build a record. status drives default severity.
 function record(status, summary, extra) {
     return Object.assign({ status: status, summary: summary }, extra || {});
 }

 // Standard "module not detected" record.
 function unavailable(name) { return record('unavailable', name + ' not detected in repo', { severity: 'info' }); }

 module.exports = { exists, anyExists, envSet, envTrue, record, unavailable };
