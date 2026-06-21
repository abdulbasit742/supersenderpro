 'use strict';
 const fs = require('fs');
 const path = require('path');
 function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
 function anyExists(rels) { return (rels || []).some(exists); }
 function unavailable(name) { return { available: false, status: 'unavailable', summary: name + ' not detected' }; }
 function ok(summary, extra) { return Object.assign({ available: true, status: 'ok', summary: summary }, extra || {}); }
 module.exports = { exists, anyExists, unavailable, ok };
