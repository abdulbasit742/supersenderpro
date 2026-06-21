'use strict';
const path = require('path');
function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
return null; }
function safe(fn, fb) { try { return fn(); } catch { return fb; } }
module.exports = { tryRequire, safe };
