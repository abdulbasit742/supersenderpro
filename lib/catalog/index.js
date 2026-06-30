'use strict';
// #83 Product Catalog & Variants — barrel + high-level helpers.
const config = require('./config');
const store = require('./store');
const productEngine = require('./productEngine');
const search = require('./search');
const doctor = require('./doctor');

function create(args) { const db = store.load(); const r = productEngine.create(db, args); if (r.ok) store.save(db); return r; }
function update(args) { const db = store.load(); const r = productEngine.update(db, args); if (r.ok) store.save(db); return r; }
function addVariant(args) { const db = store.load(); const r = productEngine.addVariant(db, args); if (r.ok) store.save(db); return r; }
function remove(args) { const db = store.load(); const r = productEngine.remove(db, args); if (r.ok) store.save(db); return r; }
function get(tenantId, productId) { const db = store.load(); return store.get(db, tenantId, productId); }
function priceOf(args) { const db = store.load(); return productEngine.priceOf(db, args); }
function find(tenantId, opts) { const db = store.load(); return search.query(db, tenantId, opts); }

module.exports = { config, store, productEngine, search, doctor, create, update, addVariant, remove, get, priceOf, find };
