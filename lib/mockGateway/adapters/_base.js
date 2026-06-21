 'use strict';
 const fs = require('fs');
 const path = require('path');
 function exists(rel) { try { return fs.existsSync(path.join(process.cwd(), rel)); } catch (e) { return false; } }
 function anyExists(rels) { return (rels || []).some(exists); }
 function loadSafe(rel) { try { return require(path.join(process.cwd(), rel)); } catch (e) { return null; } }
 function unavailable(name) { return { available: false, provider: name, mode: 'mock', note: name + ' not detected; using offline fallback' }; }
 function ok(name, summary) { return { available: true, provider: name, mode: 'mock', summary: summary || null }; }
 module.exports = { exists, anyExists, loadSafe, unavailable, ok };
