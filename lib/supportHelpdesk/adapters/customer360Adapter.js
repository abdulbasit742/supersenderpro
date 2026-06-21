'use strict';
const { tryRequire, safe } = require('./_base');
const mod = tryRequire(['lib/customer360/index', 'src/modules/customer360']);
module.exports = { contactPreview: (customerId) => { if (!mod) return { available: false }; const c = safe(() => (typeof
mod.getSafe === 'function' ? mod.getSafe(customerId) : null), null); return c ? { available: true, contact: c } : {
available: false }; } };
